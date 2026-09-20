import { anchorsOn } from '../schedule/slots';
import { occurrencesForDayAll, type ItemWithSchedules, type OccurrenceContext } from '../schedule/occurrences';
import { buildView, latestLogsByOccurrence, type OccurrenceView } from '../logging/status';
import { hydrationStreak, summarize, trackingStreak, type CompletionSummary, type HydrationDay, type TrackingDay } from '../streaks/streaks';
import { addDays, eachDay, type LocalDate } from '../time/localDate';
import { parseTimeOfDay } from '../time/clock';
import type { DoseLog, HydrationEntry, Item, OccurrenceState, ReminderConfig, RoutineGroup, Schedule, Settings } from '../types';
import { goalOn, totalFor } from './hydrationService';

/** Everything the read model needs, loaded once by the store. */
export interface DataState {
  settings: Settings;
  items: Item[];
  schedules: Schedule[];
  groups: RoutineGroup[];
  states: OccurrenceState[];
  logs: DoseLog[];
  hydration: HydrationEntry[];
  tz: string;
}

export interface Indexes {
  itemsById: Map<string, Item>;
  groupsById: Map<string, RoutineGroup>;
  entries: ItemWithSchedules[];
  statesByKey: Map<string, OccurrenceState>;
  liveLogsByKey: Map<string, DoseLog>;
  ctx: OccurrenceContext;
}

export function buildIndexes(state: DataState): Indexes {
  const itemsById = new Map(state.items.map((i) => [i.id, i]));
  const groupsById = new Map(state.groups.map((g) => [g.id, g]));
  const byItem = new Map<string, Schedule[]>();
  for (const s of state.schedules) {
    const list = byItem.get(s.itemId) ?? [];
    list.push(s);
    byItem.set(s.itemId, list);
  }
  const entries: ItemWithSchedules[] = state.items.map((item) => ({
    item,
    versions: (byItem.get(item.id) ?? []).sort((a, b) => (b.effectiveFrom > a.effectiveFrom ? 1 : b.effectiveFrom < a.effectiveFrom ? -1 : b.createdAt - a.createdAt)),
  }));
  return {
    itemsById,
    groupsById,
    entries,
    statesByKey: new Map(state.states.map((s) => [s.key, s])),
    liveLogsByKey: latestLogsByOccurrence(state.logs),
    ctx: { tz: state.tz, anchorHistory: state.settings.anchorHistory, groupsById },
  };
}

export interface GroupSection {
  group: RoutineGroup;
  views: OccurrenceView[];
  scheduledMinutes: number;
}

export interface DayModel {
  date: LocalDate;
  views: OccurrenceView[];
  /** Live logs for the day that no longer map to a generated occurrence (as-needed doses, edited schedules). */
  extras: DoseLog[];
  groups: GroupSection[];
  summary: CompletionSummary;
}

export function buildDay(state: DataState, idx: Indexes, date: LocalDate, now: number): DayModel {
  const occurrences = occurrencesForDayAll(idx.entries, date, idx.ctx);
  const views = occurrences.map((occ) => buildView(occ, idx.liveLogsByKey.get(occ.key) ?? null, idx.statesByKey.get(occ.key) ?? null, now, state.settings.missed));
  const keys = new Set(occurrences.map((o) => o.key));
  const extras = state.logs.filter((log) => log.deletedAt === null && log.localDate === date && (!log.occurrenceKey || !keys.has(log.occurrenceKey)));
  const groupMap = new Map<string, OccurrenceView[]>();
  for (const view of views) {
    if (!view.occurrence.groupId) continue;
    const list = groupMap.get(view.occurrence.groupId) ?? [];
    list.push(view);
    groupMap.set(view.occurrence.groupId, list);
  }
  const groups: GroupSection[] = [];
  for (const [groupId, groupViews] of groupMap) {
    const group = idx.groupsById.get(groupId);
    if (!group) continue;
    groups.push({ group, views: groupViews, scheduledMinutes: groupViews[0].occurrence.scheduledMinutes });
  }
  const counts = { scheduled: views.length, taken: 0, skipped: 0, missed: 0 };
  for (const view of views) {
    if (view.status === 'taken') counts.taken += 1;
    else if (view.status === 'skipped') counts.skipped += 1;
    else if (view.status === 'missed') counts.missed += 1;
  }
  return { date, views, extras, groups, summary: summarize(counts) };
}

