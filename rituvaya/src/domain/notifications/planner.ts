import type { OccurrenceView } from '../logging/status';
import { epochFor, inWindow, parseTimeOfDay, wallClock } from '../time/clock';
import { addDays } from '../time/localDate';
import type { QuietHours, ReminderConfig } from '../types';

export interface PlannedNotification {
  /** Deterministic id derived from content; identical plans produce identical ids. */
  id: string;
  kind: 'dose' | 'hydration';
  fireAt: number;
  occurrenceKeys: string[];
  itemIds: string[];
  /** 0 for the due alert, n for the n-th repeat, -1 for snooze / remind-tonight alerts. */
  repeatIndex: number;
  delayedByQuietHours: boolean;
}

export interface DoseAlertSource {
  view: OccurrenceView;
  reminders: ReminderConfig;
}

export interface HydrationPlan {
  enabled: boolean;
  intervalMinutes: number;
  wakeMinutes: number;
  bedtimeMinutes: number;
  /** Local date for which the goal has already been met (no more reminders that day). */
  goalMetOn: string | null;
}

export interface PlannerInput {
  now: number;
  tz: string;
  horizonMs: number;
  budget: number;
  doses: DoseAlertSource[];
  quietHours: QuietHours;
  hydration: HydrationPlan | null;
}

interface RawAlert {
  fireAt: number;
  occurrenceKey: string;
  itemId: string;
  repeatIndex: number;
  delayed: boolean;
}

/** Applies quiet hours to a candidate fire time. Returns null when the alert is suppressed. */
export function applyQuietHours(fireAt: number, quiet: QuietHours, tz: string): { fireAt: number; delayed: boolean } | null {
  if (!quiet.enabled) return { fireAt, delayed: false };
  const start = parseTimeOfDay(quiet.start);
  const end = parseTimeOfDay(quiet.end);
  const wc = wallClock(fireAt, tz);
  if (!inWindow(wc.minutes, start, end)) return { fireAt, delayed: false };
  if (quiet.mode === 'suppress') return null;
  // Delay to the end of the quiet window (today if the window ends later today, otherwise tomorrow).
  const endsToday = start < end || wc.minutes < end;
  const date = endsToday ? wc.date : addDays(wc.date, 1);
  return { fireAt: epochFor(date, end, tz), delayed: true };
}

function alertsForDose(source: DoseAlertSource, input: PlannerInput): RawAlert[] {
  const { view } = source;
  if (view.isFinal) return [];
  const { now } = input;
  const limit = now + input.horizonMs;
  const base: number[] = [];
  const state = view.state;
  let repeatIndexes: number[] = [];
  if (state?.remindAt && state.remindAt > now) {
    base.push(state.remindAt);
    repeatIndexes = [-1];
  } else if (state?.snoozedUntil && state.snoozedUntil > now) {
    base.push(state.snoozedUntil);
    repeatIndexes = [-1];
  } else if (source.reminders.enabled) {
    const count = Math.max(0, Math.min(10, Math.floor(source.reminders.repeatCount)));
    const interval = Math.max(1, source.reminders.repeatIntervalMinutes) * 60_000;
    for (let k = 0; k <= count; k += 1) {
      base.push(view.occurrence.scheduledAt + k * interval);
      repeatIndexes.push(k);
    }
  }
  const out: RawAlert[] = [];
  base.forEach((time, i) => {
    if (time <= now || time > limit) return;
    const adjusted = applyQuietHours(time, input.quietHours, input.tz);
    if (!adjusted) return;
    out.push({
      fireAt: adjusted.fireAt,
      occurrenceKey: view.occurrence.key,
      itemId: view.occurrence.itemId,
      repeatIndex: repeatIndexes[i],
      delayed: adjusted.delayed,
    });
  });
  return out;
}

