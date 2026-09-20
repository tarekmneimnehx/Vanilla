import { effectiveAt } from '../dated';
import { parseTimeOfDay } from '../time/clock';
import type { LocalDate } from '../time/localDate';
import type { AnchorKey, Anchors, Dated, GroupTime, RoutineGroup, TimeSlot } from '../types';

export interface SlotContext {
  anchorHistory: Dated<Anchors>[];
  groupsById: ReadonlyMap<string, RoutineGroup>;
}

/** Fallback anchor times used only when an anchor was never set but a schedule still refers to it. */
export const FALLBACK_ANCHORS: Record<AnchorKey, string> = {
  wake: '07:00',
  breakfast: '08:00',
  lunch: '13:00',
  dinner: '19:00',
  bedtime: '22:30',
};

export function anchorsOn(history: Dated<Anchors>[], date: LocalDate): Anchors {
  const value = effectiveAt(history, date);
  return value ?? { wake: null, breakfast: null, lunch: null, dinner: null, bedtime: null };
}

export function resolveAnchorMinutes(anchor: AnchorKey, anchors: Anchors): number {
  const time = anchors[anchor] ?? FALLBACK_ANCHORS[anchor];
  return parseTimeOfDay(time);
}

/** A stable key for a slot definition; it never depends on the resolved clock time. */
export function slotKey(slot: TimeSlot): string {
  switch (slot.kind) {
    case 'exact':
      return `e${slot.time.replace(':', '')}`;
    case 'anchor':
      return `a:${slot.anchor}${slot.offsetMinutes >= 0 ? '+' : ''}${slot.offsetMinutes}`;
    case 'group':
      return `g:${slot.groupId}`;
  }
}

export function groupTimeOn(group: RoutineGroup, date: LocalDate): GroupTime | null {
  return effectiveAt(group.timeHistory, date);
}

/** Minutes after local midnight for a slot on a date. Returns null when a group no longer exists. */
export function resolveSlotMinutes(slot: TimeSlot, date: LocalDate, ctx: SlotContext): number | null {
  const anchors = anchorsOn(ctx.anchorHistory, date);
  switch (slot.kind) {
    case 'exact':
      return parseTimeOfDay(slot.time);
    case 'anchor':
      return clampMinutes(resolveAnchorMinutes(slot.anchor, anchors) + slot.offsetMinutes);
    case 'group': {
      const group = ctx.groupsById.get(slot.groupId);
      if (!group) return null;
      const time = groupTimeOn(group, date);
      if (!time) return null;
      return resolveSlotMinutes(time, date, ctx);
    }
  }
}

function clampMinutes(minutes: number): number {
  return Math.max(0, Math.min(1439, minutes));
}

/** Removes duplicate slot definitions while keeping the first occurrence order. */
export function dedupeSlots(slots: TimeSlot[]): TimeSlot[] {
  const seen = new Set<string>();
  const result: TimeSlot[] = [];
  for (const slot of slots) {
    const key = slotKey(slot);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(slot);
  }
  return result;
}
