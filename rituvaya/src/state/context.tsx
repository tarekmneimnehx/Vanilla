import React, { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { buildDay, buildIndexes, computeStreaks, type DayModel, type Indexes, type Streaks } from '@/domain/services/queries';
import type { LocalDate } from '@/domain/time/localDate';
import { wallClock } from '@/domain/time/clock';
import type { FormatContext } from '@/i18n/format';
import type { AppStore, StoreSnapshot } from './store';

const StoreContext = createContext<AppStore | null>(null);

export function StoreProvider({ store, children }: { store: AppStore; children: React.ReactNode }) {
  useEffect(() => {
    const sub = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (status === 'active') void store.onForeground();
    });
    return () => sub.remove();
  }, [store]);
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): AppStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error('StoreProvider missing');
  return store;
}

export function useSnapshot(): StoreSnapshot {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

/** A ticking "now" so time-based statuses refresh without user interaction. */
export function useNow(intervalMs = 30_000): number {
  const store = useStore();
  const [now, setNow] = useState(() => store.now());
  useEffect(() => {
    const id = setInterval(() => setNow(store.now()), intervalMs);
    const sub = AppState.addEventListener('change', (status) => {
      if (status === 'active') setNow(store.now());
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [intervalMs, store]);
  return now;
}

export function useIndexes(): Indexes {
  const snapshot = useSnapshot();
  return useMemo(() => buildIndexes(snapshot), [snapshot]);
}

export function useToday(): LocalDate {
  const snapshot = useSnapshot();
  const now = useNow();
  return wallClock(now, snapshot.tz).date;
}

export function useDay(date: LocalDate): DayModel {
  const snapshot = useSnapshot();
  const idx = useIndexes();
  const now = useNow();
  return useMemo(() => buildDay(snapshot, idx, date, now), [snapshot, idx, date, now]);
}

export function useStreaks(): Streaks {
  const snapshot = useSnapshot();
  const idx = useIndexes();
  const today = useToday();
  const now = useNow(60_000);
  return useMemo(() => computeStreaks(snapshot, idx, today, now), [snapshot, idx, today, now]);
}

export function useFormatContext(): FormatContext {
  const store = useStore();
  const snapshot = useSnapshot();
  return useMemo(() => store.formatContext(), [store, snapshot.settings.language, snapshot.settings.timeFormat, snapshot.tz]);
}
