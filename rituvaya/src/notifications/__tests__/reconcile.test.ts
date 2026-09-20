import { MemoryRepository } from '@/storage/memoryRepository';
import { defaultSettings } from '@/domain/defaults';
import { createItemWithSchedule } from '@/domain/services/scheduleService';
import { recordAction, undoLog } from '@/domain/services/loggingService';
import { buildDay, buildIndexes, type DataState } from '@/domain/services/queries';
import { setDeviceTimeZone } from '@/domain/time/clock';
import { makeItem } from '@/domain/__tests__/fixtures';

const mockScheduled = new Map<string, { fireAt: number; title: string; body: string; category: string; data: unknown }>();
let mockCounter = 0;

jest.mock('../adapter', () => ({
  notificationsSupported: true,
  channelFor: (sound: string) => `doses-${sound}`,
  CHANNEL_HYDRATION: 'hydration',
  pendingNativeIds: async () => new Set(mockScheduled.keys()),
  scheduleAt: async (text: { title: string; body: string }, payload: unknown, fireAt: number, options: { category: string }) => {
    mockCounter += 1;
    const id = `native-${mockCounter}`;
    mockScheduled.set(id, { fireAt, title: text.title, body: text.body, category: options.category, data: payload });
    return id;
  },
  cancelNative: async (id: string) => {
    mockScheduled.delete(id);
  },
}));

// eslint-disable-next-line import/first
import { reconcileNotifications } from '../reconcile';

const tz = 'UTC';
const today = '2026-09-20';
const at = (h: number, m = 0, d = 20) => Date.UTC(2026, 8, d, h, m);
const itemInput = { ...makeItem(), id: undefined, status: undefined, createdAt: undefined, updatedAt: undefined, archivedAt: undefined, sortOrder: undefined } as unknown as Parameters<typeof createItemWithSchedule>[1];

async function state(repo: MemoryRepository): Promise<DataState> {
  return {
    settings: (await repo.getSettings())!,
    items: await repo.listItems(),
    schedules: await repo.listSchedules(),
    groups: await repo.listGroups(),
    states: await repo.listOccurrenceStates(),
    logs: await repo.listLogs(),
    hydration: await repo.listHydration(),
    tz,
  };
}

const format = { language: 'en' as const, timeFormat: '24h' as const, tz, deviceUses24h: true };

async function run(repo: MemoryRepository, now: number, granted = true) {
  return reconcileNotifications({ repo, state: await state(repo), now, language: 'en', format, permissionGranted: granted });
}

beforeEach(() => {
  mockScheduled.clear();
  mockCounter = 0;
  setDeviceTimeZone('UTC');
});

async function seed(): Promise<{ repo: MemoryRepository; itemId: string }> {
  const repo = new MemoryRepository();
  const settings = defaultSettings(today, tz);
  settings.onboarding.completed = true;
  await repo.saveSettings(settings);
  const { item } = await createItemWithSchedule(repo, itemInput, { recurrence: { type: 'daily' }, slots: [{ kind: 'exact', time: '08:00' }, { kind: 'exact', time: '20:00' }], startDate: today, endDate: null, reminders: null }, today, at(7));
  await createItemWithSchedule(repo, { ...itemInput, displayName: 'Magnesium' }, { recurrence: { type: 'daily' }, slots: [{ kind: 'exact', time: '20:00' }], startDate: today, endDate: null, reminders: null }, today, at(7));
  return { repo, itemId: item.id };
}

