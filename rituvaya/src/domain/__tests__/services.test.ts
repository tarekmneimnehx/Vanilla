import { MemoryRepository } from '@/storage/memoryRepository';
import { defaultSettings } from '../defaults';
import { archiveItem, createGroup, createItemWithSchedule, pauseItem, resumeItem, updateGroup, updateSchedule, versionsFor } from '../services/scheduleService';
import { correctLog, markAllTaken, recordAction, recordExtraDose, remindLater, snoozeOccurrence, undoLog } from '../services/loggingService';
import { addWater, removeWater, updateWater, withGoal } from '../services/hydrationService';
import { buildDay, buildIndexes, computeStreaks, nextDose, type DataState } from '../services/queries';
import { setDeviceTimeZone } from '../time/clock';
import { makeItem } from './fixtures';

const tz = 'Asia/Dubai';
const today = '2026-09-20';
const minute = 60_000;

function at(date: string, hh: number, mm = 0): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d, hh - 4, mm); // Dubai is UTC+4
}

async function loadState(repo: MemoryRepository): Promise<DataState> {
  const settings = (await repo.getSettings()) ?? defaultSettings(today, tz);
  return {
    settings,
    items: await repo.listItems(),
    schedules: await repo.listSchedules(),
    groups: await repo.listGroups(),
    states: await repo.listOccurrenceStates(),
    logs: await repo.listLogs(),
    hydration: await repo.listHydration(),
    tz,
  };
}

async function day(repo: MemoryRepository, date: string, now: number) {
  const state = await loadState(repo);
  return buildDay(state, buildIndexes(state), date, now);
}

const itemInput = { ...makeItem(), id: undefined, status: undefined, createdAt: undefined, updatedAt: undefined, archivedAt: undefined, sortOrder: undefined } as unknown as Parameters<typeof createItemWithSchedule>[1];

beforeEach(() => setDeviceTimeZone('UTC'));

