/**
 * Calendar-date helpers that never touch the system time zone.
 * A LocalDate is an ISO string "YYYY-MM-DD" describing a wall-clock day.
 * All arithmetic runs on UTC-normalised timestamps so daylight-saving
 * transitions cannot shift a day.
 */
export type LocalDate = string;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isLocalDate(value: unknown): value is LocalDate {
  if (typeof value !== 'string') return false;
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match;
  const month = Number(m);
  const day = Number(d);
  if (month < 1 || month > 12) return false;
  return day >= 1 && day <= daysInMonth(Number(y), month);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function makeLocalDate(year: number, month: number, day: number): LocalDate {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function splitLocalDate(date: LocalDate): { year: number; month: number; day: number } {
  const match = ISO_DATE.exec(date);
  if (!match) throw new Error(`Invalid local date: ${date}`);
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

/** Days since 1970-01-01 for the calendar date (pure calendar arithmetic). */
export function dayNumber(date: LocalDate): number {
  const { year, month, day } = splitLocalDate(date);
  return Math.round(Date.UTC(year, month - 1, day) / 86_400_000);
}

export function fromDayNumber(n: number): LocalDate {
  const d = new Date(n * 86_400_000);
  return makeLocalDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return fromDayNumber(dayNumber(date) + days);
}

/** Signed number of calendar days from `a` to `b`. */
export function daysBetween(a: LocalDate, b: LocalDate): number {
  return dayNumber(b) - dayNumber(a);
}

export function compareLocalDates(a: LocalDate, b: LocalDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function maxLocalDate(a: LocalDate, b: LocalDate): LocalDate {
  return a >= b ? a : b;
}

export function minLocalDate(a: LocalDate, b: LocalDate): LocalDate {
  return a <= b ? a : b;
}

/** 0 = Sunday … 6 = Saturday (same convention as JavaScript Date). */
export function weekdayOf(date: LocalDate): number {
  const { year, month, day } = splitLocalDate(date);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function startOfMonth(date: LocalDate): LocalDate {
  const { year, month } = splitLocalDate(date);
  return makeLocalDate(year, month, 1);
}

export function endOfMonth(date: LocalDate): LocalDate {
  const { year, month } = splitLocalDate(date);
  return makeLocalDate(year, month, daysInMonth(year, month));
}

export function addMonths(date: LocalDate, months: number): LocalDate {
  const { year, month, day } = splitLocalDate(date);
  const total = year * 12 + (month - 1) + months;
  const newYear = Math.floor(total / 12);
  const newMonth = (total % 12) + 1;
  return makeLocalDate(newYear, newMonth, Math.min(day, daysInMonth(newYear, newMonth)));
}

/** Start of the week containing `date`, given the first weekday (0 = Sunday, 1 = Monday, 6 = Saturday). */
export function startOfWeek(date: LocalDate, weekStartsOn: number): LocalDate {
  const diff = (weekdayOf(date) - weekStartsOn + 7) % 7;
  return addDays(date, -diff);
}

export function* eachDay(from: LocalDate, to: LocalDate): Generator<LocalDate> {
  const start = dayNumber(from);
  const end = dayNumber(to);
  for (let n = start; n <= end; n += 1) yield fromDayNumber(n);
}

export function listDays(from: LocalDate, to: LocalDate): LocalDate[] {
  return Array.from(eachDay(from, to));
}