describe('notification reconciliation', () => {
  it('schedules due alerts and repeats, combining items due at the same time', async () => {
    const { repo } = await seed();
    const records = await run(repo, at(7));
    const todays = records.filter((r) => r.fireAt < at(0, 0, 21));
    // 08:00 (+3 repeats) for one item, 20:00 (+3 repeats) combined for two items.
    expect(todays).toHaveLength(8);
    const combined = todays.filter((r) => r.occurrenceKeys.length === 2);
    expect(combined).toHaveLength(4);
    const first = mockScheduled.get(todays[0].nativeId)!;
    expect(first.title).toBe('Time for Vitamin D3');
    expect(first.body).toBe('1 capsule · 08:00');
    const multi = mockScheduled.get(combined[0].nativeId)!;
    expect(multi.title).toBe('2 items due');
    expect(multi.category).toBe('rituvaya.dose.multi');
  });

  it('is idempotent and cancels stale alerts after a dose is recorded', async () => {
    const { repo, itemId } = await seed();
    const before = await run(repo, at(7));
    const again = await run(repo, at(7));
    expect(again.map((r) => r.id)).toEqual(before.map((r) => r.id));
    expect(mockScheduled.size).toBe(before.length);

    const s = await state(repo);
    const view = buildDay(s, buildIndexes(s), today, at(8, 1)).views.find((v) => v.occurrence.itemId === itemId && v.occurrence.scheduledMinutes === 480)!;
    await recordAction(repo, { occurrence: view.occurrence, item: s.items.find((i) => i.id === itemId)!, action: 'taken', source: 'app' }, at(8, 1), tz);
    const after = await run(repo, at(8, 1));
    expect(after.some((r) => r.occurrenceKeys.includes(view.occurrence.key))).toBe(false);
    expect(mockScheduled.size).toBe(after.length);
  });

  it('never replays expired alerts after undo', async () => {
    const { repo, itemId } = await seed();
    await run(repo, at(7));
    const s = await state(repo);
    const view = buildDay(s, buildIndexes(s), today, at(8, 1)).views.find((v) => v.occurrence.itemId === itemId && v.occurrence.scheduledMinutes === 480)!;
    const { log } = await recordAction(repo, { occurrence: view.occurrence, item: s.items.find((i) => i.id === itemId)!, action: 'taken', source: 'app' }, at(8, 1), tz);
    await run(repo, at(8, 1));
    await undoLog(repo, log.id, at(9));
    const records = await run(repo, at(9));
    const forKey = records.filter((r) => r.occurrenceKeys.includes(view.occurrence.key));
    expect(forKey).toHaveLength(0); // 08:00 + 45 min of repeats are all in the past
    expect(records.every((r) => r.fireAt > at(9))).toBe(true);
  });

  it('cancels everything when permission is denied and restores it when granted', async () => {
    const { repo } = await seed();
    await run(repo, at(7));
    expect(mockScheduled.size).toBeGreaterThan(0);
    const denied = await run(repo, at(7), false);
    expect(denied).toHaveLength(0);
    expect(mockScheduled.size).toBe(0);
    const granted = await run(repo, at(7), true);
    expect(granted.length).toBeGreaterThan(0);
  });

  it('honours discreet text and quiet hours', async () => {
    const { repo } = await seed();
    const settings = (await repo.getSettings())!;
    settings.reminders.discreetText = true;
    settings.reminders.quietHours = { enabled: true, start: '19:00', end: '07:30', mode: 'suppress' };
    await repo.saveSettings(settings);
    const records = await run(repo, at(7));
    const todays = records.filter((r) => r.fireAt < at(0, 0, 21));
    expect(todays.every((r) => r.fireAt >= at(7, 30) && r.fireAt < at(19))).toBe(true);
    expect(mockScheduled.get(todays[0].nativeId)!.title).toBe('Reminder');
    expect(mockScheduled.get(todays[0].nativeId)!.body).toBe('1 item is due');
  });

  it('drops registry rows whose native notification already fired', async () => {
    const { repo } = await seed();
    const records = await run(repo, at(7));
    const delivered = records[0];
    mockScheduled.delete(delivered.nativeId); // delivered by the OS at 08:00
    const after = await run(repo, at(8, 5));
    expect(after.find((r) => r.id === delivered.id)).toBeUndefined();
    expect([...mockScheduled.values()].some((n) => n.fireAt === delivered.fireAt)).toBe(false); // not re-created in the past
    expect(after.length).toBe(mockScheduled.size);
  });
});
