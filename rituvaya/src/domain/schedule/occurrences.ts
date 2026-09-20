import { epochFor } from '../time/clock';
import { eachDay, type LocalDate } from '../time/localDate';
import type { Item, Occurrence, Schedule } from '../types';
import { scheduleRecursOn, versionOn } from './recurrence';
import { resolveSlotMinutes, slotKey, type SlotContext } from './slots';

export interface OccurrenceContext extends SlotContext {
  tz: string;
}

export const KEY_SEPARATOR = '|';

export function occurrenceKey(itemId: string, date: LocalDate, slot: string): string {
  return `${itemId}${KEY_SEPARATOR}${date}${KEY_SEPARATOR}${slot}`;
}

export function parseOccurrenceKey(key: string): { itemId: string; date: LocalDate; slotKey: string } | null {
  const parts = key.split(KEY_SEPARATOR);
  if (parts.length !== 3) return null;
  return { itemId: parts[0], date: parts[1], slotKey: parts[2] };
}

/** Occurrences of one item on one local day. Archived/paused items are excluded via their closed versions. */
export function occurrencesForDay(item: Item, versions: readonly Schedule[], date: LocalDate, ctx: OccurrenceContext): Occurrence[] {
  const version = versionOn(versions, date);
  if (!version) return [];
  if (!scheduleRecursOn(version, date)) return [];
  const result: Occurrence[] = [];
  const seen = new Set<string>();
  for (const slot of version.slots) {
    const key = slotKey(slot);
    if (seen.has(key)) continue;
    seen.add(key);
    const minutes = resolveSlotMinutes(slot, date, ctx);
    if (minutes === null) continue;
    result.push({
      key: occurrenceKey(item.id, date, key),
      itemId: item.id,
      scheduleId: version.id,
      localDate: date,
      slotKey: key,
      slot,
      groupId: slot.kind === 'group' ? slot.groupId : null,
      scheduledMinutes: minutes,
      scheduledAt: epochFor(date, minutes, ctx.tz),
      tz: ctx.tz,
    });
  }
  return result;
}

export interface ItemWithSchedules {
  item: Item;
  versions: readonly Schedule[];
}

export function occurrencesForDayAll(entries: readonly ItemWithSchedules[], date: LocalDate, ctx: OccurrenceContext): Occurrence[] {
  const result: Occurrence[] = [];
  for (const entry of entries) result.push(...occurrencesForDay(entry.item, entry.versions, date, ctx));
  return sortOccurrences(result, entries);
}

export function occurrencesInRange(entries: readonly ItemWithSchedules[], from: LocalDate, to: LocalDate, ctx: OccurrenceContext): Occurrence[] {
  const result: Occurrence[] = [];
  for (const date of eachDay(from, to)) result.push(...occurrencesForDayAll(entries, date, ctx));
  return result;
}

export function sortOccurrences(occurrences: Occurrence[], entries: readonly ItemWithSchedules[]): Occurrence[] {
  const order = new Map<string, number>();
  entries.forEach((entry, index) => order.set(entry.item.id, entry.item.sortOrder * 1000 + index));
  return [...occurrences].sort((a, b) => {
    if (a.scheduledAt !== b.scheduledAt) return a.scheduledAt - b.scheduledAt;
    const ga = a.groupId ? 0 : 1;
    const gb = b.groupId ? 0 : 1;
    if (ga !== gb) return ga - gb;
    return (order.get(a.itemId) ?? 0) - (order.get(b.itemId) ?? 0);
  });
}
