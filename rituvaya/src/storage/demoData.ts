import { newId } from '@/domain/ids';
import { addWater } from '@/domain/services/hydrationService';
import { recordAction } from '@/domain/services/loggingService';
import { buildDay, buildIndexes, type DataState } from '@/domain/services/queries';
import { createGroup, createItemWithSchedule } from '@/domain/services/scheduleService';
import { epochFor } from '@/domain/time/clock';
import { addDays, type LocalDate } from '@/domain/time/localDate';
import type { Item, Settings } from '@/domain/types';
import type { Repository } from './repository';

const base: Omit<Item, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'archivedAt' | 'sortOrder'> = {
  kind: 'supplement',
  displayName: '',
  genericName: null,
  brand: null,
  ingredients: [],
  strengthValue: null,
  strengthUnit: null,
  servingSize: null,
  servingUnit: null,
  doseAmount: 1,
  doseUnit: 'capsule',
  form: 'capsule',
  customFormLabel: null,
  purpose: null,
  notes: null,
  catalogId: null,
  isDemo: true,
};

/**
 * Optional, clearly labelled sample data. Demo items carry `isDemo` and are
 * removed together with their records; the user's own entries are untouched.
 */
export async function loadDemoData(repo: Repository, settings: Settings, today: LocalDate, now: number, tz: string): Promise<void> {
  const start = addDays(today, -9);
  const startNow = epochFor(start, 7 * 60, tz);
  const morning = await createGroup(repo, 'Morning (Demo)', { kind: 'anchor', anchor: 'wake', offsetMinutes: 30 }, start, startNow);
  const vitD = await createItemWithSchedule(
    repo,
    { ...base, displayName: 'Vitamin D3 (Demo)', genericName: 'Vitamin D3', strengthValue: 1000, strengthUnit: 'IU', servingSize: 1, servingUnit: 'capsule', catalogId: 'vitamin-d3' },
    { recurrence: { type: 'daily' }, slots: [{ kind: 'group', groupId: morning.id }], startDate: start, endDate: null, reminders: null },
    start,
    startNow,
  );
  const omega = await createItemWithSchedule(
    repo,
    { ...base, displayName: 'Omega-3 (Demo)', genericName: 'Omega-3', doseAmount: 2, strengthValue: 500, strengthUnit: 'mg', servingSize: 2, servingUnit: 'capsule', catalogId: 'omega-3' },
    { recurrence: { type: 'daily' }, slots: [{ kind: 'group', groupId: morning.id }], startDate: start, endDate: null, reminders: null },
    start,
    startNow,
  );
  const magnesium = await createItemWithSchedule(
    repo,
    { ...base, displayName: 'Magnesium (Demo)', genericName: 'Magnesium', strengthValue: 200, strengthUnit: 'mg', doseUnit: 'tablet', form: 'tablet', catalogId: 'magnesium' },
    { recurrence: { type: 'daily' }, slots: [{ kind: 'anchor', anchor: 'bedtime', offsetMinutes: -30 }], startDate: start, endDate: null, reminders: null },
    start,
    startNow,
  );
  const antihistamine = await createItemWithSchedule(
    repo,
    { ...base, kind: 'medication', displayName: 'Cetirizine (Demo)', genericName: 'Cetirizine', strengthValue: 10, strengthUnit: 'mg', doseUnit: 'tablet', form: 'tablet', catalogId: 'cetirizine' },
    { recurrence: { type: 'weekdays', weekdays: [1, 3, 5] }, slots: [{ kind: 'exact', time: '20:00' }], startDate: start, endDate: null, reminders: null },
    start,
    startNow,
  );
  const itemsById = new Map([vitD.item, omega.item, magnesium.item, antihistamine.item].map((i) => [i.id, i]));

  // Record a realistic past: mostly taken, one skipped, one left unrecorded three days ago.
  for (let offset = 9; offset >= 1; offset -= 1) {
    const date = addDays(today, -offset);
    const state: DataState = {
      settings,
      items: await repo.listItems(),
      schedules: await repo.listSchedules(),
      groups: await repo.listGroups(),
      states: [],
      logs: await repo.listLogs(),
      hydration: [],
      tz,
    };
    const day = buildDay(state, buildIndexes(state), date, now);
    for (const view of day.views) {
      const item = itemsById.get(view.occurrence.itemId);
      if (!item?.isDemo) continue;
      const scheduled = view.occurrence.scheduledAt;
      if (offset === 3 && item.id === magnesium.item.id) continue; // left unrecorded on purpose
      const action = offset === 5 && item.id === omega.item.id ? 'skipped' : 'taken';
      await recordAction(
        repo,
        { occurrence: view.occurrence, item, action, at: scheduled + 12 * 60_000, reason: action === 'skipped' ? 'Ran out' : null, source: 'app' },
        scheduled + 12 * 60_000,
        tz,
      );
    }
    const amounts = offset % 3 === 0 ? [500, 500, 400] : [500, 750, 500, 400];
    let minute = 8 * 60;
    for (const amount of amounts) {
      await addWater(repo, amount, epochFor(date, minute, tz), tz, undefined, true);
      minute += 150;
    }
  }
  void newId;
}
