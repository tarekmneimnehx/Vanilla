import { Platform } from 'react-native';
import { NOTIFICATION_BUDGET, NOTIFICATION_HORIZON_DAYS } from '@/domain/defaults';
import type { OccurrenceView } from '@/domain/logging/status';
import { planNotifications, reconcile, type DoseAlertSource, type HydrationPlan } from '@/domain/notifications/planner';
import { buildDay, buildIndexes, remindersFor, wakeAndBedtime, type DataState } from '@/domain/services/queries';
import { goalOn, totalFor } from '@/domain/services/hydrationService';
import { wallClock } from '@/domain/time/clock';
import { addDays, eachDay } from '@/domain/time/localDate';
import type { Language } from '@/domain/types';
import type { FormatContext } from '@/i18n/format';
import type { Repository, ScheduledNotificationRecord } from '@/storage/repository';
import { cancelNative, channelFor, CHANNEL_HYDRATION, notificationsSupported, pendingNativeIds, scheduleAt } from './adapter';
import { categoryFor, notificationText, payloadFor } from './content';

export interface ReconcileDeps {
  repo: Repository;
  state: DataState;
  now: number;
  language: Language;
  format: FormatContext;
  permissionGranted: boolean;
}

export function platformBudget(): number {
  if (Platform.OS === 'ios') return NOTIFICATION_BUDGET.ios;
  if (Platform.OS === 'android') return NOTIFICATION_BUDGET.android;
  return NOTIFICATION_BUDGET.default;
}

/** Pending (non-final) occurrence views from yesterday through the planning horizon. */
export function pendingViews(state: DataState, now: number): { views: OccurrenceView[]; sources: DoseAlertSource[] } {
  const idx = buildIndexes(state);
  const today = wallClock(now, state.tz).date;
  const scheduleById = new Map(state.schedules.map((s) => [s.id, s]));
  const views: OccurrenceView[] = [];
  const sources: DoseAlertSource[] = [];
  for (const date of eachDay(addDays(today, -1), addDays(today, NOTIFICATION_HORIZON_DAYS))) {
    const day = buildDay(state, idx, date, now);
    for (const view of day.views) {
      if (view.isFinal || view.status === 'autoMissed') continue;
      views.push(view);
      sources.push({ view, reminders: remindersFor(scheduleById.get(view.occurrence.scheduleId), state.settings) });
    }
  }
  return { views, sources };
}

export function hydrationPlan(state: DataState, now: number): HydrationPlan | null {
  const { hydration } = state.settings;
  if (!hydration.remindersEnabled) return null;
  const today = wallClock(now, state.tz).date;
  const goal = goalOn(state.settings, today);
  if (goal <= 0) return null;
  const { wake, bedtime } = wakeAndBedtime(state.settings, today);
  const goalMet = totalFor(state.hydration, today) >= goal;
  return { enabled: true, intervalMinutes: hydration.reminderIntervalMinutes, wakeMinutes: wake, bedtimeMinutes: bedtime, goalMetOn: goalMet ? today : null };
}

/**
 * Makes the OS notification queue match the current data. Only future fire
 * times are ever scheduled, so undoing an action never replays old alerts.
 * Returns the registry after reconciliation.
 */
export async function reconcileNotifications(deps: ReconcileDeps): Promise<ScheduledNotificationRecord[]> {
  const { repo, state, now } = deps;
  const records = await repo.listScheduledNotifications();
  if (!notificationsSupported || !deps.permissionGranted || !state.settings.onboarding.completed) {
    for (const record of records) {
      await cancelNative(record.nativeId);
      await repo.deleteScheduledNotification(record.id);
    }
    return [];
  }
  const { views, sources } = pendingViews(state, now);
  const viewsByKey = new Map(views.map((v) => [v.occurrence.key, v]));
  const itemsById = new Map(state.items.map((i) => [i.id, i]));
  const plan = planNotifications({
    now,
    tz: state.tz,
    horizonMs: NOTIFICATION_HORIZON_DAYS * 86_400_000,
    budget: platformBudget(),
    doses: sources,
    quietHours: state.settings.reminders.quietHours,
    hydration: hydrationPlan(state, now),
  });

  // Drop registry rows whose native notification no longer exists (already delivered).
  const native = await pendingNativeIds();
  const live: ScheduledNotificationRecord[] = [];
  for (const record of records) {
    if (native && !native.has(record.nativeId)) {
      await repo.deleteScheduledNotification(record.id);
      continue;
    }
    live.push(record);
  }

  const diff = reconcile(plan, live.map((r) => r.id));
  const byId = new Map(live.map((r) => [r.id, r]));
  for (const id of diff.toCancel) {
    const record = byId.get(id);
    if (record) await cancelNative(record.nativeId);
    await repo.deleteScheduledNotification(id);
    byId.delete(id);
  }
  const sound = state.settings.reminders.sound;
  for (const planned of diff.toSchedule) {
    const text = notificationText(planned, { itemsById, viewsByKey, language: deps.language, format: deps.format, discreet: state.settings.reminders.discreetText });
    const nativeId = await scheduleAt(text, payloadFor(planned), planned.fireAt, {
      category: categoryFor(planned),
      sound: planned.kind === 'hydration' ? 'default' : sound,
      channel: planned.kind === 'hydration' ? CHANNEL_HYDRATION : channelFor(sound),
    });
    if (!nativeId) continue;
    const record: ScheduledNotificationRecord = { id: planned.id, nativeId, fireAt: planned.fireAt, kind: planned.kind, occurrenceKeys: planned.occurrenceKeys, createdAt: now };
    await repo.upsertScheduledNotification(record);
    byId.set(record.id, record);
  }
  return [...byId.values()].sort((a, b) => a.fireAt - b.fireAt);
}