describe('logging service', () => {
  it('records taken once even if the notification action arrives twice', async () => {
    const repo = new MemoryRepository();
    await repo.saveSettings(defaultSettings(today, tz));
    const { item } = await createItemWithSchedule(repo, itemInput, { recurrence: { type: 'daily' }, slots: [{ kind: 'exact', time: '08:00' }], startDate: today, endDate: null, reminders: null }, today, at(today, 7));
    const now = at(today, 8, 5);
    const model = await day(repo, today, now);
    const occurrence = model.views[0].occurrence;
    const first = await recordAction(repo, { occurrence, item, action: 'taken', source: 'notification' }, now, tz);
    const second = await recordAction(repo, { occurrence, item, action: 'taken', source: 'notification' }, now + minute, tz);
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.log.id).toBe(first.log.id);
    expect((await repo.listLogs()).filter((l) => l.deletedAt === null)).toHaveLength(1);
    const after = await day(repo, today, now + 2 * minute);
    expect(after.views[0].status).toBe('taken');
    expect(after.summary.takenRatio).toBe(1);
  });

  it('undo restores the pending state, and a skip never counts as taken', async () => {
    const repo = new MemoryRepository();
    await repo.saveSettings(defaultSettings(today, tz));
    const { item } = await createItemWithSchedule(repo, itemInput, { recurrence: { type: 'daily' }, slots: [{ kind: 'exact', time: '08:00' }], startDate: today, endDate: null, reminders: null }, today, at(today, 7));
    const now = at(today, 8, 5);
    const occurrence = (await day(repo, today, now)).views[0].occurrence;
    const { log } = await recordAction(repo, { occurrence, item, action: 'skipped', reason: 'forgot', source: 'app' }, now, tz);
    let model = await day(repo, today, now + minute);
    expect(model.views[0].status).toBe('skipped');
    expect(model.summary.taken).toBe(0);
    expect(model.summary.recordedRatio).toBe(1);
    await undoLog(repo, log.id, now + 2 * minute);
    model = await day(repo, today, now + 3 * minute);
    expect(model.views[0].status).toBe('due');
    expect(model.summary.recordedRatio).toBe(0);
    expect(nextDose(model.views)?.view.occurrence.key).toBe(occurrence.key);
  });

  it('records a dose taken earlier with an edited timestamp and amount, and allows later correction', async () => {
    const repo = new MemoryRepository();
    await repo.saveSettings(defaultSettings(today, tz));
    const { item } = await createItemWithSchedule(repo, itemInput, { recurrence: { type: 'daily' }, slots: [{ kind: 'exact', time: '08:00' }], startDate: today, endDate: null, reminders: null }, today, at(today, 7));
    const now = at(today, 12);
    const occurrence = (await day(repo, today, now)).views[0].occurrence;
    const { log } = await recordAction(repo, { occurrence, item, action: 'taken', at: at(today, 9, 30), amount: 2, source: 'app' }, now, tz);
    expect(log.at).toBe(at(today, 9, 30));
    expect(log.amount).toBe(2);
    expect(log.scheduledAt).toBe(occurrence.scheduledAt);
    const corrected = await correctLog(repo, log.id, { action: 'skipped', reason: 'felt unwell' }, now + minute, tz);
    expect(corrected?.action).toBe('skipped');
    expect(corrected?.amount).toBeNull();
    const futureAttempt = await correctLog(repo, log.id, { action: 'taken', at: now + 60 * minute }, now + 2 * minute, tz);
    expect(futureAttempt?.at).toBe(now + 2 * minute); // clamped to the present
  });

  it('group action marks only pending items and leaves individual records editable', async () => {
    const repo = new MemoryRepository();
    await repo.saveSettings(defaultSettings(today, tz));
    const group = await createGroup(repo, 'Morning', { kind: 'exact', time: '08:00' }, today, at(today, 7));
    const a = await createItemWithSchedule(repo, { ...itemInput, displayName: 'A' }, { recurrence: { type: 'daily' }, slots: [{ kind: 'group', groupId: group.id }], startDate: today, endDate: null, reminders: null }, today, at(today, 7));
    const b = await createItemWithSchedule(repo, { ...itemInput, displayName: 'B' }, { recurrence: { type: 'daily' }, slots: [{ kind: 'group', groupId: group.id }], startDate: today, endDate: null, reminders: null }, today, at(today, 7));
    const now = at(today, 8, 10);
    let model = await day(repo, today, now);
    expect(model.groups).toHaveLength(1);
    expect(model.groups[0].views).toHaveLength(2);
    const viewA = model.groups[0].views.find((v) => v.occurrence.itemId === a.item.id)!;
    await recordAction(repo, { occurrence: viewA.occurrence, item: a.item, action: 'skipped', source: 'app' }, now, tz);
    model = await day(repo, today, now + minute);
    const itemsById = new Map([a.item, b.item].map((i) => [i.id, i]));
    const result = await markAllTaken(repo, model.groups[0].views, itemsById, now + minute, tz, 'group');
    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].itemId).toBe(b.item.id);
    expect(result.skippedKeys).toEqual([viewA.occurrence.key]);
    model = await day(repo, today, now + 2 * minute);
    expect(model.views.map((v) => v.status).sort()).toEqual(['skipped', 'taken']);
  });

  it('snooze and remind tonight are cleared by a final record', async () => {
    const repo = new MemoryRepository();
    await repo.saveSettings(defaultSettings(today, tz));
    const { item } = await createItemWithSchedule(repo, itemInput, { recurrence: { type: 'daily' }, slots: [{ kind: 'exact', time: '08:00' }], startDate: today, endDate: null, reminders: null }, today, at(today, 7));
    const now = at(today, 8, 2);
    const occurrence = (await day(repo, today, now)).views[0].occurrence;
    await snoozeOccurrence(repo, occurrence.key, now + 10 * minute, now);
    expect((await day(repo, today, now + minute)).views[0].status).toBe('snoozed');
    await remindLater(repo, occurrence.key, at(today, 21), now + 2 * minute);
    const view = (await day(repo, today, now + 3 * minute)).views[0];
    expect(view.status).toBe('snoozed');
    expect(view.effectiveAt).toBe(at(today, 21));
    await recordAction(repo, { occurrence, item, action: 'taken', source: 'app' }, now + 4 * minute, tz);
    expect(await repo.listOccurrenceStates()).toHaveLength(0);
  });

  it('records extra (as-needed) doses without creating required tasks', async () => {
    const repo = new MemoryRepository();
    await repo.saveSettings(defaultSettings(today, tz));
    const { item } = await createItemWithSchedule(repo, itemInput, { recurrence: { type: 'asNeeded' }, slots: [], startDate: today, endDate: null, reminders: null }, today, at(today, 7));
    const now = at(today, 15);
    await recordExtraDose(repo, item, { source: 'app' }, now, tz);
    const model = await day(repo, today, now + minute);
    expect(model.views).toHaveLength(0);
    expect(model.extras).toHaveLength(1);
    expect(model.summary.scheduled).toBe(0);
    const state = await loadState(repo);
    expect(computeStreaks(state, buildIndexes(state), today, now).tracking).toBe(0);
  });
});

