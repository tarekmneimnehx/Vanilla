import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useI18n } from '@/i18n';
import { formatTime } from '@/i18n/format';
import { addResponseListener, consumeLaunchResponse, notificationsSupported, type ResponseEvent } from '@/notifications/adapter';
import { useFormatContext, useStore } from '@/state/context';
import { useToast } from '@/ui/components/Toast';

/**
 * Routes notification taps and action buttons into the store. Actions are
 * applied idempotently; the toast offers Undo for taken/skip.
 */
export function NotificationBridge() {
  const store = useStore();
  const router = useRouter();
  const toast = useToast();
  const { t } = useI18n();
  const format = useFormatContext();
  const latest = useRef({ t, format, toast });
  latest.current = { t, format, toast };

  useEffect(() => {
    if (!notificationsSupported) return;
    const handle = async (event: ResponseEvent) => {
      const { t: tr, format: fmt, toast: tst } = latest.current;
      const outcome = await store.handleResponse(event, {
        taken: (count) => tr('dose.undoGroup', { count }),
        skipped: (count) => (count === 1 ? tr('dose.undoSkipped') : tr('dose.undoGroup', { count })),
        snoozed: (time) => tr('dose.undoSnooze', { time: formatTime(time, fmt) }),
        tonight: (time) => tr('dose.undoRemind', { time: formatTime(time, fmt) }),
      });
      if (outcome.toast) {
        tst.show({ message: outcome.toast.message, actionLabel: outcome.toast.undo ? tr('common.undo') : undefined, onAction: outcome.toast.undo, icon: 'check' });
      }
      if (outcome.route) router.push(outcome.route as never);
    };
    void consumeLaunchResponse().then((event) => event && handle(event));
    return addResponseListener((event) => void handle(event));
  }, [store, router]);

  return null;
}
