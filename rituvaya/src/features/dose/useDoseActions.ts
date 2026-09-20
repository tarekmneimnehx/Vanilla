import { useCallback, useMemo } from 'react';
import type { OccurrenceView } from '@/domain/logging/status';
import type { Item } from '@/domain/types';
import { useI18n } from '@/i18n';
import { formatDuration, formatTime } from '@/i18n/format';
import { useFormatContext, useStore } from '@/state/context';
import { haptic } from '@/ui/haptics';
import { useToast } from '@/ui/components/Toast';

export interface TakenOptions {
  at?: number;
  amount?: number | null;
  unit?: string | null;
  note?: string | null;
}

/** Shared dose actions with immediate toast + undo feedback. */
export function useDoseActions() {
  const store = useStore();
  const toast = useToast();
  const { t } = useI18n();
  const format = useFormatContext();

  const take = useCallback(
    async (view: OccurrenceView, options: TakenOptions = {}) => {
      const result = await store.record({ occurrence: view.occurrence, action: 'taken', source: 'app', ...options });
      haptic.success();
      toast.show({
        message: t('dose.undoTaken'),
        icon: 'check',
        actionLabel: t('common.undo'),
        onAction: async () => {
          await store.undo(result.log.id);
          haptic.tap();
        },
      });
      return result;
    },
    [store, toast, t],
  );

  const skip = useCallback(
    async (view: OccurrenceView, reason?: string | null, note?: string | null) => {
      const result = await store.record({ occurrence: view.occurrence, action: 'skipped', reason: reason ?? null, note: note ?? null, source: 'app' });
      haptic.select();
      toast.show({ message: t('dose.undoSkipped'), icon: 'minus-circle', actionLabel: t('common.undo'), onAction: () => store.undo(result.log.id) });
      return result;
    },
    [store, toast, t],
  );

  const markMissed = useCallback(
    async (view: OccurrenceView) => {
      const result = await store.record({ occurrence: view.occurrence, action: 'missed', source: 'app' });
      haptic.select();
      toast.show({ message: t('dose.undoMissed'), icon: 'x-circle', actionLabel: t('common.undo'), onAction: () => store.undo(result.log.id) });
      return result;
    },
    [store, toast, t],
  );

  const snooze = useCallback(
    async (view: OccurrenceView, minutes?: number) => {
      const until = await store.snooze(view.occurrence.key, minutes);
      haptic.select();
      toast.show({ message: t('dose.undoSnooze', { time: formatTime(until, format) }), icon: 'clock', actionLabel: t('common.undo'), onAction: () => store.clearState(view.occurrence.key) });
      return until;
    },
    [store, toast, t, format],
  );

  const remindTonight = useCallback(
    async (view: OccurrenceView) => {
      const target = await store.remindTonight(view.occurrence.key);
      haptic.select();
      const time = formatTime(target.at, format);
      const message = target.usedFallback ? t('dose.remindTonightPassed', { duration: formatDuration(60, format.language), time }) : t('dose.undoRemind', { time });
      toast.show({ message, icon: 'moon', actionLabel: t('common.undo'), onAction: () => store.clearState(view.occurrence.key), durationMs: target.usedFallback ? 8000 : undefined });
      return target;
    },
    [store, toast, t, format],
  );

  const takeAll = useCallback(
    async (views: OccurrenceView[]) => {
      const logs = await store.takeAll(views, 'group');
      if (logs.length > 0) haptic.success();
      toast.show({
        message: t('dose.undoGroup', { count: logs.length }),
        icon: 'check-circle',
        actionLabel: logs.length ? t('common.undo') : undefined,
        onAction: logs.length ? () => store.undoMany(logs.map((l) => l.id)) : undefined,
      });
      return logs;
    },
    [store, toast, t],
  );

  const recordExtra = useCallback(
    async (item: Item, options: TakenOptions = {}) => {
      const log = await store.recordExtra(item, options);
      haptic.success();
      toast.show({ message: t('dose.undoTaken'), icon: 'check', actionLabel: t('common.undo'), onAction: () => store.undo(log.id) });
      return log;
    },
    [store, toast, t],
  );

  return useMemo(() => ({ take, skip, markMissed, snooze, remindTonight, takeAll, recordExtra }), [take, skip, markMissed, snooze, remindTonight, takeAll, recordExtra]);
}
