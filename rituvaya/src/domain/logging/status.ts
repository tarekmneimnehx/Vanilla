import { DUE_WINDOW_MINUTES } from '../defaults';
import type { DoseLog, MissedPolicy, Occurrence, OccurrenceState, OccurrenceStatus } from '../types';

export interface OccurrenceView {
  occurrence: Occurrence;
  status: OccurrenceStatus;
  log: DoseLog | null;
  state: OccurrenceState | null;
  /** The instant the next alert for this occurrence is anchored to. */
  effectiveAt: number;
  isFinal: boolean;
}

export const FINAL_STATUSES: ReadonlySet<OccurrenceStatus> = new Set(['taken', 'skipped', 'missed']);

export function isFinalStatus(status: OccurrenceStatus): boolean {
  return FINAL_STATUSES.has(status);
}

export function resolveStatus(
  occurrence: Occurrence,
  log: DoseLog | null,
  state: OccurrenceState | null,
  now: number,
  policy: MissedPolicy,
): OccurrenceStatus {
  if (log && log.deletedAt === null) return log.action;
  if (now < occurrence.scheduledAt) return 'upcoming';
  if (state?.remindAt && now < state.remindAt) return 'snoozed';
  if (state?.snoozedUntil && now < state.snoozedUntil) return 'snoozed';
  const elapsedMinutes = (now - occurrence.scheduledAt) / 60_000;
  if (policy.mode === 'markMissed' && elapsedMinutes >= policy.afterMinutes) return 'autoMissed';
  if (elapsedMinutes < DUE_WINDOW_MINUTES) return 'due';
  return 'overdue';
}

export function buildView(occurrence: Occurrence, log: DoseLog | null, state: OccurrenceState | null, now: number, policy: MissedPolicy): OccurrenceView {
  const status = resolveStatus(occurrence, log, state, now, policy);
  const effectiveAt = state?.remindAt && state.remindAt > now ? state.remindAt : state?.snoozedUntil && state.snoozedUntil > now ? state.snoozedUntil : occurrence.scheduledAt;
  return { occurrence, status, log: log && log.deletedAt === null ? log : null, state, effectiveAt, isFinal: isFinalStatus(status) };
}

/** Picks the latest live log per occurrence key. */
export function latestLogsByOccurrence(logs: readonly DoseLog[]): Map<string, DoseLog> {
  const map = new Map<string, DoseLog>();
  for (const log of logs) {
    if (log.deletedAt !== null || !log.occurrenceKey) continue;
    const existing = map.get(log.occurrenceKey);
    if (!existing || log.createdAt > existing.createdAt) map.set(log.occurrenceKey, log);
  }
  return map;
}

/** Time the app should treat as "now" for a dose recorded as taken earlier; clamps to the present. */
export function clampTakenAt(requested: number, now: number): number {
  return Math.min(requested, now);
}