export interface NextDose {
  view: OccurrenceView;
  /** Other doses sharing the same instant (for combined display). */
  siblings: OccurrenceView[];
}

/** The next dose that is upcoming, due or snoozed. Overdue doses are listed separately and never repeated here. */
export function nextDose(views: readonly OccurrenceView[]): NextDose | null {
  const candidates = views.filter((v) => v.status === 'upcoming' || v.status === 'due' || v.status === 'snoozed').sort((a, b) => a.effectiveAt - b.effectiveAt);
  if (candidates.length === 0) return null;
  const first = candidates[0];
  const siblings = candidates.slice(1).filter((v) => v.effectiveAt === first.effectiveAt);
  return { view: first, siblings };
}

export function overdueViews(views: readonly OccurrenceView[]): OccurrenceView[] {
  return views.filter((v) => v.status === 'overdue' || v.status === 'autoMissed');
}

export function trackingDays(state: DataState, idx: Indexes, from: LocalDate, to: LocalDate, now: number): TrackingDay[] {
  const days: TrackingDay[] = [];
  for (const date of eachDay(from, to)) {
    const occurrences = occurrencesForDayAll(idx.entries, date, idx.ctx);
    let recorded = 0;
    let taken = 0;
    for (const occ of occurrences) {
      const log = idx.liveLogsByKey.get(occ.key);
      if (log) {
        recorded += 1;
        if (log.action === 'taken') taken += 1;
      }
    }
    days.push({ date, scheduled: occurrences.length, recorded, taken });
  }
  void now;
  return days;
}

export function hydrationDays(state: DataState, from: LocalDate, to: LocalDate): HydrationDay[] {
  const days: HydrationDay[] = [];
  for (const date of eachDay(from, to)) {
    days.push({ date, totalMl: totalFor(state.hydration, date), goalMl: goalOn(state.settings, date) });
  }
  return days;
}

export interface Streaks {
  tracking: number;
  hydration: number;
}

/** Streaks look back at most 400 days and never before the first schedule or entry. */
export function computeStreaks(state: DataState, idx: Indexes, today: LocalDate, now: number): Streaks {
  const earliestSchedule = state.schedules.reduce<LocalDate | null>((acc, s) => (acc === null || s.effectiveFrom < acc ? s.effectiveFrom : acc), null);
  const earliestWater = state.hydration.reduce<LocalDate | null>((acc, e) => (e.deletedAt === null && (acc === null || e.localDate < acc) ? e.localDate : acc), null);
  const floor = addDays(today, -400);
  const trackingFrom = earliestSchedule && earliestSchedule > floor ? earliestSchedule : floor;
  const hydrationFrom = earliestWater && earliestWater > floor ? earliestWater : floor;
  const tracking = earliestSchedule ? trackingStreak(trackingDays(state, idx, trackingFrom, today, now), today) : 0;
  const hydration = earliestWater ? hydrationStreak(hydrationDays(state, hydrationFrom, today), today) : 0;
  return { tracking, hydration };
}

export function remindersFor(schedule: Schedule | undefined, settings: Settings): ReminderConfig {
  const base: ReminderConfig = { enabled: settings.reminders.enabled, repeatCount: settings.reminders.repeatCount, repeatIntervalMinutes: settings.reminders.repeatIntervalMinutes };
  if (!schedule?.reminders) return base;
  return { ...base, ...schedule.reminders, enabled: settings.reminders.enabled && schedule.reminders.enabled };
}

export function wakeAndBedtime(settings: Settings, date: LocalDate): { wake: number; bedtime: number } {
  const anchors = anchorsOn(settings.anchorHistory, date);
  return {
    wake: parseTimeOfDay(anchors.wake ?? '07:00'),
    bedtime: parseTimeOfDay(anchors.bedtime ?? '22:30'),
  };
}

export function itemHistory(state: DataState, itemId: string): DoseLog[] {
  return state.logs.filter((log) => log.itemId === itemId && log.deletedAt === null).sort((a, b) => b.at - a.at);
}
