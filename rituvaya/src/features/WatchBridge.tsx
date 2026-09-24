import { useEffect, useMemo, useRef } from 'react';
import { addDays } from '@/domain/time/localDate';
import { useDay, useFormatContext, useIndexes, useNow, useStore, useToday } from '@/state/context';
import { parseWatchAction } from '@/watch/actions';
import { onWatchMessages, sendToWatch, watchSupported } from '@/watch/bridge';
import { buildWatchPayload } from '@/watch/payload';

/** Collapses a burst of changes (a group marked taken, a reload) into one transfer. */
const SEND_DEBOUNCE_MS = 400;

/**
 * Keeps the Apple Watch app in step with the phone: sends today's doses whenever
 * they change, and applies ticks coming back from the watch through the same
 * idempotent logging path as notification actions. Renders nothing, and does
 * nothing at all where there is no watch support (web, Android, Expo Go).
 */
export function WatchBridge() {
  const store = useStore();
  const today = useToday();
  // Today plus two days ahead (see WatchPayload). Hooks need a fixed count, so
  // the days are spelled out rather than looped.
  const day0 = useDay(today);
  const day1 = useDay(addDays(today, 1));
  const day2 = useDay(addDays(today, 2));
  const idx = useIndexes();
  const format = useFormatContext();
  const now = useNow();
  const lastSent = useRef<string | null>(null);

  const payload = useMemo(
    () =>
      buildWatchPayload({
        days: [day0, day1, day2].map((day) => ({ date: day.date, views: day.views })),
        itemsById: idx.itemsById,
        format,
        now,
      }),
    [day0, day1, day2, idx, format, now],
  );

  useEffect(() => {
    if (!watchSupported()) return;
    // generatedAt differs on every build; only a real change is worth a transfer.
    const signature = JSON.stringify({ ...payload, generatedAt: 0 });
    if (signature === lastSent.current) return;
    const timer = setTimeout(() => {
      if (sendToWatch(payload)) lastSent.current = signature;
    }, SEND_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [payload]);

  useEffect(() => {
    if (!watchSupported()) return;
    return onWatchMessages((raw) => {
      const action = parseWatchAction(raw);
      if (action) void store.applyWatchAction(action);
    });
  }, [store]);

  return null;
}
