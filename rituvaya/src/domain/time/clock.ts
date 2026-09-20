/**
 * Wall-clock conversions for an explicit IANA time zone.
 *
 * Why not Intl.DateTimeFormat#formatToParts or Intl.PluralRules? Hermes (the
 * React Native engine) has shipped without them on some releases. We only use
 * `Intl.DateTimeFormat(...).format()` with a fixed en-US pattern and parse the
 * result, which is available on Hermes for both platforms. When the requested
 * zone is the device zone, plain Date getters are used, which need no Intl at all.
 */
import { LocalDate, makeLocalDate, splitLocalDate } from './localDate';

export interface WallClock {
  date: LocalDate;
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** minutes since local midnight */
  minutes: number;
  weekday: number; // 0 = Sunday
}

export type TimeOfDay = string; // "HH:mm"

const formatterCache = new Map<string, Intl.DateTimeFormat | null>();

let deviceTimeZoneOverride: string | null = null;

/** Allows the app (and tests) to pin the "device" zone explicitly. */
export function setDeviceTimeZone(tz: string | null): void {
  deviceTimeZoneOverride = tz;
}

export function getDeviceTimeZone(): string {
  if (deviceTimeZoneOverride) return deviceTimeZoneOverride;
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) return tz;
  } catch {
    // ignore, fall through
  }
  return 'UTC';
}

function getFormatter(tz: string): Intl.DateTimeFormat | null {
  if (formatterCache.has(tz)) return formatterCache.get(tz) ?? null;
  let formatter: Intl.DateTimeFormat | null = null;
  try {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    // Probe once so unsupported zones fail here and not later.
    formatter.format(0);
  } catch {
    formatter = null;
  }
  formatterCache.set(tz, formatter);
  return formatter;
}

const PARTS = /(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2}):(\d{2})/;

function localParts(epochMs: number): WallClock {
  const d = new Date(epochMs);
  return build(d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getDay());
}

function build(year: number, month: number, day: number, hour: number, minute: number, second: number, weekday: number): WallClock {
  return {
    date: makeLocalDate(year, month, day),
    year,
    month,
    day,
    hour,
    minute,
    second,
    minutes: hour * 60 + minute,
    weekday,
  };
}

/** Wall clock of an instant in the given zone. Falls back to the device zone when Intl cannot handle `tz`. */
export function wallClock(epochMs: number, tz: string): WallClock {
  if (!Number.isFinite(epochMs)) throw new Error('wallClock: invalid timestamp');
  if (tz === getDeviceTimeZone()) return localParts(epochMs);
  const formatter = getFormatter(tz);
  if (!formatter) return localParts(epochMs);
  const text = formatter.format(new Date(epochMs));
  const m = PARTS.exec(text);
  if (!m) return localParts(epochMs);
  const month = Number(m[1]);
  const day = Number(m[2]);
  const year = Number(m[3]);
  const hour = Number(m[4]) % 24; // some engines print 24 for midnight
  const minute = Number(m[5]);
  const second = Number(m[6]);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return build(year, month, day, hour, minute, second, weekday);
}

/** Offset (ms) of `tz` from UTC at the given instant: local = utc + offset. */
export function offsetAt(epochMs: number, tz: string): number {
  const wc = wallClock(epochMs, tz);
  const asUtc = Date.UTC(wc.year, wc.month - 1, wc.day, wc.hour, wc.minute, wc.second);
  return asUtc - Math.floor(epochMs / 1000) * 1000;
}

/**
 * Instant for a wall-clock time in `tz`. Handles daylight-saving gaps by
 * moving forward to the first valid instant and ambiguities by taking the
 * earlier instant, which matches how most alarm clocks behave.
 */
export function epochFor(date: LocalDate, minutes: number, tz: string, seconds = 0): number {
  const { year, month, day } = splitLocalDate(date);
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  if (tz === getDeviceTimeZone() || !getFormatter(tz)) {
    const local = new Date(year, month - 1, day, hour, minute, seconds, 0);
    return local.getTime();
  }
  const naive = Date.UTC(year, month - 1, day, hour, minute, seconds);
  const offset1 = offsetAt(naive, tz);
  const guess1 = naive - offset1;
  const offset2 = offsetAt(guess1, tz);
  if (offset1 === offset2) {
    if (matches(guess1, tz, year, month, day, hour, minute)) return guess1;
  }
  const guess2 = naive - offset2;
  const ok1 = matches(guess1, tz, year, month, day, hour, minute);
  const ok2 = matches(guess2, tz, year, month, day, hour, minute);
  if (ok1 && ok2) return Math.min(guess1, guess2); // ambiguous (clocks went back): earlier instant
  if (ok1) return guess1;
  if (ok2) return guess2;
  // Gap (clocks went forward): land just after the gap, as alarm clocks do.
  return Math.max(guess1, guess2);
}

function matches(epochMs: number, tz: string, year: number, month: number, day: number, hour: number, minute: number): boolean {
  const wc = wallClock(epochMs, tz);
  return wc.year === year && wc.month === month && wc.day === day && wc.hour === hour && wc.minute === minute;
}

export function todayIn(tz: string, now: number = Date.now()): LocalDate {
  return wallClock(now, tz).date;
}

export function parseTimeOfDay(value: TimeOfDay): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) throw new Error(`Invalid time of day: ${value}`);
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) throw new Error(`Invalid time of day: ${value}`);
  return h * 60 + min;
}

export function isTimeOfDay(value: unknown): value is TimeOfDay {
  if (typeof value !== 'string') return false;
  try {
    parseTimeOfDay(value);
    return true;
  } catch {
    return false;
  }
}

export function minutesToTimeOfDay(minutes: number): TimeOfDay {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`;
}

/** Start of the local day (midnight) as an instant. */
export function startOfDayEpoch(date: LocalDate, tz: string): number {
  return epochFor(date, 0, tz);
}

/** True when `minutes` lies in the window [start, end), which may wrap past midnight. */
export function inWindow(minutes: number, start: number, end: number): boolean {
  if (start === end) return false;
  if (start < end) return minutes >= start && minutes < end;
  return minutes >= start || minutes < end;
}