describe('schedule service', () => {
  it('edits apply to future days while earlier days keep their original version', async () => {
    const repo = new MemoryRepository();
    await repo.saveSettings(defaultSettings(today, tz));
    const { item } = await createItemWithSchedule(repo, itemInput, { recurrence: { type: 'daily' }, slots: [{ kind: 'exact', time: '08:00' }], startDate: '2026-09-10', endDate: null, reminders: null }, '2026-09-10', at('2026-09-10', 7));
    const yesterday = '2026-09-19';
    const yesterdayNow = at(yesterday, 8, 5);
    const occurrence = (await day(repo, yesterday, yesterdayNow)).views[0].occurrence;
    await recordAction(repo, { occurrence, item, action: 'taken', source: 'app' }, yesterdayNow, tz);
    await updateSchedule(repo, item.id, { recurrence: { type: 'daily' }, slots: [{ kind: 'exact', time: '09:00' }, { kind: 'exact', time: '21:00' }], startDate: '2026-09-10', endDate: null, reminders: null }, today, at(today, 7));
    const versions = await versionsFor(repo, item.id);
    expect(versions).toHaveLength(2);
    expect(versions.find((v) => v.effectiveTo === today)?.slots).toHaveLength(1);
    const past = await day(repo, yesterday, at(today, 7));
    expect(past.views).toHaveLength(1);
    expect(past.views[0].status).toBe('taken');
    expect(past.views[0].occurrence.scheduledMinutes).toBe(8 * 60);
    const future = await day(repo, today, at(today, 7));
    expect(future.views.map((v) => v.occurrence.scheduledMinutes)).toEqual([9 * 60, 21 * 60]);
  });

  it('pausing stops future doses, resuming restores the same definition, history stays', async () => {
    const repo = new MemoryRepository();
    await repo.saveSettings(defaultSettings(today, tz));
    const { item } = await createItemWithSchedule(repo, itemInput, { recurrence: { type: 'interval', everyDays: 2 }, slots: [{ kind: 'exact', time: '08:00' }], startDate: '2026-09-10', endDate: null, reminders: null }, '2026-09-10', at('2026-09-10', 7));
    const occ = (await day(repo, '2026-09-18', at('2026-09-18', 8))).views[0].occurrence;
    await recordAction(repo, { occurrence: occ, item, action: 'taken', source: 'app' }, at('2026-09-18', 8), tz);
    await pauseItem(repo, item.id, today, at(today, 7));
    expect((await day(repo, today, at(today, 7))).views).toHaveLength(0);
    expect((await day(repo, '2026-09-22', at(today, 7))).views).toHaveLength(0);
    expect((await day(repo, '2026-09-18', at(today, 7))).views[0].status).toBe('taken');
    await resumeItem(repo, item.id, '2026-09-23', at('2026-09-23', 7));
    expect((await repo.getItem(item.id))?.status).toBe('active');
    // cadence continues from the original start date: 10, 12, ..., 22, 24
    expect((await day(repo, '2026-09-23', at('2026-09-23', 7))).views).toHaveLength(0);
    expect((await day(repo, '2026-09-24', at('2026-09-23', 7))).views).toHaveLength(1);
    const state = await loadState(repo);
    // paused days generate nothing, so the streak is not broken by the pause
    expect(computeStreaks(state, buildIndexes(state), '2026-09-23', at('2026-09-23', 7)).tracking).toBe(1);
  });

  it('archiving keeps history and removes future occurrences', async () => {
    const repo = new MemoryRepository();
    await repo.saveSettings(defaultSettings(today, tz));
    const { item } = await createItemWithSchedule(repo, itemInput, { recurrence: { type: 'daily' }, slots: [{ kind: 'exact', time: '08:00' }], startDate: '2026-09-18', endDate: null, reminders: null }, '2026-09-18', at('2026-09-18', 7));
    const occ = (await day(repo, '2026-09-19', at('2026-09-19', 8))).views[0].occurrence;
    await recordAction(repo, { occurrence: occ, item, action: 'taken', source: 'app' }, at('2026-09-19', 8), tz);
    await archiveItem(repo, item.id, today, at(today, 7));
    expect((await repo.getItem(item.id))?.status).toBe('archived');
    expect((await day(repo, today, at(today, 9))).views).toHaveLength(0);
    expect((await day(repo, '2026-09-19', at(today, 9))).views[0].status).toBe('taken');
    expect((await repo.listLogs()).filter((l) => l.itemId === item.id)).toHaveLength(1);
  });

  it('changing a group time moves future doses only', async () => {
    const repo = new MemoryRepository();
    await repo.saveSettings(defaultSettings(today, tz));
    const group = await createGroup(repo, 'Before bed', { kind: 'anchor', anchor: 'bedtime', offsetMinutes: -30 }, '2026-09-10', at('2026-09-10', 7));
    await createItemWithSchedule(repo, itemInput, { recurrence: { type: 'daily' }, slots: [{ kind: 'group', groupId: group.id }], startDate: '2026-09-10', endDate: null, reminders: null }, '2026-09-10', at('2026-09-10', 7));
    expect((await day(repo, '2026-09-19', at(today, 7))).views[0].occurrence.scheduledMinutes).toBe(22 * 60);
    await updateGroup(repo, group.id, { time: { kind: 'exact', time: '21:00' } }, today, at(today, 7));
    expect((await day(repo, '2026-09-19', at(today, 7))).views[0].occurrence.scheduledMinutes).toBe(22 * 60);
    expect((await day(repo, today, at(today, 7))).views[0].occurrence.scheduledMinutes).toBe(21 * 60);
  });
});