function hydrationAlerts(input: PlannerInput): PlannedNotification[] {
  const plan = input.hydration;
  if (!plan || !plan.enabled) return [];
  const interval = Math.max(30, plan.intervalMinutes);
  const today = wallClock(input.now, input.tz).date;
  const result: PlannedNotification[] = [];
  for (const date of [today, addDays(today, 1)]) {
    if (plan.goalMetOn === date) continue;
    for (let minutes = plan.wakeMinutes + interval; minutes < plan.bedtimeMinutes; minutes += interval) {
      const fireAt = epochFor(date, minutes, input.tz);
      if (fireAt <= input.now || fireAt > input.now + input.horizonMs) continue;
      const adjusted = applyQuietHours(fireAt, input.quietHours, input.tz);
      if (!adjusted || adjusted.delayed) continue; // hydration nudges are never carried past quiet hours
      result.push({
        id: `hydration|${adjusted.fireAt}`,
        kind: 'hydration',
        fireAt: adjusted.fireAt,
        occurrenceKeys: [],
        itemIds: [],
        repeatIndex: 0,
        delayedByQuietHours: false,
      });
    }
  }
  return result;
}

export function hashKeys(keys: string[]): string {
  let hash = 5381;
  const text = keys.join('\u0000');
  for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(36);
}

/**
 * Turns pending occurrences into the set of notifications that should exist
 * right now. Alerts due at the same instant are combined into one notification.
 * Everything is sorted by fire time and cut to the platform budget.
 */
export function planNotifications(input: PlannerInput): PlannedNotification[] {
  const raw: RawAlert[] = [];
  for (const source of input.doses) raw.push(...alertsForDose(source, input));
  const byTime = new Map<number, RawAlert[]>();
  for (const alert of raw) {
    const bucket = byTime.get(alert.fireAt) ?? [];
    bucket.push(alert);
    byTime.set(alert.fireAt, bucket);
  }
  const planned: PlannedNotification[] = [];
  for (const [fireAt, alerts] of byTime) {
    const keys = Array.from(new Set(alerts.map((a) => a.occurrenceKey))).sort();
    const itemIds = Array.from(new Set(alerts.map((a) => a.itemId)));
    const repeatIndex = Math.min(...alerts.map((a) => a.repeatIndex));
    planned.push({
      id: `dose|${fireAt}|${hashKeys(keys)}`,
      kind: 'dose',
      fireAt,
      occurrenceKeys: keys,
      itemIds,
      repeatIndex,
      delayedByQuietHours: alerts.every((a) => a.delayed),
    });
  }
  planned.push(...hydrationAlerts(input));
  planned.sort((a, b) => a.fireAt - b.fireAt || (a.kind === 'dose' ? -1 : 1));
  return planned.slice(0, Math.max(0, input.budget));
}

export interface ReconcilePlan {
  toCancel: string[]; // planned ids currently scheduled that should not be
  toSchedule: PlannedNotification[];
}

/** Compares the desired plan with what is already scheduled (by id). */
export function reconcile(desired: PlannedNotification[], scheduledIds: Iterable<string>): ReconcilePlan {
  const desiredIds = new Set(desired.map((n) => n.id));
  const existing = new Set(scheduledIds);
  return {
    toCancel: Array.from(existing).filter((id) => !desiredIds.has(id)),
    toSchedule: desired.filter((n) => !existing.has(n.id)),
  };
}

/**
 * Resolves the "remind tonight" destination. When tonight's time already passed,
 * fall back to a short delay so the reminder still happens today.
 */
export function remindTonightAt(now: number, tz: string, eveningTime: string, fallbackMinutes = 60): { at: number; usedFallback: boolean } {
  const wc = wallClock(now, tz);
  const minutes = parseTimeOfDay(eveningTime);
  const tonight = epochFor(wc.date, minutes, tz);
  if (tonight > now + 60_000) return { at: tonight, usedFallback: false };
  return { at: now + fallbackMinutes * 60_000, usedFallback: true };
}
