import { buildView, latestLogsByOccurrence, resolveStatus } from '../logging/status';
import type { DoseLog, MissedPolicy, Occurrence } from '../types';

const occurrence: Occurrence = {
  key: 'item-1|2026-09-20|e0800',
  itemId: 'item-1',
  scheduleId: 'sched-1',
  localDate: '2026-09-20',
  slotKey: 'e0800',
  slot: { kind: 'exact', time: '08:00' },
  groupId: null,
  scheduledMinutes: 480,
  scheduledAt: Date.UTC(2026, 8, 20, 8, 0),
  tz: 'UTC',
};

const stay: MissedPolicy = { mode: 'stayOverdue', afterMinutes: 240 };
const auto: MissedPolicy = { mode: 'markMissed', afterMinutes: 240 };

function log(overrides: Partial<DoseLog>): DoseLog {
  return {
    id: 'log-1',
    itemId: 'item-1',
    occurrenceKey: occurrence.key,
    action: 'taken',
    at: occurrence.scheduledAt,
    localDate: '2026-09-20',
    tz: 'UTC',
    amount: 1,
    unit: 'capsule',
    reason: null,
    note: null,
    scheduledAt: occurrence.scheduledAt,
    itemNameSnapshot: 'Vitamin D3',
    doseSnapshot: '1 capsule',
    source: 'app',
    createdAt: occurrence.scheduledAt,
    updatedAt: occurrence.scheduledAt,
    deletedAt: null,
    ...overrides,
  };
}

const minute = 60_000;

describe('occurrence status', () => {
  it('moves from upcoming to due to overdue', () => {
    expect(resolveStatus(occurrence, null, null, occurrence.scheduledAt - minute, stay)).toBe('upcoming');
    expect(resolveStatus(occurrence, null, null, occurrence.scheduledAt, stay)).toBe('due');
    expect(resolveStatus(occurrence, null, null, occurrence.scheduledAt + 59 * minute, stay)).toBe('due');
    expect(resolveStatus(occurrence, null, null, occurrence.scheduledAt + 60 * minute, stay)).toBe('overdue');
    expect(resolveStatus(occurrence, null, null, occurrence.scheduledAt + 3000 * minute, stay)).toBe('overdue');
  });

  it('becomes auto-missed only under the missed policy, after the cutoff', () => {
    expect(resolveStatus(occurrence, null, null, occurrence.scheduledAt + 239 * minute, auto)).toBe('overdue');
    expect(resolveStatus(occurrence, null, null, occurrence.scheduledAt + 240 * minute, auto)).toBe('autoMissed');
    expect(buildView(occurrence, null, null, occurrence.scheduledAt + 240 * minute, auto).isFinal).toBe(false);
  });

  it('final logs win, including skips which never look like taken', () => {
    expect(resolveStatus(occurrence, log({ action: 'skipped' }), null, occurrence.scheduledAt + minute, stay)).toBe('skipped');
    expect(resolveStatus(occurrence, log({ action: 'missed' }), null, occurrence.scheduledAt + 500 * minute, auto)).toBe('missed');
    expect(buildView(occurrence, log({ action: 'taken' }), null, occurrence.scheduledAt, stay).isFinal).toBe(true);
  });

  it('undo (soft delete) returns the occurrence to its time-based status', () => {
    const deleted = log({ deletedAt: occurrence.scheduledAt + 5 * minute });
    expect(resolveStatus(occurrence, deleted, null, occurrence.scheduledAt + 10 * minute, stay)).toBe('due');
    expect(latestLogsByOccurrence([deleted]).size).toBe(0);
  });

  it('snooze and remind-tonight hide the alert until their time', () => {
    const state = { key: occurrence.key, snoozedUntil: occurrence.scheduledAt + 10 * minute, remindAt: null, updatedAt: 0 };
    expect(resolveStatus(occurrence, null, state, occurrence.scheduledAt + 5 * minute, stay)).toBe('snoozed');
    expect(resolveStatus(occurrence, null, state, occurrence.scheduledAt + 11 * minute, stay)).toBe('due');
    const tonight = { key: occurrence.key, snoozedUntil: null, remindAt: occurrence.scheduledAt + 13 * 60 * minute, updatedAt: 0 };
    const view = buildView(occurrence, null, tonight, occurrence.scheduledAt + 5 * 60 * minute, stay);
    expect(view.status).toBe('snoozed');
    expect(view.effectiveAt).toBe(tonight.remindAt);
  });

  it('keeps the latest live log per occurrence', () => {
    const older = log({ id: 'a', createdAt: 1, action: 'skipped' });
    const newer = log({ id: 'b', createdAt: 2, action: 'taken' });
    const map = latestLogsByOccurrence([older, newer]);
    expect(map.get(occurrence.key)?.id).toBe('b');
  });

  it('treats a late-night dose checked after midnight as due, not overdue', () => {
    const late = { ...occurrence, scheduledAt: Date.UTC(2026, 8, 20, 23, 50), scheduledMinutes: 23 * 60 + 50 };
    expect(resolveStatus(late, null, null, Date.UTC(2026, 8, 21, 0, 10), stay)).toBe('due');
  });
});
