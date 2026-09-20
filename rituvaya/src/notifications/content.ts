import type { OccurrenceView } from '@/domain/logging/status';
import type { PlannedNotification } from '@/domain/notifications/planner';
import { describeDose } from '@/domain/services/loggingService';
import type { Item, Language } from '@/domain/types';
import { translate } from '@/i18n';
import { formatTime, type FormatContext } from '@/i18n/format';

export interface NotificationText {
  title: string;
  body: string;
}

export interface ContentContext {
  itemsById: ReadonlyMap<string, Item>;
  viewsByKey: ReadonlyMap<string, OccurrenceView>;
  language: Language;
  format: FormatContext;
  discreet: boolean;
}

export const CATEGORY_DOSE = 'rituvaya.dose';
export const CATEGORY_DOSE_MULTI = 'rituvaya.dose.multi';
export const CATEGORY_HYDRATION = 'rituvaya.hydration';

export const ACTION_TAKEN = 'taken';
export const ACTION_SNOOZE = 'snooze';
export const ACTION_SKIP = 'skip';
export const ACTION_TONIGHT = 'tonight';
export const ACTION_LOG_WATER = 'log-water';

export interface NotificationPayload {
  kind: 'dose' | 'hydration' | 'test';
  plannedId: string;
  occurrenceKeys: string[];
}

/** Human-readable text for a planned notification, honouring discreet mode. */
export function notificationText(plan: PlannedNotification, ctx: ContentContext): NotificationText {
  const { language } = ctx;
  if (plan.kind === 'hydration') {
    return { title: translate(language, 'notifications.dose.hydrationTitle'), body: translate(language, 'notifications.dose.hydrationBody') };
  }
  const views = plan.occurrenceKeys.map((key) => ctx.viewsByKey.get(key)).filter((v): v is OccurrenceView => Boolean(v));
  const count = Math.max(1, plan.occurrenceKeys.length);
  if (ctx.discreet) {
    return { title: translate(language, 'notifications.dose.discreetTitle'), body: translate(language, 'notifications.dose.discreetBody', { count }) };
  }
  const names = views.map((v) => ctx.itemsById.get(v.occurrence.itemId)?.displayName ?? '').filter(Boolean);
  if (views.length <= 1) {
    const view = views[0];
    const item = view ? ctx.itemsById.get(view.occurrence.itemId) : undefined;
    const name = item?.displayName ?? names[0] ?? '';
    const dose = item ? describeDose(item) : '';
    const time = view ? formatTime(view.occurrence.scheduledAt, ctx.format) : '';
    let title: string;
    if (plan.repeatIndex === -1) {
      title = view?.state?.remindAt ? translate(language, 'notifications.dose.tonightTitle') : translate(language, 'notifications.dose.snoozedTitle');
      return { title, body: `${name} · ${dose}`.trim() };
    }
    title = plan.repeatIndex > 0 ? translate(language, 'notifications.dose.repeatTitleOne', { name }) : translate(language, 'notifications.dose.titleOne', { name });
    return { title, body: translate(language, 'notifications.dose.bodyOne', { dose, time }) };
  }
  const title = plan.repeatIndex > 0 ? translate(language, 'notifications.dose.repeatTitleMany', { count }) : translate(language, 'notifications.dose.titleMany', { count });
  return { title, body: translate(language, 'notifications.dose.bodyMany', { names: names.join(', ') }) };
}

export function categoryFor(plan: PlannedNotification): string {
  if (plan.kind === 'hydration') return CATEGORY_HYDRATION;
  return plan.occurrenceKeys.length > 1 ? CATEGORY_DOSE_MULTI : CATEGORY_DOSE;
}

export function payloadFor(plan: PlannedNotification): NotificationPayload {
  return { kind: plan.kind, plannedId: plan.id, occurrenceKeys: plan.occurrenceKeys };
}

export function parsePayload(data: unknown): NotificationPayload | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  const kind = obj.kind;
  if (kind !== 'dose' && kind !== 'hydration' && kind !== 'test') return null;
  const keys = Array.isArray(obj.occurrenceKeys) ? obj.occurrenceKeys.filter((k): k is string => typeof k === 'string') : [];
  return { kind, plannedId: typeof obj.plannedId === 'string' ? obj.plannedId : '', occurrenceKeys: keys };
}
