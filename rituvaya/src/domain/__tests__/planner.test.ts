import { applyQuietHours, planNotifications, reconcile, remindTonightAt } from '../notifications/planner';
import { buildView } from '../logging/status';
import { setDeviceTimeZone } from '../time/clock';
import type { Occurrence, QuietHours, ReminderConfig } from '../types';

const tz = 'UTC';
const minute = 60_000;
const policy = { mode: 'stayOverdue' as const, afterMinutes: 240 };
const reminders: ReminderConfig = { enabled: true, repeatCount: 3, repeatIntervalMinutes: 15 };
const quietOff: QuietHours = { enabled: false, start: '22:00', end: '07:00', mode: 'delay' };

function occ(itemId: string, minutes: number, date = '2026-09-20'): Occurrence {
  const [y, m, d] = date.split('-').map(Number);
  return {
    key: `${itemId}|${date}|e${String(Math.floor(minutes / 60)).padStart(2, '0')}${String(minutes % 60).padStart(2, '0')}`,
    itemId,
    scheduleId: `s-${itemId}`,
    localDate: date,
    slotKey: 'x',
    slot: { kind: 'exact', time: '08:00' },
    groupId: null,
    scheduledMinutes: minutes,
    scheduledAt: Date.UTC(y, m - 1, d, Math.floor(minutes / 60), minutes % 60),
    tz,
  };
}

beforeEach(() => setDeviceTimeZone('UTC'));

