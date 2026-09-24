// The store talks to iOS through these two modules; nothing here needs the OS.
jest.mock('@/notifications/adapter', () => ({
  notificationsSupported: false,
  configureNotifications: async () => undefined,
  getPermission: async () => ({ state: 'unsupported', canAskAgain: false }),
  requestPermission: async () => ({ state: 'unsupported', canAskAgain: false }),
  scheduleTest: async () => false,
}));
jest.mock('@/notifications/reconcile', () => ({ reconcileNotifications: async () => undefined }));

import { defaultSettings } from '@/domain/defaults';
import { createItemWithSchedule } from '@/domain/services/scheduleService';
import { buildDay, buildIndexes } from '@/domain/services/queries';
import { setDeviceTimeZone } from '@/domain/time/clock';
import { makeItem } from '@/domain/__tests__/fixtures';
import { AppStore } from '@/state/store';
import { MemoryRepository } from '@/storage/memoryRepository';
import { parseWatchAction, type WatchAction } from '../actions';

const tz = 'UTC';
const today = '2026-09-24';
const minute = 60_000;
const at = (hour: number, min = 0) => Date.UTC(2026, 8, 24, hour, min);

async function setup(startAt: number) {
  const clock = { now: startAt };
  const repo = new MemoryRepository();
  await repo.saveSettings(defaultSettings(today, tz));
  const input = { ...makeItem(), id: undefined, status: undefined, createdAt: undefined, updatedAt: undefined, archivedAt: undefined, sortOrder: undefined } as unknown as Parameters<typeof createItemWithSchedule>[1];
  await createItemWithSchedule(repo, input, { recurrence: { type: 'daily' }, slots: [{ kind: 'exact', time: '08:00' }], startDate: today, endDate: null, reminders: null }, today, at(7));
  const store = new AppStore({ repo, deviceUses24h: () => true, now: () => clock.now });
  await store.init(null);
  const snapshot = store.getSnapshot();
  const key = buildDay(snapshot, buildIndexes(snapshot), today, clock.now).views[0].occurrence.key;
  const status = () => {
    const s = store.getSnapshot();
    return buildDay(s, buildIndexes(s), today, clock.now).views[0].status;
  };
  const liveLogs = async () => (await repo.listLogs()).filter((l) => l.deletedAt === null);
  return { store, repo, clock, key, status, liveLogs };
}

const tap = (overrides: Partial<WatchAction> & { keys: string[] }): WatchAction => ({ id: 'tap-1', action: 'taken', at: at(8, 2), ...overrides });

beforeEach(() => setDeviceTimeZone('UTC'));

describe('parseWatchAction', () => {
  const valid = { type: 'action', id: 'a1', action: 'taken', keys: ['k'], at: 1 };

  it('accepts the shape the watch sends', () => {
    expect(parseWatchAction(valid)).toEqual({ id: 'a1', action: 'taken', keys: ['k'], at: 1 });
  });

  it.each([
    ['not an object', 'taken'],
    ['another message type', { ...valid, type: 'hello' }],
    ['an unknown action', { ...valid, action: 'delete' }],
    ['no id', { ...valid, id: '' }],
    ['no keys', { ...valid, keys: [] }],
    ['a non-string key', { ...valid, keys: [42] }],
    ['a missing time', { ...valid, at: undefined }],
    ['a non-finite time', { ...valid, at: Number.NaN }],
  ])('drops %s', (_label, raw) => {
    expect(parseWatchAction(raw)).toBeNull();
  });
});

describe('applyWatchAction', () => {
  it('records a tick at the time it was tapped on the watch, marked as from the watch', async () => {
    const { store, clock, key, status, liveLogs } = await setup(at(8, 1));
    clock.now = at(8, 30); // the phone only hears about it later
    expect(await store.applyWatchAction(tap({ keys: [key], at: at(8, 2) }))).toBe(1);
    const [log] = await liveLogs();
    expect(log.action).toBe('taken');
    expect(log.source).toBe('watch');
    expect(log.at).toBe(at(8, 2));
    expect(status()).toBe('taken');
  });

  it('counts a tap once when both the message and its queued copy arrive', async () => {
    const { store, key, liveLogs } = await setup(at(8, 5));
    expect(await store.applyWatchAction(tap({ keys: [key] }))).toBe(1);
    expect(await store.applyWatchAction(tap({ keys: [key] }))).toBe(0);
    expect(await liveLogs()).toHaveLength(1);
  });

  it('does nothing for a dose already taken on the phone', async () => {
    const { store, key, liveLogs } = await setup(at(8, 5));
    await store.applyWatchAction(tap({ id: 'phone-first', keys: [key] }));
    expect(await store.applyWatchAction(tap({ id: 'watch-later', keys: [key] }))).toBe(0);
    expect(await liveLogs()).toHaveLength(1);
  });

  it('never logs a time in the future when the watch clock runs ahead', async () => {
    const { store, key, liveLogs } = await setup(at(8, 5));
    await store.applyWatchAction(tap({ keys: [key], at: at(9, 0) }));
    expect((await liveLogs())[0].at).toBe(at(8, 5));
  });

  it('records a skip, which is never shown as taken', async () => {
    const { store, key, status, liveLogs } = await setup(at(8, 5));
    expect(await store.applyWatchAction(tap({ action: 'skip', keys: [key] }))).toBe(1);
    expect((await liveLogs())[0].action).toBe('skipped');
    expect(status()).toBe('skipped');
  });

  it('snoozes without recording anything', async () => {
    const { store, key, status, liveLogs } = await setup(at(8, 5));
    expect(await store.applyWatchAction(tap({ action: 'snooze', keys: [key] }))).toBe(1);
    expect(await liveLogs()).toHaveLength(0);
    expect(status()).toBe('snoozed');
  });

  it('ignores keys it does not know instead of failing', async () => {
    const { store, liveLogs } = await setup(at(8, 5));
    expect(await store.applyWatchAction(tap({ keys: [`nope|${today}|x`] }))).toBe(0);
    expect(await liveLogs()).toHaveLength(0);
  });
});
