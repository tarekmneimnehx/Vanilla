import type { Language, TimeFormat, VolumeUnit } from '@/domain/types';
import { fromMl } from '@/domain/hydration/units';
import { splitLocalDate, type LocalDate } from '@/domain/time/localDate';
import { minutesToTimeOfDay, wallClock } from '@/domain/time/clock';
import { formatNumberFor, localeFor, translate, translateList } from './index';

const cache = new Map<string, Intl.DateTimeFormat | null>();

function formatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat | null {
  const key = `${locale}|${JSON.stringify(options)}`;
  if (cache.has(key)) return cache.get(key) ?? null;
  let fmt: Intl.DateTimeFormat | null = null;
  try {
    fmt = new Intl.DateTimeFormat(locale, options);
  } catch {
    fmt = null;
  }
  cache.set(key, fmt);
  return fmt;
}

export interface FormatContext {
  language: Language;
  timeFormat: TimeFormat;
  tz: string;
  /** Device preference used when timeFormat is "system". */
  deviceUses24h: boolean;
}

export function uses24h(ctx: FormatContext): boolean {
  if (ctx.timeFormat === '24h') return true;
  if (ctx.timeFormat === '12h') return false;
  return ctx.deviceUses24h;
}

/** Formats a minutes-after-midnight value as a clock time. */
export function formatMinutes(minutes: number, ctx: FormatContext): string {
  const hour = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  const is24 = uses24h(ctx);
  const fmt = formatter(localeFor(ctx.language), { hour: is24 ? '2-digit' : 'numeric', minute: '2-digit', hour12: !is24, timeZone: 'UTC' });
  if (!fmt) return fallbackTime(hour, minute, ctx);
  try {
    return fmt.format(Date.UTC(2026, 0, 1, hour, minute));
  } catch {
    return fallbackTime(hour, minute, ctx);
  }
}

function fallbackTime(hour: number, minute: number, ctx: FormatContext): string {
  if (uses24h(ctx)) return minutesToTimeOfDay(hour * 60 + minute);
  const suffix = hour >= 12 ? translate(ctx.language, 'time.pm') : translate(ctx.language, 'time.am');
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

/** Formats an instant as a clock time in the context zone. */
export function formatTime(epochMs: number, ctx: FormatContext): string {
  const wc = wallClock(epochMs, ctx.tz);
  return formatMinutes(wc.minutes, ctx);
}

export type DateStyle = 'full' | 'long' | 'medium' | 'short' | 'weekday' | 'weekdayShort' | 'monthYear' | 'dayMonth';

const DATE_OPTIONS: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  long: { weekday: 'long', day: 'numeric', month: 'long' },
  medium: { day: 'numeric', month: 'long', year: 'numeric' },
  short: { day: 'numeric', month: 'short' },
  weekday: { weekday: 'long' },
  weekdayShort: { weekday: 'short' },
  monthYear: { month: 'long', year: 'numeric' },
  dayMonth: { day: 'numeric', month: 'long' },
};

export function formatLocalDate(date: LocalDate, style: DateStyle, language: Language): string {
  const { year, month, day } = splitLocalDate(date);
  const fmt = formatter(localeFor(language), { ...DATE_OPTIONS[style], timeZone: 'UTC' });
  const instant = Date.UTC(year, month - 1, day, 12);
  if (!fmt) return date;
  try {
    return fmt.format(instant);
  } catch {
    return date;
  }
}

export function formatInstantDate(epochMs: number, style: DateStyle, ctx: FormatContext): string {
  return formatLocalDate(wallClock(epochMs, ctx.tz).date, style, ctx.language);
}

/** Localised weekday names in JavaScript order (0 = Sunday). */
export function weekdayNames(language: Language, style: 'short' | 'long' | 'narrow'): readonly string[] {
  const fromTable = translateList(language, `weekdays.${style}` as never);
  if (fromTable.length === 7) return fromTable;
  return translateList('en', `weekdays.${style}` as never);
}

/** First day of the week for the language; Arabic and English (GB) default to Monday except Arabic (Saturday). */
export function weekStartsOn(language: Language): number {
  if (language === 'ar') return 6;
  return 1;
}

export function formatVolume(ml: number, unit: VolumeUnit, language: Language): string {
  const value = fromMl(ml, unit);
  const number = formatNumberFor(value, language, unit === 'ml' ? { maximumFractionDigits: 0 } : { maximumFractionDigits: 1 });
  const suffix = translate(language, unit === 'ml' ? 'hydration.unitShort.ml' : 'hydration.unitShort.floz');
  return `${number} ${suffix}`;
}

export function formatDuration(minutes: number, language: Language): string {
  if (minutes < 60) return translate(language, 'common.minutes', { count: minutes });
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hourText = translate(language, 'common.hours', { count: hours });
  return rest === 0 ? hourText : `${hourText} ${translate(language, 'common.minutes', { count: rest })}`;
}

export function formatRelative(target: number, now: number, language: Language): string {
  const diff = target - now;
  const minutes = Math.round(Math.abs(diff) / 60_000);
  if (minutes < 1) return translate(language, 'time.justNow');
  const duration = formatDuration(minutes, language);
  return diff > 0 ? translate(language, 'time.in', { duration }) : translate(language, 'time.ago', { duration });
}

export function formatAmount(amount: number, unit: string, language: Language): string {
  const number = formatNumberFor(amount, language, { maximumFractionDigits: 2 });
  return `${number} ${unit}`.trim();
}

/** Formats a percentage 0..100 already rounded. */
export function formatPercent(value: number, language: Language): string {
  return translate(language, 'common.percent', { value: Math.round(value) });
}