describe('notification planner', () => {
  const now = Date.UTC(2026, 8, 20, 7, 0);

  it('plans the due alert plus repeats, only in the future', () => {
    const view = buildView(occ('a', 8 * 60), null, null, now, policy);
    const plan = planNotifications({ now, tz, horizonMs: 7 * 86_400_000, budget: 60, doses: [{ view, reminders }], quietHours: quietOff, hydration: null });
    expect(plan.map((n) => (n.fireAt - view.occurrence.scheduledAt) / minute)).toEqual([0, 15, 30, 45]);
    expect(plan.map((n) => n.repeatIndex)).toEqual([0, 1, 2, 3]);
    const late = planNotifications({ now: view.occurrence.scheduledAt + 20 * minute, tz, horizonMs: 7 * 86_400_000, budget: 60, doses: [{ view, reminders }], quietHours: quietOff, hydration: null });
    expect(late.map((n) => n.repeatIndex)).toEqual([2, 3]);
  });

  it('leaves an overdue dose alone once repeats are exhausted (no replay after undo)', () => {
    const view = buildView(occ('a', 8 * 60), null, null, now, policy);
    const plan = planNotifications({ now: view.occurrence.scheduledAt + 46 * minute, tz, horizonMs: 7 * 86_400_000, budget: 60, doses: [{ view, reminders }], quietHours: quietOff, hydration: null });
    expect(plan).toHaveLength(0);
  });

  it('combines items due at the same time into one notification with a deterministic id', () => {
    const a = buildView(occ('a', 8 * 60), null, null, now, policy);
    const b = buildView(occ('b', 8 * 60), null, null, now, policy);
    const c = buildView(occ('c', 9 * 60), null, null, now, policy);
    const input = { now, tz, horizonMs: 86_400_000, budget: 60, doses: [{ view: a, reminders }, { view: b, reminders }, { view: c, reminders }], quietHours: quietOff, hydration: null };
    const plan = planNotifications(input);
    expect(plan).toHaveLength(8);
    expect(plan[0].occurrenceKeys).toEqual([a.occurrence.key, b.occurrence.key]);
    expect(plan[0].itemIds).toEqual(['a', 'b']);
    expect(planNotifications(input)[0].id).toBe(plan[0].id);
  });

  it('skips final occurrences and uses a single alert for snoozed or remind-tonight ones', () => {
    const takenLog = { id: 'l', itemId: 'a', occurrenceKey: occ('a', 8 * 60).key, action: 'taken' as const, at: now, localDate: '2026-09-20', tz, amount: null, unit: null, reason: null, note: null, scheduledAt: null, itemNameSnapshot: '', doseSnapshot: '', source: 'app' as const, createdAt: now, updatedAt: now, deletedAt: null };
    const done = buildView(occ('a', 8 * 60), takenLog, null, now, policy);
    const snoozed = buildView(occ('b', 6 * 60), null, { key: 'k', snoozedUntil: now + 10 * minute, remindAt: null, updatedAt: 0 }, now, policy);
    const tonight = buildView(occ('c', 6 * 60), null, { key: 'k2', snoozedUntil: null, remindAt: now + 14 * 60 * minute, updatedAt: 0 }, now, policy);
    const plan = planNotifications({ now, tz, horizonMs: 86_400_000, budget: 60, doses: [{ view: done, reminders }, { view: snoozed, reminders }, { view: tonight, reminders }], quietHours: quietOff, hydration: null });
    expect(plan.map((n) => [n.itemIds[0], n.repeatIndex])).toEqual([
      ['b', -1],
      ['c', -1],
    ]);
  });

  it('delays or suppresses alerts inside quiet hours without changing the schedule', () => {
    const quietDelay: QuietHours = { enabled: true, start: '22:00', end: '07:00', mode: 'delay' };
    const at2330 = Date.UTC(2026, 8, 20, 23, 30);
    const delayed = applyQuietHours(at2330, quietDelay, tz);
    expect(delayed).toEqual({ fireAt: Date.UTC(2026, 8, 21, 7, 0), delayed: true });
    expect(applyQuietHours(Date.UTC(2026, 8, 21, 3, 0), quietDelay, tz)?.fireAt).toBe(Date.UTC(2026, 8, 21, 7, 0));
    expect(applyQuietHours(Date.UTC(2026, 8, 21, 12, 0), quietDelay, tz)).toEqual({ fireAt: Date.UTC(2026, 8, 21, 12, 0), delayed: false });
    expect(applyQuietHours(at2330, { ...quietDelay, mode: 'suppress' }, tz)).toBeNull();

    const view = buildView(occ('a', 23 * 60 + 30), null, null, now, policy);
    const plan = planNotifications({ now, tz, horizonMs: 2 * 86_400_000, budget: 60, doses: [{ view, reminders }], quietHours: quietDelay, hydration: null });
    expect(plan).toHaveLength(1); // all four alerts collapse to a single alert at the end of quiet hours
    expect(plan[0].delayedByQuietHours).toBe(true);
    expect(view.occurrence.scheduledAt).toBe(Date.UTC(2026, 8, 20, 23, 30)); // untouched
  });

  it('respects the budget by keeping the soonest alerts', () => {
    const doses = Array.from({ length: 30 }, (_, i) => ({ view: buildView(occ(`i${i}`, 8 * 60 + i), null, null, now, policy), reminders }));
    const plan = planNotifications({ now, tz, horizonMs: 7 * 86_400_000, budget: 10, doses, quietHours: quietOff, hydration: null });
    expect(plan).toHaveLength(10);
    expect(plan.every((n, i, arr) => i === 0 || n.fireAt >= arr[i - 1].fireAt)).toBe(true);
  });

  it('adds hydration nudges between wake and bedtime until the goal is met', () => {
    const plan = planNotifications({
      now,
      tz,
      horizonMs: 86_400_000,
      budget: 60,
      doses: [],
      quietHours: quietOff,
      hydration: { enabled: true, intervalMinutes: 120, wakeMinutes: 7 * 60, bedtimeMinutes: 22 * 60, goalMetOn: null },
    });
    const todays = plan.filter((n) => n.fireAt < Date.UTC(2026, 8, 21));
    expect(todays.map((n) => new Date(n.fireAt).getUTCHours())).toEqual([9, 11, 13, 15, 17, 19, 21]);
    const met = planNotifications({ now, tz, horizonMs: 86_400_000, budget: 60, doses: [], quietHours: quietOff, hydration: { enabled: true, intervalMinutes: 120, wakeMinutes: 420, bedtimeMinutes: 1320, goalMetOn: '2026-09-20' } });
    expect(met.filter((n) => n.fireAt < Date.UTC(2026, 8, 21))).toHaveLength(0);
  });

  it('reconciles desired against scheduled ids', () => {
    const a = { id: 'a', kind: 'dose' as const, fireAt: 1, occurrenceKeys: [], itemIds: [], repeatIndex: 0, delayedByQuietHours: false };
    const b = { ...a, id: 'b' };
    const result = reconcile([a, b], ['b', 'stale']);
    expect(result.toCancel).toEqual(['stale']);
    expect(result.toSchedule.map((n) => n.id)).toEqual(['a']);
  });

  it('resolves remind tonight, falling back when the evening time has passed', () => {
    const morning = Date.UTC(2026, 8, 20, 9, 0);
    expect(remindTonightAt(morning, tz, '21:00')).toEqual({ at: Date.UTC(2026, 8, 20, 21, 0), usedFallback: false });
    const late = Date.UTC(2026, 8, 20, 21, 30);
    expect(remindTonightAt(late, tz, '21:00')).toEqual({ at: late + 60 * minute, usedFallback: true });
  });
});
