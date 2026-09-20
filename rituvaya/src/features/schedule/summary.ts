import { anchorsOn, resolveSlotMinutes } from '@/domain/schedule/slots';
import type { LocalDate } from '@/domain/time/localDate';
import type { Anchors, Dated, Language, RoutineGroup, Schedule, TimeSlot } from '@/domain/types';
import { translate, type TranslationKey } from '@/i18n';
import { formatDuration, formatLocalDate, formatMinutes, weekdayNames, type FormatContext } from '@/i18n/format';

export interface SummaryContext {
  language: Language;
  format: FormatContext;
  anchorHistory: Dated<Anchors>[];
  groupsById: ReadonlyMap<string, RoutineGroup>;
  today: LocalDate;
}

/** Human-readable label for one time slot, e.g. "08:00", "30 min after breakfast", "Morning (08:30)". */
export function slotLabel(slot: TimeSlot, ctx: SummaryContext): string {
  const { language } = ctx;
  switch (slot.kind) {
    case 'exact':
      return formatMinutes(resolveSlotMinutes(slot, ctx.today, ctx) ?? 0, ctx.format);
    case 'anchor': {
      const anchor = translate(language, `schedule.anchors.${slot.anchor}` as TranslationKey);
      const minutes = resolveSlotMinutes(slot, ctx.today, ctx);
      const time = minutes === null ? '' : ` (${formatMinutes(minutes, ctx.format)})`;
      if (slot.offsetMinutes === 0) return `${translate(language, 'schedule.withAnchor', { anchor })}${time}`;
      const duration = formatDuration(Math.abs(slot.offsetMinutes), language);
      const rel = slot.offsetMinutes < 0 ? translate(language, 'schedule.offsetBefore', { duration }) : translate(language, 'schedule.offsetAfter', { duration });
      return `${rel} ${anchor}${time}`;
    }
    case 'group': {
      const group = ctx.groupsById.get(slot.groupId);
      if (!group) return translate(language, 'schedule.group');
      const minutes = resolveSlotMinutes(slot, ctx.today, ctx);
      return minutes === null ? group.name : `${group.name} (${formatMinutes(minutes, ctx.format)})`;
    }
  }
}

export function recurrenceLabel(schedule: Pick<Schedule, 'recurrence' | 'endDate' | 'startDate'>, ctx: SummaryContext): string {
  const { language } = ctx;
  const r = schedule.recurrence;
  let text: string;
  switch (r.type) {
    case 'daily':
      text = translate(language, 'schedule.summary.daily');
      break;
    case 'weekdays': {
      const names = weekdayNames(language, 'short');
      const days = [...r.weekdays].sort((a, b) => a - b).map((d) => names[d]).join(', ');
      text = translate(language, 'schedule.summary.weekdays', { days });
      break;
    }
    case 'interval':
      text = r.everyDays === 2 ? translate(language, 'schedule.summary.everyOtherDay') : translate(language, 'schedule.summary.interval', { count: r.everyDays });
      break;
    case 'cycle':
      text = translate(language, 'schedule.summary.cycle', { on: r.onDays, off: r.offDays });
      break;
    case 'asNeeded':
      text = translate(language, 'schedule.summary.asNeeded');
      break;
  }
  if (schedule.startDate > ctx.today) text += ` · ${translate(language, 'schedule.summary.from', { date: formatLocalDate(schedule.startDate, 'short', language) })}`;
  if (schedule.endDate) text += ` · ${translate(language, 'schedule.summary.until', { date: formatLocalDate(schedule.endDate, 'short', language) })}`;
  return text;
}

export function scheduleSummary(schedule: Schedule, ctx: SummaryContext): string {
  const recurrence = recurrenceLabel(schedule, ctx);
  if (schedule.recurrence.type === 'asNeeded' || schedule.slots.length === 0) return recurrence;
  const times = schedule.slots
    .map((slot) => ({ slot, minutes: resolveSlotMinutes(slot, ctx.today, ctx) ?? 0 }))
    .sort((a, b) => a.minutes - b.minutes)
    .map(({ slot }) => (slot.kind === 'exact' ? slotLabel(slot, ctx) : slotLabel(slot, ctx)))
    .join(', ');
  return `${recurrence} · ${translate(ctx.language, 'schedule.summary.at', { times })}`;
}

export function anchorTime(anchorHistory: Dated<Anchors>[], key: keyof Anchors, today: LocalDate): string | null {
  return anchorsOn(anchorHistory, today)[key];
}
