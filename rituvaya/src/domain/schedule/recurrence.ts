import { addDays, daysBetween, weekdayOf, type LocalDate } from '../time/localDate';
import type { Recurrence, Schedule } from '../types';

/** True when the schedule definition (ignoring versions) produces doses on `date`. */
export function recursOn(recurrence: Recurrence, startDate: LocalDate, endDate: LocalDate | null, date: LocalDate): boolean {
  if (date < startDate) return false;
  if (endDate && date > endDate) return false;
  switch (recurrence.type) {
    case 'daily':
      return true;
    case 'weekdays':
      return (recurrence.weekdays as number[]).includes(weekdayOf(date));
    case 'interval': {
      const every = Math.max(1, Math.floor(recurrence.everyDays));
      return daysBetween(startDate, date) % every === 0;
    }
    case 'cycle': {
      const on = Math.max(1, Math.floor(recurrence.onDays));
      const off = Math.max(0, Math.floor(recurrence.offDays));
      const period = on + off;
      return daysBetween(startDate, date) % period < on;
    }
    case 'asNeeded':
      return false;
  }
}

/** The schedule version whose validity window contains `date`. */
export function versionOn(versions: readonly Schedule[], date: LocalDate): Schedule | null {
  for (const version of versions) {
    if (version.effectiveFrom > date) continue;
    if (version.effectiveTo !== null && version.effectiveTo <= date) continue;
    return version;
  }
  return null;
}

export function scheduleRecursOn(schedule: Schedule, date: LocalDate): boolean {
  if (schedule.effectiveFrom > date) return false;
  if (schedule.effectiveTo !== null && schedule.effectiveTo <= date) return false;
  return recursOn(schedule.recurrence, schedule.startDate, schedule.endDate, date);
}

/** The next date on or after `from` with a dose, scanning at most `limitDays` days. */
export function nextRecurrenceOnOrAfter(versions: readonly Schedule[], from: LocalDate, limitDays = 400): LocalDate | null {
  let date = from;
  for (let i = 0; i < limitDays; i += 1) {
    const version = versionOn(versions, date);
    if (version && scheduleRecursOn(version, date)) return date;
    date = addDays(date, 1);
  }
  return null;
}
