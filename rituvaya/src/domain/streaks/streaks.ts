import type { LocalDate } from '../time/localDate';

export interface TrackingDay {
  date: LocalDate;
  scheduled: number;
  /** Occurrences with an explicit final record: taken, skipped or confirmed missed. */
  recorded: number;
  taken: number;
}

export interface HydrationDay {
  date: LocalDate;
  totalMl: number;
  goalMl: number;
}

/**
 * Tracking streak: consecutive days, ending today or yesterday, on which every
 * scheduled dose has an explicit final record. Days without doses are neutral.
 * Today never breaks the streak while it is still in progress.
 */
export function trackingStreak(days: readonly TrackingDay[], today: LocalDate): number {
  const sorted = [...days].filter((d) => d.date <= today).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  let streak = 0;
  for (const day of sorted) {
    if (day.scheduled === 0) continue;
    const complete = day.recorded >= day.scheduled;
    if (complete) {
      streak += 1;
      continue;
    }
    if (day.date === today) continue; // in progress
    break;
  }
  return streak;
}

/** Hydration streak: consecutive days on which the goal in force that day was reached. */
export function hydrationStreak(days: readonly HydrationDay[], today: LocalDate): number {
  const sorted = [...days].filter((d) => d.date <= today).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  let streak = 0;
  for (const day of sorted) {
    if (day.goalMl <= 0) continue;
    if (day.totalMl >= day.goalMl) {
      streak += 1;
      continue;
    }
    if (day.date === today) continue;
    break;
  }
  return streak;
}

export interface CompletionSummary {
  scheduled: number;
  taken: number;
  skipped: number;
  missed: number;
  unrecorded: number;
  /** taken / scheduled, 0..1; null when nothing was scheduled. */
  takenRatio: number | null;
  /** recorded / scheduled, 0..1; null when nothing was scheduled. */
  recordedRatio: number | null;
}

export function summarize(counts: { scheduled: number; taken: number; skipped: number; missed: number }): CompletionSummary {
  const recorded = counts.taken + counts.skipped + counts.missed;
  const unrecorded = Math.max(0, counts.scheduled - recorded);
  return {
    ...counts,
    unrecorded,
    takenRatio: counts.scheduled > 0 ? counts.taken / counts.scheduled : null,
    recordedRatio: counts.scheduled > 0 ? Math.min(1, recorded / counts.scheduled) : null,
  };
}
