import type { DoseLog, HydrationEntry, Item, OccurrenceState, RoutineGroup, Schedule, Settings } from '@/domain/types';
import type { DateRange, ExportBundle, Repository, ScheduledNotificationRecord } from './repository';

interface Snapshot {
  settings: Settings | null;
  items: Item[];
  schedules: Schedule[];
  groups: RoutineGroup[];
  occurrenceStates: OccurrenceState[];
  doseLogs: DoseLog[];
  hydrationEntries: HydrationEntry[];
  notifications: ScheduledNotificationRecord[];
}

export interface MemoryPersistence {
  load(): Promise<string | null> | string | null;
  save(json: string): Promise<void> | void;
}

function inRange(date: string, range?: DateRange): boolean {
  if (!range) return true;
  return date >= range.from && date <= range.to;
}

/** JSON clone: records are plain data, and structuredClone is not available on every JS engine. */
function structuredClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * In-memory repository with optional JSON persistence (used for tests and for
 * the web preview, where it is backed by localStorage).
 */
export class MemoryRepository implements Repository {
  readonly kind = 'memory' as const;
  private settings: Settings | null = null;
  private items = new Map<string, Item>();
  private schedules = new Map<string, Schedule>();
  private groups = new Map<string, RoutineGroup>();
  private states = new Map<string, OccurrenceState>();
  private logs = new Map<string, DoseLog>();
  private hydration = new Map<string, HydrationEntry>();
  private notifications = new Map<string, ScheduledNotificationRecord>();

  constructor(private readonly persistence: MemoryPersistence | null = null) {}

  async init(): Promise<void> {
    if (!this.persistence) return;
    const raw = await this.persistence.load();
    if (!raw) return;
    try {
      const snap = JSON.parse(raw) as Partial<Snapshot>;
      this.settings = snap.settings ?? null;
      for (const x of snap.items ?? []) this.items.set(x.id, x);
      for (const x of snap.schedules ?? []) this.schedules.set(x.id, x);
      for (const x of snap.groups ?? []) this.groups.set(x.id, x);
      for (const x of snap.occurrenceStates ?? []) this.states.set(x.key, x);
      for (const x of snap.doseLogs ?? []) this.logs.set(x.id, x);
      for (const x of snap.hydrationEntries ?? []) this.hydration.set(x.id, x);
      for (const x of snap.notifications ?? []) this.notifications.set(x.id, x);
    } catch {
      // A corrupt snapshot must not block the app; start empty.
    }
  }

  async close(): Promise<void> {
    await this.flush();
  }

  private async flush(): Promise<void> {
    if (!this.persistence) return;
    const snapshot: Snapshot = {
      settings: this.settings,
      items: [...this.items.values()],
      schedules: [...this.schedules.values()],
      groups: [...this.groups.values()],
      occurrenceStates: [...this.states.values()],
      doseLogs: [...this.logs.values()],
      hydrationEntries: [...this.hydration.values()],
      notifications: [...this.notifications.values()],
    };
    await this.persistence.save(JSON.stringify(snapshot));
  }

  async getSettings(): Promise<Settings | null> {
    return this.settings ? structuredClone(this.settings) : null;
  }

  async saveSettings(settings: Settings): Promise<void> {
    this.settings = structuredClone(settings);
    await this.flush();
  }

