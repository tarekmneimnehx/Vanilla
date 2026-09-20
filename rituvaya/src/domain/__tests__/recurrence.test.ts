import { nextRecurrenceOnOrAfter, recursOn, scheduleRecursOn, versionOn } from '../schedule/recurrence';
import { listDays } from '../time/localDate';
import type { Recurrence } from '../types';
import { makeSchedule } from './fixtures';

describe('recurrence rules', () => {
  it('daily recurs every day inside the start/end window', () => {
    expect(recursOn({ type: 'daily' }, '2026-01-10', '2026-01-12', '2026-01-09')).toBe(false);
    expect(recursOn({ type: 'daily' }, '2026-01-10', '2026-01-12', '2026-01-10')).toBe(true);
    expect(recursOn({ type: 'daily' }, '2026-01-10', '2026-01-12', '2026-01-12')).toBe(true);
    expect(recursOn({ type: 'daily' }, '2026-01-10', '2026-01-12', '2026-01-13')).toBe(false);
  });

  it('selected weekdays only', () => {
    const rec: Recurrence = { type: 'weekdays', weekdays: [1, 3, 5] };
    const days = listDays('2026-09-21', '2026-09-27').filter((d) => recursOn(rec, '2026-01-01', null, d));
    expect(days).toEqual(['2026-09-21', '2026-09-23', '2026-09-25']);
  });

  it('every other day counts calendar days across DST and month ends', () => {
    const rec = { type: 'interval', everyDays: 2 } as const;
    const start = '2026-03-05';
    const days = listDays('2026-03-05', '2026-03-12').filter((d) => recursOn(rec, start, null, d));
    expect(days).toEqual(['2026-03-05', '2026-03-07', '2026-03-09', '2026-03-11']);
    const wrap = listDays('2026-02-27', '2026-03-02').filter((d) => recursOn({ type: 'interval', everyDays: 3 }, '2026-02-27', null, d));
    expect(wrap).toEqual(['2026-02-27', '2026-03-02']);
  });

  it('on/off cycles', () => {
    const rec = { type: 'cycle', onDays: 5, offDays: 2 } as const;
    const days = listDays('2026-01-01', '2026-01-14').map((d) => (recursOn(rec, '2026-01-01', null, d) ? 1 : 0));
    expect(days).toEqual([1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0]);
  });

  it('as-needed never generates recurring doses', () => {
    expect(recursOn({ type: 'asNeeded' }, '2026-01-01', null, '2026-01-01')).toBe(false);
  });

  it('respects the version validity window', () => {
    const v1 = makeSchedule({ id: 'v1', effectiveFrom: '2026-01-01', effectiveTo: '2026-02-01' });
    const v2 = makeSchedule({ id: 'v2', effectiveFrom: '2026-02-01', effectiveTo: null, slots: [{ kind: 'exact', time: '09:00' }] });
    expect(versionOn([v2, v1], '2026-01-31')?.id).toBe('v1');
    expect(versionOn([v2, v1], '2026-02-01')?.id).toBe('v2');
    expect(scheduleRecursOn(v1, '2026-02-01')).toBe(false);
    // A paused item has a closed version and no successor.
    expect(versionOn([v1], '2026-03-01')).toBeNull();
  });

  it('finds the next recurrence date', () => {
    const weekly = makeSchedule({ recurrence: { type: 'weekdays', weekdays: [0] } });
    expect(nextRecurrenceOnOrAfter([weekly], '2026-09-21')).toBe('2026-09-27');
    const ended = makeSchedule({ endDate: '2026-09-01' });
    expect(nextRecurrenceOnOrAfter([ended], '2026-09-21')).toBeNull();
  });
});
