import { occurrencesForDay, occurrencesForDayAll, occurrencesInRange, parseOccurrenceKey } from '../schedule/occurrences';
import { dedupeSlots, slotKey } from '../schedule/slots';
import { setDeviceTimeZone, wallClock } from '../time/clock';
import { withValueFrom } from '../dated';
import { ANCHORS, anchorHistory, makeGroup, makeItem, makeSchedule } from './fixtures';

const groups = new Map([[makeGroup().id, makeGroup()]]);

function ctx(tz = 'Asia/Dubai', anchors = anchorHistory()) {
  return { tz, anchorHistory: anchors, groupsById: groups };
}

beforeEach(() => setDeviceTimeZone('UTC'));

describe('occurrence generation', () => {
  it('produces stable keys that do not depend on the time zone', () => {
    const item = makeItem();
    const schedule = makeSchedule({ slots: [{ kind: 'exact', time: '08:00' }, { kind: 'anchor', anchor: 'dinner', offsetMinutes: 30 }] });
    const dubai = occurrencesForDay(item, [schedule], '2026-09-20', ctx('Asia/Dubai'));
    const paris = occurrencesForDay(item, [schedule], '2026-09-20', ctx('Europe/Paris'));
    expect(dubai.map((o) => o.key)).toEqual(['item-1|2026-09-20|e0800', 'item-1|2026-09-20|a:dinner+30']);
    expect(paris.map((o) => o.key)).toEqual(dubai.map((o) => o.key));
    expect(dubai[0].scheduledAt).not.toBe(paris[0].scheduledAt);
    expect(wallClock(dubai[1].scheduledAt, 'Asia/Dubai').minutes).toBe(19 * 60 + 30);
    expect(parseOccurrenceKey(dubai[1].key)).toEqual({ itemId: 'item-1', date: '2026-09-20', slotKey: 'a:dinner+30' });
  });

  it('resolves anchors from the history in force on each day, without rewriting earlier days', () => {
    const item = makeItem();
    const schedule = makeSchedule({ slots: [{ kind: 'anchor', anchor: 'breakfast', offsetMinutes: 0 }] });
    const history = withValueFrom(anchorHistory(), '2026-09-15', { ...ANCHORS, breakfast: '09:30' });
    const before = occurrencesForDay(item, [schedule], '2026-09-14', ctx('Asia/Dubai', history))[0];
    const after = occurrencesForDay(item, [schedule], '2026-09-15', ctx('Asia/Dubai', history))[0];
    expect(before.scheduledMinutes).toBe(8 * 60);
    expect(after.scheduledMinutes).toBe(9 * 60 + 30);
    expect(before.key).toBe('item-1|2026-09-14|a:breakfast+0');
    expect(after.key).toBe('item-1|2026-09-15|a:breakfast+0');
  });

  it('uses group times for group slots and drops slots whose group is gone', () => {
    const item = makeItem();
    const schedule = makeSchedule({ slots: [{ kind: 'group', groupId: 'group-morning' }, { kind: 'group', groupId: 'missing' }] });
    const occ = occurrencesForDay(item, [schedule], '2026-09-20', ctx());
    expect(occ).toHaveLength(1);
    expect(occ[0].groupId).toBe('group-morning');
    expect(occ[0].scheduledMinutes).toBe(8 * 60);
  });

  it('ignores duplicate slot definitions', () => {
    const slots = dedupeSlots([
      { kind: 'exact', time: '08:00' },
      { kind: 'exact', time: '08:00' },
      { kind: 'anchor', anchor: 'wake', offsetMinutes: 0 },
    ]);
    expect(slots.map(slotKey)).toEqual(['e0800', 'a:wake+0']);
  });

  it('generates nothing for paused (closed) or archived items', () => {
    const item = makeItem();
    const closed = makeSchedule({ effectiveTo: '2026-09-10' });
    expect(occurrencesForDay(item, [closed], '2026-09-10', ctx())).toHaveLength(0);
    expect(occurrencesForDay(item, [closed], '2026-09-09', ctx())).toHaveLength(1);
  });

  it('sorts a day chronologically with grouped items first at equal times', () => {
    const a = { item: makeItem({ id: 'a', sortOrder: 2 }), versions: [makeSchedule({ id: 'sa', itemId: 'a', slots: [{ kind: 'exact', time: '08:00' }] })] };
    const b = { item: makeItem({ id: 'b', sortOrder: 1 }), versions: [makeSchedule({ id: 'sb', itemId: 'b', slots: [{ kind: 'group', groupId: 'group-morning' }] })] };
    const c = { item: makeItem({ id: 'c', sortOrder: 0 }), versions: [makeSchedule({ id: 'sc', itemId: 'c', slots: [{ kind: 'exact', time: '07:00' }] })] };
    const day = occurrencesForDayAll([a, b, c], '2026-09-20', ctx());
    expect(day.map((o) => o.itemId)).toEqual(['c', 'b', 'a']);
  });

  it('produces one occurrence per slot per day over a range, including DST days', () => {
    const entry = { item: makeItem(), versions: [makeSchedule({ slots: [{ kind: 'exact', time: '02:30' }] })] };
    const list = occurrencesInRange([entry], '2026-03-07', '2026-03-09', ctx('America/New_York'));
    expect(list.map((o) => o.localDate)).toEqual(['2026-03-07', '2026-03-08', '2026-03-09']);
    expect(wallClock(list[1].scheduledAt, 'America/New_York').hour).toBe(3); // gap day shifts forward
    const keys = new Set(list.map((o) => o.key));
    expect(keys.size).toBe(3);
  });
});
