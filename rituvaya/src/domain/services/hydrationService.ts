import { newId } from '../ids';
import { effectiveAt, withValueFrom } from '../dated';
import { wallClock } from '../time/clock';
import type { LocalDate } from '../time/localDate';
import type { HydrationEntry, Settings } from '../types';
import type { Repository } from '@/storage/repository';

export async function addWater(repo: Repository, amountMl: number, now: number, tz: string, at?: number, isDemo = false): Promise<HydrationEntry> {
  const when = Math.min(at ?? now, now);
  const entry: HydrationEntry = {
    id: newId(),
    amountMl,
    at: when,
    localDate: wallClock(when, tz).date,
    tz,
    isDemo,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  await repo.upsertHydration(entry);
  return entry;
}

export async function updateWater(repo: Repository, id: string, changes: { amountMl?: number; at?: number }, now: number, tz: string): Promise<HydrationEntry | null> {
  const entries = await repo.listHydration();
  const entry = entries.find((e) => e.id === id);
  if (!entry) return null;
  const at = changes.at !== undefined ? Math.min(changes.at, now) : entry.at;
  const updated: HydrationEntry = {
    ...entry,
    amountMl: changes.amountMl ?? entry.amountMl,
    at,
    localDate: changes.at !== undefined ? wallClock(at, tz).date : entry.localDate,
    updatedAt: now,
  };
  await repo.upsertHydration(updated);
  return updated;
}

export async function removeWater(repo: Repository, id: string, now: number): Promise<HydrationEntry | null> {
  const entries = await repo.listHydration();
  const entry = entries.find((e) => e.id === id);
  if (!entry) return null;
  const removed = { ...entry, deletedAt: now, updatedAt: now };
  await repo.upsertHydration(removed);
  return removed;
}

export async function restoreWater(repo: Repository, id: string, now: number): Promise<HydrationEntry | null> {
  const entries = await repo.listHydration();
  const entry = entries.find((e) => e.id === id);
  if (!entry) return null;
  const restored = { ...entry, deletedAt: null, updatedAt: now };
  await repo.upsertHydration(restored);
  return restored;
}

export function goalOn(settings: Settings, date: LocalDate): number {
  return effectiveAt(settings.hydration.goalHistory, date) ?? 0;
}

export function withGoal(settings: Settings, goalMl: number, today: LocalDate): Settings {
  return { ...settings, hydration: { ...settings.hydration, goalHistory: withValueFrom(settings.hydration.goalHistory, today, goalMl) } };
}

export function totalFor(entries: readonly HydrationEntry[], date: LocalDate): number {
  return entries.filter((e) => e.deletedAt === null && e.localDate === date).reduce((sum, e) => sum + e.amountMl, 0);
}
