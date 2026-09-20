import { newId } from '../ids';
import { clampTakenAt, latestLogsByOccurrence, type OccurrenceView } from '../logging/status';
import { wallClock } from '../time/clock';
import type { DoseLog, FinalAction, Item, LogSource, Occurrence, OccurrenceState } from '../types';
import type { Repository } from '@/storage/repository';

export interface RecordInput {
  occurrence: Occurrence;
  item: Item;
  action: FinalAction;
  /** Instant the dose was actually taken (taken-earlier support). Defaults to now. */
  at?: number;
  amount?: number | null;
  unit?: string | null;
  reason?: string | null;
  note?: string | null;
  source: LogSource;
}

export interface RecordResult {
  log: DoseLog;
  /** false when an identical record already existed (duplicate action) or an existing record was corrected. */
  created: boolean;
  corrected: boolean;
}

export function describeDose(item: Item): string {
  return `${trimNumber(item.doseAmount)} ${item.doseUnit}`.trim();
}

export function trimNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

async function liveLogFor(repo: Repository, occurrenceKey: string): Promise<DoseLog | null> {
  const logs = await repo.listLogs();
  return latestLogsByOccurrence(logs).get(occurrenceKey) ?? null;
}

/**
 * Records a final action for an occurrence. Idempotent: a repeated action for
 * an occurrence that already has the same record returns the existing log. A
 * different action corrects the existing record in place. Pending snooze /
 * remind-tonight state is cleared.
 */
export async function recordAction(repo: Repository, input: RecordInput, now: number, tz: string): Promise<RecordResult> {
  const existing = await liveLogFor(repo, input.occurrence.key);
  const at = clampTakenAt(input.at ?? now, now);
  const amount = input.action === 'taken' ? (input.amount === undefined ? input.item.doseAmount : input.amount) : null;
  const unit = input.action === 'taken' ? (input.unit === undefined ? input.item.doseUnit : input.unit) : null;
  if (existing) {
    const same = existing.action === input.action && input.at === undefined && input.amount === undefined && input.reason === undefined;
    if (same) return { log: existing, created: false, corrected: false };
    const corrected: DoseLog = {
      ...existing,
      action: input.action,
      at,
      localDate: input.occurrence.localDate,
      amount,
      unit,
      reason: input.reason ?? (input.action === existing.action ? existing.reason : null),
      note: input.note ?? existing.note,
      source: input.source,
      updatedAt: now,
    };
    await repo.upsertLog(corrected);
    await repo.deleteOccurrenceState(input.occurrence.key);
    return { log: corrected, created: false, corrected: true };
  }
  const log: DoseLog = {
    id: newId(),
    itemId: input.item.id,
    occurrenceKey: input.occurrence.key,
    action: input.action,
    at,
    localDate: input.occurrence.localDate,
    tz: input.occurrence.tz || tz,
    amount,
    unit,
    reason: input.reason ?? null,
    note: input.note ?? null,
    scheduledAt: input.occurrence.scheduledAt,
    itemNameSnapshot: input.item.displayName,
    doseSnapshot: describeDose(input.item),
    source: input.source,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  await repo.upsertLog(log);
  await repo.deleteOccurrenceState(input.occurrence.key);
  return { log, created: true, corrected: false };
}

/** An extra or as-needed dose not tied to a scheduled occurrence. */
export async function recordExtraDose(
  repo: Repository,
  item: Item,
  input: { at?: number; amount?: number | null; unit?: string | null; note?: string | null; source: LogSource },
  now: number,
  tz: string,
): Promise<DoseLog> {
  const at = clampTakenAt(input.at ?? now, now);
  const log: DoseLog = {
    id: newId(),
    itemId: item.id,
    occurrenceKey: null,
    action: 'taken',
    at,
    localDate: wallClock(at, tz).date,
    tz,
    amount: input.amount === undefined ? item.doseAmount : input.amount,
    unit: input.unit === undefined ? item.doseUnit : input.unit,
    reason: null,
    note: input.note ?? null,
    scheduledAt: null,
    itemNameSnapshot: item.displayName,
    doseSnapshot: describeDose(item),
    source: input.source,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  await repo.upsertLog(log);
  return log;
}

/** Undo is a soft delete; the occurrence returns to its time-based status. */
export async function undoLog(repo: Repository, logId: string, now: number): Promise<DoseLog | null> {
  const log = await repo.getLog(logId);
  if (!log || log.deletedAt !== null) return null;
  const deleted = { ...log, deletedAt: now, updatedAt: now };
  await repo.upsertLog(deleted);
  return deleted;
}

/** Restores a log removed by undo (undo of undo). */
export async function restoreLog(repo: Repository, logId: string, now: number): Promise<DoseLog | null> {
  const log = await repo.getLog(logId);
  if (!log || log.deletedAt === null) return null;
  const restored = { ...log, deletedAt: null, updatedAt: now };
  await repo.upsertLog(restored);
  return restored;
}

/** History correction: edits an existing record's action, time, amount, reason or note. */
export async function correctLog(
  repo: Repository,
  logId: string,
  changes: Partial<Pick<DoseLog, 'action' | 'at' | 'amount' | 'unit' | 'reason' | 'note'>>,
  now: number,
  tz: string,
): Promise<DoseLog | null> {
  const log = await repo.getLog(logId);
  if (!log) return null;
  const at = changes.at !== undefined ? clampTakenAt(changes.at, now) : log.at;
  const updated: DoseLog = {
    ...log,
    ...changes,
    at,
    // Scheduled occurrences stay on their scheduled day; extra doses follow their timestamp.
    localDate: log.occurrenceKey ? log.localDate : wallClock(at, tz).date,
    amount: (changes.action ?? log.action) === 'taken' ? (changes.amount !== undefined ? changes.amount : log.amount) : null,
    unit: (changes.action ?? log.action) === 'taken' ? (changes.unit !== undefined ? changes.unit : log.unit) : null,
    updatedAt: now,
  };
  await repo.upsertLog(updated);
  return updated;
}

export async function snoozeOccurrence(repo: Repository, key: string, until: number, now: number): Promise<OccurrenceState> {
  const state: OccurrenceState = { key, snoozedUntil: until, remindAt: null, updatedAt: now };
  await repo.upsertOccurrenceState(state);
  return state;
}

export async function remindLater(repo: Repository, key: string, at: number, now: number): Promise<OccurrenceState> {
  const state: OccurrenceState = { key, snoozedUntil: null, remindAt: at, updatedAt: now };
  await repo.upsertOccurrenceState(state);
  return state;
}

export async function clearOccurrenceState(repo: Repository, key: string): Promise<void> {
  await repo.deleteOccurrenceState(key);
}

export interface GroupActionResult {
  logs: DoseLog[];
  skippedKeys: string[]; // occurrences that already had a final record
}

/** Marks every pending occurrence in the list as taken; final ones are left untouched. */
export async function markAllTaken(repo: Repository, views: readonly OccurrenceView[], itemsById: ReadonlyMap<string, Item>, now: number, tz: string, source: LogSource): Promise<GroupActionResult> {
  const logs: DoseLog[] = [];
  const skippedKeys: string[] = [];
  for (const view of views) {
    if (view.isFinal) {
      skippedKeys.push(view.occurrence.key);
      continue;
    }
    const item = itemsById.get(view.occurrence.itemId);
    if (!item) continue;
    const result = await recordAction(repo, { occurrence: view.occurrence, item, action: 'taken', source }, now, tz);
    if (result.created) logs.push(result.log);
  }
  return { logs, skippedKeys };
}
