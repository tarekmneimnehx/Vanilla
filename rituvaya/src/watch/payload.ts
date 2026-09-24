import type { OccurrenceView } from '@/domain/logging/status';
import type { LocalDate } from '@/domain/time/localDate';
import type { Item, OccurrenceStatus } from '@/domain/types';
import { isRTL, translate } from '@/i18n';
import { formatItemDose, formatStrength } from '@/i18n/dose';
import { formatTime, type FormatContext } from '@/i18n/format';

/**
 * What the phone sends the watch: today's doses, already worded in the user's
 * language, so the watch app renders strings and never re-derives schedules.
 *
 * WatchConnectivity carries property lists only, so every field is a string,
 * number, boolean, array or object — never null or undefined, which would make
 * the transfer throw.
 */

/** Bump when the shape changes; the watch ignores payloads newer than it understands. */
export const WATCH_PAYLOAD_VERSION = 1;

export type WatchDoseStatus = 'upcoming' | 'due' | 'overdue' | 'taken';

export interface WatchDose {
  /** Occurrence key: the identity the watch sends back when a dose is ticked. */
  key: string;
  name: string;
  /** Amount plus strength when known, e.g. "2 capsules · 1000 IU". */
  size: string;
  time: string;
  at: number;
  status: WatchDoseStatus;
  medication: boolean;
}

export interface WatchLabels {
  title: string;
  /** Shown when the watch has no list for its current day, i.e. the phone app hasn't run for a while. */
  openPhone: string;
  empty: string;
  allDone: string;
  /** Contains {done} and {total}; the watch fills them in as doses are ticked. */
  progress: string;
  taken: string;
  takenAll: string;
  skip: string;
  snooze: string;
  tonight: string;
}

export interface WatchDay {
  date: LocalDate;
  doses: WatchDose[];
}

/**
 * Today and the next two days, not just today: the phone only runs this while
 * its app is open, so a watch that knew only "today" would go blank on any
 * morning the phone app hadn't been opened yet. The watch picks the day that
 * matches its own clock.
 */
export interface WatchPayload {
  v: number;
  generatedAt: number;
  rtl: boolean;
  labels: WatchLabels;
  days: WatchDay[];
}

export interface WatchPayloadInput {
  days: readonly { date: LocalDate; views: readonly OccurrenceView[] }[];
  itemsById: ReadonlyMap<string, Item>;
  format: FormatContext;
  now: number;
}

/**
 * Skipped and missed doses are dropped: the watch is a list of what is still to
 * take plus what has been ticked, not a history view.
 */
export function watchStatus(status: OccurrenceStatus): WatchDoseStatus | null {
  switch (status) {
    case 'upcoming':
      return 'upcoming';
    case 'due':
    case 'snoozed':
      return 'due';
    case 'overdue':
    case 'autoMissed':
      return 'overdue';
    case 'taken':
      return 'taken';
    case 'skipped':
    case 'missed':
      return null;
  }
}

export function doseSize(item: Item, language: FormatContext['language']): string {
  const strength = formatStrength(item, language);
  const amount = formatItemDose(item, language);
  return strength ? `${amount} · ${strength}` : amount;
}

function watchDoses(views: readonly OccurrenceView[], itemsById: ReadonlyMap<string, Item>, format: FormatContext): WatchDose[] {
  const { language } = format;
  const doses: WatchDose[] = [];
  for (const view of views) {
    const status = watchStatus(view.status);
    const item = itemsById.get(view.occurrence.itemId);
    if (!status || !item) continue;
    doses.push({
      key: view.occurrence.key,
      name: item.displayName,
      size: doseSize(item, language),
      time: formatTime(view.occurrence.scheduledAt, format),
      at: view.occurrence.scheduledAt,
      status,
      medication: item.kind === 'medication',
    });
  }
  doses.sort((a, b) => a.at - b.at || a.name.localeCompare(b.name));
  return doses;
}

export function buildWatchPayload({ days, itemsById, format, now }: WatchPayloadInput): WatchPayload {
  const { language } = format;
  return {
    v: WATCH_PAYLOAD_VERSION,
    generatedAt: now,
    rtl: isRTL(language),
    labels: {
      title: translate(language, 'watch.title'),
      openPhone: translate(language, 'watch.openPhone'),
      empty: translate(language, 'watch.empty'),
      allDone: translate(language, 'watch.allDone'),
      progress: translate(language, 'watch.progress'),
      taken: translate(language, 'notifications.actions.taken'),
      takenAll: translate(language, 'notifications.actions.takenAll'),
      skip: translate(language, 'notifications.actions.skip'),
      snooze: translate(language, 'notifications.actions.snooze'),
      tonight: translate(language, 'notifications.actions.remindTonight'),
    },
    days: days.map((day) => ({ date: day.date, doses: watchDoses(day.views, itemsById, format) })),
  };
}