  async listItems(): Promise<Item[]> {
    return [...this.items.values()].map((x) => structuredClone(x)).sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt);
  }

  async getItem(id: string): Promise<Item | null> {
    const item = this.items.get(id);
    return item ? structuredClone(item) : null;
  }

  async upsertItem(item: Item): Promise<void> {
    this.items.set(item.id, structuredClone(item));
    await this.flush();
  }

  async listSchedules(): Promise<Schedule[]> {
    return [...this.schedules.values()].map((x) => structuredClone(x)).sort((a, b) => (b.effectiveFrom > a.effectiveFrom ? 1 : b.effectiveFrom < a.effectiveFrom ? -1 : b.createdAt - a.createdAt));
  }

  async upsertSchedule(schedule: Schedule): Promise<void> {
    this.schedules.set(schedule.id, structuredClone(schedule));
    await this.flush();
  }

  async listGroups(): Promise<RoutineGroup[]> {
    return [...this.groups.values()].map((x) => structuredClone(x)).sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt);
  }

  async upsertGroup(group: RoutineGroup): Promise<void> {
    this.groups.set(group.id, structuredClone(group));
    await this.flush();
  }

  async listOccurrenceStates(): Promise<OccurrenceState[]> {
    return [...this.states.values()].map((x) => structuredClone(x));
  }

  async upsertOccurrenceState(state: OccurrenceState): Promise<void> {
    this.states.set(state.key, structuredClone(state));
    await this.flush();
  }

  async deleteOccurrenceState(key: string): Promise<void> {
    this.states.delete(key);
    await this.flush();
  }

  async listLogs(range?: DateRange): Promise<DoseLog[]> {
    return [...this.logs.values()]
      .filter((log) => inRange(log.localDate, range))
      .map((x) => structuredClone(x))
      .sort((a, b) => a.at - b.at || a.createdAt - b.createdAt);
  }

  async getLog(id: string): Promise<DoseLog | null> {
    const log = this.logs.get(id);
    return log ? structuredClone(log) : null;
  }

  async upsertLog(log: DoseLog): Promise<void> {
    this.logs.set(log.id, structuredClone(log));
    await this.flush();
  }

  async listHydration(range?: DateRange): Promise<HydrationEntry[]> {
    return [...this.hydration.values()]
      .filter((entry) => inRange(entry.localDate, range))
      .map((x) => structuredClone(x))
      .sort((a, b) => a.at - b.at);
  }

  async upsertHydration(entry: HydrationEntry): Promise<void> {
    this.hydration.set(entry.id, structuredClone(entry));
    await this.flush();
  }

  async listScheduledNotifications(): Promise<ScheduledNotificationRecord[]> {
    return [...this.notifications.values()].map((x) => structuredClone(x)).sort((a, b) => a.fireAt - b.fireAt);
  }

  async upsertScheduledNotification(record: ScheduledNotificationRecord): Promise<void> {
    this.notifications.set(record.id, structuredClone(record));
    await this.flush();
  }

  async deleteScheduledNotification(id: string): Promise<void> {
    this.notifications.delete(id);
    await this.flush();
  }

  async clearScheduledNotifications(): Promise<void> {
    this.notifications.clear();
    await this.flush();
  }

  async exportAll(): Promise<ExportBundle> {
    return {
      app: 'rituvaya',
      format: 1,
      exportedAt: new Date().toISOString(),
      settings: await this.getSettings(),
      items: await this.listItems(),
      schedules: await this.listSchedules(),
      groups: await this.listGroups(),
      occurrenceStates: await this.listOccurrenceStates(),
      doseLogs: await this.listLogs(),
      hydrationEntries: await this.listHydration(),
    };
  }

  async deleteAll(): Promise<void> {
    this.settings = null;
    this.items.clear();
    this.schedules.clear();
    this.groups.clear();
    this.states.clear();
    this.logs.clear();
    this.hydration.clear();
    this.notifications.clear();
    await this.flush();
  }

  async deleteDemoData(): Promise<void> {
    const demoItems = new Set([...this.items.values()].filter((i) => i.isDemo).map((i) => i.id));
    for (const id of demoItems) this.items.delete(id);
    for (const [id, s] of this.schedules) if (demoItems.has(s.itemId)) this.schedules.delete(id);
    for (const [id, l] of this.logs) if (demoItems.has(l.itemId)) this.logs.delete(id);
    for (const [key] of this.states) if ([...demoItems].some((id) => key.startsWith(`${id}|`))) this.states.delete(key);
    for (const [id, h] of this.hydration) if (h.isDemo) this.hydration.delete(id);
    await this.flush();
  }
}
