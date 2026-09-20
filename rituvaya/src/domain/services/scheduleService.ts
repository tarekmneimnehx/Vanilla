import { newId } from '../ids';
import { dedupeSlots } from '../schedule/slots';
import { withValueFrom } from '../dated';
import type { LocalDate } from '../time/localDate';
import type { GroupTime, Item, Recurrence, ReminderConfig, RoutineGroup, Schedule, TimeSlot } from '../types';
import type { Repository } from '@/storage/repository';

export interface ScheduleDefinition {
  recurrence: Recurrence;
  slots: TimeSlot[];
  startDate: LocalDate;
  endDate: LocalDate | null;
  reminders: ReminderConfig | null;
}

export type NewItemInput = Omit<Item, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'archivedAt' | 'sortOrder'> & { sortOrder?: number };

export function validateDefinition(def: ScheduleDefinition): string[] {
  const errors: string[] = [];
  if (def.recurrence.type !== 'asNeeded' && def.slots.length === 0) errors.push('slots');
  if (def.recurrence.type === 'weekdays' && def.recurrence.weekdays.length === 0) errors.push('weekdays');
  if (def.recurrence.type === 'interval' && (!Number.isInteger(def.recurrence.everyDays) || def.recurrence.everyDays < 2)) errors.push('interval');
  if (def.recurrence.type === 'cycle' && (def.recurrence.onDays < 1 || def.recurrence.offDays < 1)) errors.push('cycle');
  if (def.endDate && def.endDate < def.startDate) errors.push('endDate');
  return errors;
}

export async function createItemWithSchedule(repo: Repository, input: NewItemInput, def: ScheduleDefinition, today: LocalDate, now: number): Promise<{ item: Item; schedule: Schedule }> {
  const existing = await repo.listItems();
  const item: Item = {
    ...input,
    id: newId(),
    status: 'active',
    sortOrder: input.sortOrder ?? existing.length,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  };
  const schedule: Schedule = {
    id: newId(),
    itemId: item.id,
    recurrence: def.recurrence,
    slots: dedupeSlots(def.slots),
    startDate: def.startDate,
    endDate: def.endDate,
    effectiveFrom: today,
    effectiveTo: null,
    reminders: def.reminders,
    createdAt: now,
  };
  await repo.upsertItem(item);
  await repo.upsertSchedule(schedule);
  return { item, schedule };
}

export async function updateItem(repo: Repository, itemId: string, changes: Partial<Omit<Item, 'id' | 'createdAt'>>, now: number): Promise<Item> {
  const item = await repo.getItem(itemId);
  if (!item) throw new Error('Item not found');
  const updated: Item = { ...item, ...changes, id: item.id, createdAt: item.createdAt, updatedAt: now };
  await repo.upsertItem(updated);
  return updated;
}

/** Versions for an item, newest first. */
export async function versionsFor(repo: Repository, itemId: string): Promise<Schedule[]> {
  const all = await repo.listSchedules();
  return all.filter((s) => s.itemId === itemId);
}

export function currentVersion(versions: readonly Schedule[]): Schedule | null {
  return versions.find((v) => v.effectiveTo === null) ?? null;
}

/** Closes the open version as of `today`. A version that only started today is removed instead of leaving an empty window. */
async function closeOpenVersion(repo: Repository, versions: Schedule[], today: LocalDate): Promise<Schedule | null> {
  const open = currentVersion(versions);
  if (!open) return null;
  if (open.effectiveFrom >= today) {
    await repo.upsertSchedule({ ...open, effectiveTo: open.effectiveFrom });
  } else {
    await repo.upsertSchedule({ ...open, effectiveTo: today });
  }
  return open;
}

/**
 * Replaces the schedule from today on. Earlier days keep the version that was
 * in force, so history and streaks never change retroactively.
 */
export async function updateSchedule(repo: Repository, itemId: string, def: ScheduleDefinition, today: LocalDate, now: number): Promise<Schedule> {
  const versions = await versionsFor(repo, itemId);
  await closeOpenVersion(repo, versions, today);
  const next: Schedule = {
    id: newId(),
    itemId,
    recurrence: def.recurrence,
    slots: dedupeSlots(def.slots),
    startDate: def.startDate,
    endDate: def.endDate,
    effectiveFrom: today,
    effectiveTo: null,
    reminders: def.reminders,
    createdAt: now,
  };
  await repo.upsertSchedule(next);
  return next;
}

export async function pauseItem(repo: Repository, itemId: string, today: LocalDate, now: number): Promise<void> {
  const versions = await versionsFor(repo, itemId);
  await closeOpenVersion(repo, versions, today);
  await updateItem(repo, itemId, { status: 'paused' }, now);
}

/** Resumes with the most recent definition, from today. */
export async function resumeItem(repo: Repository, itemId: string, today: LocalDate, now: number): Promise<Schedule | null> {
  const versions = await versionsFor(repo, itemId);
  const latest = versions[0] ?? null;
  await updateItem(repo, itemId, { status: 'active', archivedAt: null }, now);
  if (!latest) return null;
  if (latest.effectiveTo === null) return latest;
  return updateSchedule(repo, itemId, { recurrence: latest.recurrence, slots: latest.slots, startDate: latest.startDate, endDate: latest.endDate, reminders: latest.reminders }, today, now);
}

export async function archiveItem(repo: Repository, itemId: string, today: LocalDate, now: number): Promise<void> {
  const versions = await versionsFor(repo, itemId);
  await closeOpenVersion(repo, versions, today);
  await updateItem(repo, itemId, { status: 'archived', archivedAt: now }, now);
}

export async function createGroup(repo: Repository, name: string, time: GroupTime, today: LocalDate, now: number): Promise<RoutineGroup> {
  const groups = await repo.listGroups();
  const group: RoutineGroup = {
    id: newId(),
    name: name.trim(),
    timeHistory: [{ effectiveFrom: today, value: time }],
    sortOrder: groups.length,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  };
  await repo.upsertGroup(group);
  return group;
}

export async function updateGroup(repo: Repository, groupId: string, changes: { name?: string; time?: GroupTime }, today: LocalDate, now: number): Promise<RoutineGroup> {
  const groups = await repo.listGroups();
  const group = groups.find((g) => g.id === groupId);
  if (!group) throw new Error('Group not found');
  const updated: RoutineGroup = {
    ...group,
    name: changes.name?.trim() || group.name,
    timeHistory: changes.time ? withValueFrom(group.timeHistory, today, changes.time) : group.timeHistory,
    updatedAt: now,
  };
  await repo.upsertGroup(updated);
  return updated;
}

/** Archives a group and detaches it from open schedule versions, keeping each item's resolved time as an exact slot. */
export async function archiveGroup(repo: Repository, groupId: string, resolvedTime: string, today: LocalDate, now: number): Promise<void> {
  const groups = await repo.listGroups();
  const group = groups.find((g) => g.id === groupId);
  if (!group) return;
  await repo.upsertGroup({ ...group, archivedAt: now, updatedAt: now });
  const schedules = await repo.listSchedules();
  for (const schedule of schedules) {
    if (schedule.effectiveTo !== null) continue;
    if (!schedule.slots.some((slot) => slot.kind === 'group' && slot.groupId === groupId)) continue;
    const slots: TimeSlot[] = schedule.slots.map((slot) => (slot.kind === 'group' && slot.groupId === groupId ? { kind: 'exact', time: resolvedTime } : slot));
    await updateSchedule(repo, schedule.itemId, { recurrence: schedule.recurrence, slots, startDate: schedule.startDate, endDate: schedule.endDate, reminders: schedule.reminders }, today, now);
  }
}
