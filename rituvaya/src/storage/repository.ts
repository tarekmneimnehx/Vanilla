import type { DoseLog, HydrationEntry, Item, OccurrenceState, RoutineGroup, Schedule, Settings } from '@/domain/types';
import type { LocalDate } from '@/domain/time/localDate';

export interface ScheduledNotificationRecord {
  id: string;
  nativeId: string;
  fireAt: number;
  kind: 'dose' | 'hydration';
  occurrenceKeys: string[];
  createdAt: number;
}

export interface ExportBundle {
  app: 'rituvaya';
  format: 1;
  exportedAt: string;
  settings: Settings | null;
  items: Item[];
  schedules: Schedule[];
  groups: RoutineGroup[];
  occurrenceStates: OccurrenceState[];
  doseLogs: DoseLog[];
  hydrationEntries: HydrationEntry[];
}

export interface DateRange {
  from: LocalDate;
  to: LocalDate;
}

/**
 * Persistence boundary. Everything the app stores goes through here so the
 * SQLite implementation (device) and the in-memory implementation (tests, web
 * preview) stay interchangeable and a sync layer can be added later.
 */
export interface Repository {
  readonly kind: 'sqlite' | 'memory';
  init(): Promise<void>;
  close(): Promise<void>;

  getSettings(): Promise<Settings | null>;
  saveSettings(settings: Settings): Promise<void>;

  listItems(): Promise<Item[]>;
  getItem(id: string): Promise<Item | null>;
  upsertItem(item: Item): Promise<void>;

  listSchedules(): Promise<Schedule[]>;
  upsertSchedule(schedule: Schedule): Promise<void>;

  listGroups(): Promise<RoutineGroup[]>;
  upsertGroup(group: RoutineGroup): Promise<void>;

  listOccurrenceStates(): Promise<OccurrenceState[]>;
  upsertOccurrenceState(state: OccurrenceState): Promise<void>;
  deleteOccurrenceState(key: string): Promise<void>;

  listLogs(range?: DateRange): Promise<DoseLog[]>;
  getLog(id: string): Promise<DoseLog | null>;
  upsertLog(log: DoseLog): Promise<void>;

  listHydration(range?: DateRange): Promise<HydrationEntry[]>;
  upsertHydration(entry: HydrationEntry): Promise<void>;

  listScheduledNotifications(): Promise<ScheduledNotificationRecord[]>;
  upsertScheduledNotification(record: ScheduledNotificationRecord): Promise<void>;
  deleteScheduledNotification(id: string): Promise<void>;
  clearScheduledNotifications(): Promise<void>;

  exportAll(): Promise<ExportBundle>;
  deleteAll(): Promise<void>;
  deleteDemoData(): Promise<void>;
}
