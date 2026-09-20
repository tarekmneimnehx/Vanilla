import type { Dated } from './types';
import type { LocalDate } from './time/localDate';

/** Value in force on `date`: the latest entry whose effectiveFrom <= date, else the earliest entry. */
export function effectiveAt<T>(history: Dated<T>[], date: LocalDate): T | null {
  if (history.length === 0) return null;
  const sorted = [...history].sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? -1 : a.effectiveFrom > b.effectiveFrom ? 1 : 0));
  let result: Dated<T> = sorted[0];
  for (const entry of sorted) {
    if (entry.effectiveFrom <= date) result = entry;
    else break;
  }
  return result.value;
}

/** Records a new value from `date` on, replacing an entry that already starts on the same day. */
export function withValueFrom<T>(history: Dated<T>[], date: LocalDate, value: T): Dated<T>[] {
  const kept = history.filter((entry) => entry.effectiveFrom !== date);
  return [...kept, { effectiveFrom: date, value }].sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? -1 : 1));
}

export function latestValue<T>(history: Dated<T>[]): T | null {
  if (history.length === 0) return null;
  return history.reduce((acc, entry) => (entry.effectiveFrom > acc.effectiveFrom ? entry : acc)).value;
}
