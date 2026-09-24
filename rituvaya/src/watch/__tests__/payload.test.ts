import type { OccurrenceView } from '@/domain/logging/status';
import { setDeviceTimeZone } from '@/domain/time/clock';
import type { Item, OccurrenceStatus } from '@/domain/types';
import type { FormatContext } from '@/i18n/format';
import { makeItem } from '@/domain/__tests__/fixtures';
import { WATCH_PAYLOAD_VERSION, buildWatchPayload, watchStatus } from '../payload';

const tz = 'UTC';
const date = '2026-09-24';
const tomorrow = '2026-09-25';
const now = Date.UTC(2026, 8, 24, 9, 0);
const format: FormatContext = { language: 'en', timeFormat: '24h', tz, deviceUses24h: true };

const vitaminD = makeItem({ id: 'd', displayName: 'Vitamin D3', doseAmount: 2, doseUnit: 'capsule', strengthValue: 1000, strengthUnit: 'IU' });
const magnesium = makeItem({ id: 'm', displayName: 'Magnesium', doseAmount: 1, doseUnit: 'tablet', strengthValue: null, strengthUnit: null });
const metformin = makeItem({ id: 'x', kind: 'medication', displayName: 'Metformin', doseAmount: 1, doseUnit: 'tablet', strengthValue: 500, strengthUnit: 'mg' });
const itemsById = new Map<string, Item>([vitaminD, magnesium, metformin].map((i) => [i.id, i]));

function view(itemId: string, hour: number, status: OccurrenceStatus, on = date): OccurrenceView {
  const [y, m, d] = on.split('-').map(Number);
  const scheduledAt = Date.UTC(y, m - 1, d, hour, 0);
  return {
    occurrence: { key: `${itemId}|${on}|${hour}`, itemId, scheduleId: `s-${itemId}`, localDate: on, slotKey: String(hour), slot: { kind: 'exact', time: `${hour}:00` }, groupId: null, scheduledMinutes: hour * 60, scheduledAt, tz },
    status,
    log: null,
    state: null,
    effectiveAt: scheduledAt,
    isFinal: status === 'taken' || status === 'skipped' || status === 'missed',
  };
}

const oneDay = (views: OccurrenceView[], language: FormatContext['language'] = 'en') =>
  buildWatchPayload({ days: [{ date, views }], itemsById, format: { ...format, language }, now });

/** WatchConnectivity rejects property lists containing null or undefined. */
function findNullish(value: unknown, path = '$'): string | null {
  if (value === null || value === undefined) return path;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      const found = findNullish(value[i], `${path}[${i}]`);
      if (found) return found;
    }
  } else if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const found = findNullish(v, `${path}.${k}`);
      if (found) return found;
    }
  }
  return null;
}

beforeEach(() => setDeviceTimeZone('UTC'));

describe('watch payload', () => {
  it('keeps what is still to take and what was ticked, and drops skipped and missed doses', () => {
    expect(watchStatus('upcoming')).toBe('upcoming');
    expect(watchStatus('due')).toBe('due');
    expect(watchStatus('snoozed')).toBe('due');
    expect(watchStatus('overdue')).toBe('overdue');
    expect(watchStatus('autoMissed')).toBe('overdue');
    expect(watchStatus('taken')).toBe('taken');
    expect(watchStatus('skipped')).toBeNull();
    expect(watchStatus('missed')).toBeNull();
  });

  it('lists a day in time order with name, size and time', () => {
    const payload = oneDay([view('m', 20, 'upcoming'), view('d', 8, 'taken'), view('x', 13, 'overdue'), view('d', 21, 'skipped')]);
    expect(payload.v).toBe(WATCH_PAYLOAD_VERSION);
    expect(payload.days[0].date).toBe(date);
    expect(payload.days[0].doses.map((d) => [d.name, d.time, d.status])).toEqual([
      ['Vitamin D3', '08:00', 'taken'],
      ['Metformin', '13:00', 'overdue'],
      ['Magnesium', '20:00', 'upcoming'],
    ]);
    expect(payload.days[0].doses[1].medication).toBe(true);
  });

  it('carries each day separately, so the watch can pick the one matching its clock', () => {
    const payload = buildWatchPayload({
      days: [
        { date, views: [view('d', 8, 'taken')] },
        { date: tomorrow, views: [view('d', 8, 'upcoming', tomorrow)] },
      ],
      itemsById,
      format,
      now,
    });
    expect(payload.days.map((d) => d.date)).toEqual([date, tomorrow]);
    expect(payload.days[1].doses[0].key).toBe(`d|${tomorrow}|8`);
    expect(payload.days[1].doses[0].status).toBe('upcoming');
  });

  it('shows the amount and, when known, the strength', () => {
    const payload = oneDay([view('d', 8, 'due'), view('m', 9, 'due')]);
    // Same number formatting as the phone uses everywhere else.
    expect(payload.days[0].doses[0].size).toBe('2 capsules · 1,000 IU');
    expect(payload.days[0].doses[1].size).toBe('1 tablet');
  });

  it('carries the occurrence key the watch sends back when a dose is ticked', () => {
    expect(oneDay([view('d', 8, 'due')]).days[0].doses[0].key).toBe(`d|${date}|8`);
  });

  it('skips doses whose item no longer exists', () => {
    expect(oneDay([view('gone', 8, 'due')]).days[0].doses).toEqual([]);
  });

  it('never contains null or undefined, which the watch transfer would reject', () => {
    expect(findNullish(oneDay([view('d', 8, 'due'), view('m', 9, 'taken'), view('x', 10, 'upcoming')]))).toBeNull();
  });

  it('words everything in the user language and flags right-to-left layout', () => {
    const payload = oneDay([view('d', 8, 'due')], 'ar');
    expect(payload.rtl).toBe(true);
    expect(payload.labels.title).toBe('اليوم');
    expect(payload.labels.openPhone).toContain('ريتوفايا');
    expect(payload.days[0].doses[0].size).not.toMatch(/capsules/);
    // The watch fills these in itself as doses are ticked, so they must survive translation.
    expect(payload.labels.progress).toContain('{done}');
    expect(payload.labels.progress).toContain('{total}');
  });
});