describe('hydration service', () => {
  it('adds, edits and removes entries and evaluates the goal in force per day', async () => {
    const repo = new MemoryRepository();
    let settings = defaultSettings('2026-09-18', tz);
    settings = withGoal(settings, 2000, '2026-09-18');
    await repo.saveSettings(settings);
    const e1 = await addWater(repo, 1500, at('2026-09-19', 9), tz);
    await addWater(repo, 500, at('2026-09-19', 12), tz);
    const e3 = await addWater(repo, 300, at(today, 8), tz);
    let state = await loadState(repo);
    expect(computeStreaks(state, buildIndexes(state), today, at(today, 9)).hydration).toBe(1);
    await updateWater(repo, e1.id, { amountMl: 1000 }, at(today, 9), tz);
    state = await loadState(repo);
    expect(computeStreaks(state, buildIndexes(state), today, at(today, 9)).hydration).toBe(0);
    await removeWater(repo, e3.id, at(today, 9));
    state = await loadState(repo);
    expect(state.hydration.filter((e) => e.deletedAt === null)).toHaveLength(2);
    // Raising the goal today must not rewrite yesterday's evaluation.
    settings = withGoal(settings, 3000, today);
    await repo.saveSettings(settings);
    await updateWater(repo, e1.id, { amountMl: 1500 }, at(today, 10), tz);
    state = await loadState(repo);
    expect(computeStreaks(state, buildIndexes(state), today, at(today, 10)).hydration).toBe(1);
  });

  it('assigns entries to the local day of the zone they were logged in', async () => {
    const repo = new MemoryRepository();
    await repo.saveSettings(defaultSettings(today, tz));
    const lateNight = Date.UTC(2026, 8, 20, 21, 30); // 01:30 on the 21st in Dubai
    const entry = await addWater(repo, 250, lateNight, tz);
    expect(entry.localDate).toBe('2026-09-21');
    expect(entry.tz).toBe(tz);
  });
});
