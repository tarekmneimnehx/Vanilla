import { addDays, daysBetween, isLocalDate, listDays, startOfWeek, weekdayOf, addMonths, endOfMonth } from '../time/localDate';
import { epochFor, wallClock, setDeviceTimeZone, todayIn, offsetAt, inWindow, minutesToTimeOfDay, parseTimeOfDay } from '../time/clock';

describe('local dates', () => {
  it('validates ISO dates', () => {
    expect(isLocalDate('2026-02-28')).toBe(true);
    expect(isLocalDate('2026-02-30')).toBe(false);
    expect(isLocalDate('2026-13-01')).toBe(false);
    expect(isLocalDate('26-1-1')).toBe(false);
  });

  it('adds and subtracts calendar days across month and year ends', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
    expect(daysBetween('2026-01-01', '2026-12-31')).toBe(364);
  });

  it('knows weekdays and week starts', () => {
    expect(weekdayOf('2026-09-20')).toBe(0); // Sunday
    expect(startOfWeek('2026-09-23', 1)).toBe('2026-09-21');
    expect(startOfWeek('2026-09-23', 0)).toBe('2026-09-20');
    expect(startOfWeek('2026-09-23', 6)).toBe('2026-09-19');
  });

  it('handles month arithmetic', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(endOfMonth('2026-02-01')).toBe('2026-02-28');
    expect(listDays('2026-09-29', '2026-10-02')).toEqual(['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02']);
  });
});

describe('wall clock in explicit time zones', () => {
  beforeEach(() => setDeviceTimeZone('UTC'));

  it('converts instants to wall clock in Dubai (no DST)', () => {
    const t = Date.UTC(2026, 8, 20, 4, 0, 0); // 04:00 UTC = 08:00 Dubai
    const wc = wallClock(t, 'Asia/Dubai');
    expect(wc.date).toBe('2026-09-20');
    expect(wc.hour).toBe(8);
    expect(wc.minutes).toBe(480);
    expect(epochFor('2026-09-20', 480, 'Asia/Dubai')).toBe(t);
    expect(offsetAt(t, 'Asia/Dubai')).toBe(4 * 3_600_000);
  });

  it('crosses local midnight correctly', () => {
    const t = Date.UTC(2026, 8, 20, 22, 30); // 22:30 UTC = 02:30 next day in Dubai
    expect(wallClock(t, 'Asia/Dubai').date).toBe('2026-09-21');
    expect(todayIn('Asia/Dubai', t)).toBe('2026-09-21');
    expect(todayIn('America/Los_Angeles', t)).toBe('2026-09-20');
  });

  it('moves a time in a spring-forward gap to after the gap (New York, 2026-03-08)', () => {
    const t = epochFor('2026-03-08', 150, 'America/New_York'); // 02:30 does not exist
    const wc = wallClock(t, 'America/New_York');
    expect(wc.hour).toBe(3);
    expect(wc.minute).toBe(30);
    // Times on either side of the gap are 24h apart on the calendar but 23h in real time.
    const before = epochFor('2026-03-07', 8 * 60, 'America/New_York');
    const after = epochFor('2026-03-08', 8 * 60, 'America/New_York');
    expect(after - before).toBe(23 * 3_600_000);
  });

  it('takes the earlier instant for an ambiguous fall-back time (New York, 2026-11-01)', () => {
    const t = epochFor('2026-11-01', 90, 'America/New_York'); // 01:30 happens twice
    expect(t).toBe(Date.UTC(2026, 10, 1, 5, 30)); // EDT (UTC-4)
    const before = epochFor('2026-10-31', 8 * 60, 'America/New_York');
    const after = epochFor('2026-11-01', 8 * 60, 'America/New_York');
    expect(after - before).toBe(25 * 3_600_000);
  });

  it('handles European DST (Berlin, 2026-03-29 and 2026-10-25)', () => {
    expect(wallClock(epochFor('2026-03-29', 8 * 60, 'Europe/Berlin'), 'Europe/Berlin').hour).toBe(8);
    expect(offsetAt(epochFor('2026-03-28', 12 * 60, 'Europe/Berlin'), 'Europe/Berlin')).toBe(3_600_000);
    expect(offsetAt(epochFor('2026-03-29', 12 * 60, 'Europe/Berlin'), 'Europe/Berlin')).toBe(7_200_000);
    expect(offsetAt(epochFor('2026-10-25', 12 * 60, 'Europe/Berlin'), 'Europe/Berlin')).toBe(3_600_000);
  });

  it('uses the device path when the zone matches the device zone', () => {
    setDeviceTimeZone('UTC');
    const t = Date.UTC(2026, 0, 15, 9, 15);
    expect(wallClock(t, 'UTC').minutes).toBe(555);
    expect(epochFor('2026-01-15', 555, 'UTC')).toBe(t);
  });

  it('parses and formats times of day and windows', () => {
    expect(parseTimeOfDay('07:05')).toBe(425);
    expect(minutesToTimeOfDay(1439)).toBe('23:59');
    expect(() => parseTimeOfDay('24:00')).toThrow();
    expect(inWindow(23 * 60, 22 * 60, 7 * 60)).toBe(true); // wraps past midnight
    expect(inWindow(3 * 60, 22 * 60, 7 * 60)).toBe(true);
    expect(inWindow(12 * 60, 22 * 60, 7 * 60)).toBe(false);
    expect(inWindow(7 * 60, 22 * 60, 7 * 60)).toBe(false); // end is exclusive
  });
});
