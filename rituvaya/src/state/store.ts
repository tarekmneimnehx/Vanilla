import { defaultSettings } from '@/domain/defaults';
import { newId } from '@/domain/ids';
import type { OccurrenceView } from '@/domain/logging/status';
import { remindTonightAt } from '@/domain/notifications/planner';
import { addWater, removeWater, restoreWater, updateWater, withGoal } from '@/domain/services/hydrationService';
import {
  clearOccurrenceState,
  correctLog,
  markAllTaken,
  recordAction,
  recordExtraDose,
  remindLater,
  restoreLog,
  snoozeOccurrence,
  undoLog,
  type RecordInput,
  type RecordResult,
} from '@/domain/services/loggingService';
import { buildDay, buildIndexes, type DataState } from '@/domain/services/queries';
import {
  archiveGroup,
  archiveItem,
  createGroup,
  createItemWithSchedule,
  pauseItem,
  resumeItem,
  updateGroup,
  updateItem,
  updateSchedule,
  type NewItemInput,
  type ScheduleDefinition,
} from '@/domain/services/scheduleService';
import { getDeviceTimeZone, wallClock } from '@/domain/time/clock';
import { parseOccurrenceKey } from '@/domain/schedule/occurrences';
import type { LocalDate } from '@/domain/time/localDate';
import type { DoseLog, FinalAction, GroupTime, HydrationEntry, Item, Language, RoutineGroup, Schedule, Settings } from '@/domain/types';
import { isLanguage, setLanguage } from '@/i18n';
import type { FormatContext } from '@/i18n/format';
import { configureNotifications, getPermission, notificationsSupported, requestPermission, scheduleTest, type PermissionInfo, type ResponseEvent } from '@/notifications/adapter';
import { ACTION_LOG_WATER, ACTION_SKIP, ACTION_SNOOZE, ACTION_TAKEN, ACTION_TONIGHT, parsePayload } from '@/notifications/content';
import { reconcileNotifications } from '@/notifications/reconcile';
import { loadDemoData } from '@/storage/demoData';
import type { Repository, ScheduledNotificationRecord } from '@/storage/repository';

export interface StoreSnapshot extends DataState {
  ready: boolean;
  version: number;
  notificationRecords: ScheduledNotificationRecord[];
  permission: PermissionInfo;
  tzNotice: { from: string; to: string } | null;
  lastReconcileAt: number | null;
}

export interface ResponseOutcome {
  route: string | null;
  toast: { message: string; undo?: () => Promise<void> } | null;
}

export interface StoreDeps {
  repo: Repository;
  deviceUses24h: () => boolean;
  now?: () => number;
}

/**
 * Single source of truth for the UI. Mutations go through the domain services
 * and the repository, then the whole snapshot is reloaded (data volumes are
 * tiny) and notifications are reconciled.
 */
export class AppStore {
  private snapshot: StoreSnapshot;
  private listeners = new Set<() => void>();
  private reconcileTimer: ReturnType<typeof setTimeout> | null = null;
  private reconcileRunning = false;
  private reconcileQueued = false;
  private handledResponses = new Set<string>();
  private settingsQueue: Promise<unknown> = Promise.resolve();
  readonly clock: () => number;

  constructor(private readonly deps: StoreDeps) {
    this.clock = deps.now ?? (() => Date.now());
    const tz = getDeviceTimeZone();
    this.snapshot = {
      settings: defaultSettings(wallClock(this.clock(), tz).date, tz),
      items: [],
      schedules: [],
      groups: [],
      states: [],
      logs: [],
      hydration: [],
      tz,
      ready: false,
      version: 0,
      notificationRecords: [],
      permission: { state: notificationsSupported ? 'undetermined' : 'unsupported', canAskAgain: true },
      tzNotice: null,
      lastReconcileAt: null,
    };
  }

  get repo(): Repository {
    return this.deps.repo;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): StoreSnapshot => this.snapshot;

  private emit(patch: Partial<StoreSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch, version: this.snapshot.version + 1 };
    this.listeners.forEach((l) => l());
  }

  now(): number {
    return this.clock();
  }

  today(): LocalDate {
    return wallClock(this.clock(), this.snapshot.tz).date;
  }

  formatContext(): FormatContext {
    return { language: this.snapshot.settings.language, timeFormat: this.snapshot.settings.timeFormat, tz: this.snapshot.tz, deviceUses24h: this.deps.deviceUses24h() };
  }

  async init(deviceLanguage: Language | null): Promise<void> {
    await this.repo.init();
    const tz = getDeviceTimeZone();
    let settings = await this.repo.getSettings();
    if (!settings) {
      settings = defaultSettings(wallClock(this.clock(), tz).date, tz);
      if (deviceLanguage) settings.language = deviceLanguage;
      await this.repo.saveSettings(settings);
    }
    let tzNotice: StoreSnapshot['tzNotice'] = null;
    if (settings.lastKnownTz && settings.lastKnownTz !== tz && settings.onboarding.completed) {
      tzNotice = { from: settings.lastKnownTz, to: tz };
    }
    if (settings.lastKnownTz !== tz) {
      settings = { ...settings, lastKnownTz: tz };
      await this.repo.saveSettings(settings);
    }
    setLanguage(settings.language);
    await configureNotifications(settings.language);
    const permission = await getPermission();
    await this.reload({ tz, tzNotice, permission, ready: true });
    this.scheduleReconcile(0);
  }

  private async reload(extra: Partial<StoreSnapshot> = {}): Promise<void> {
    const [settings, items, schedules, groups, states, logs, hydration, notificationRecords] = await Promise.all([
      this.repo.getSettings(),
      this.repo.listItems(),
      this.repo.listSchedules(),
      this.repo.listGroups(),
      this.repo.listOccurrenceStates(),
      this.repo.listLogs(),
      this.repo.listHydration(),
      this.repo.listScheduledNotifications(),
    ]);
    this.emit({
      settings: settings ?? this.snapshot.settings,
      items,
      schedules,
      groups,
      states,
      logs,
      hydration,
      notificationRecords,
      ...extra,
    });
  }

  /** Reloads data and reconciles notifications after a mutation. */
  private async changed(): Promise<void> {
    await this.reload();
    this.scheduleReconcile(250);
  }

  scheduleReconcile(delayMs: number): void {
    if (this.reconcileTimer) clearTimeout(this.reconcileTimer);
    this.reconcileTimer = setTimeout(() => {
      this.reconcileTimer = null;
      void this.reconcileNow();
    }, delayMs);
  }

  async reconcileNow(): Promise<void> {
    if (this.reconcileRunning) {
      this.reconcileQueued = true;
      return;
    }
    this.reconcileRunning = true;
    try {
      const permission = await getPermission();
      const records = await reconcileNotifications({
        repo: this.repo,
        state: this.snapshot,
        now: this.clock(),
        language: this.snapshot.settings.language,
        format: this.formatContext(),
        permissionGranted: permission.state === 'granted' || permission.state === 'provisional',
      });
      this.emit({ notificationRecords: records, permission, lastReconcileAt: this.clock() });
    } catch (error) {
      if (__DEV__) console.warn('Notification reconciliation failed', error);
    } finally {
      this.reconcileRunning = false;
      if (this.reconcileQueued) {
        this.reconcileQueued = false;
        void this.reconcileNow();
      }
    }
  }

  /** Called when the app returns to the foreground: time zone check, permission refresh, reconcile. */
  async onForeground(): Promise<void> {
    const tz = getDeviceTimeZone();
    let patch: Partial<StoreSnapshot> = {};
    if (tz !== this.snapshot.tz) {
      patch = { tz, tzNotice: { from: this.snapshot.tz, to: tz } };
      await this.repo.saveSettings({ ...this.snapshot.settings, lastKnownTz: tz });
    }
    const permission = await getPermission();
    await this.reload({ ...patch, permission });
    this.scheduleReconcile(0);
  }

  dismissTzNotice(): void {
    this.emit({ tzNotice: null });
  }

  // ---- settings -------------------------------------------------------

  /**
   * Settings updates are serialised and always applied to the latest persisted
   * value, so two quick edits (for example name + onboarding step) never
   * overwrite each other.
   */
  updateSettings(update: (current: Settings) => Settings): Promise<void> {
    const run = async () => {
      const current = (await this.repo.getSettings()) ?? this.snapshot.settings;
      const next = update(current);
      const languageChanged = next.language !== current.language;
      await this.repo.saveSettings(next);
      if (languageChanged && isLanguage(next.language)) {
        setLanguage(next.language);
        await configureNotifications(next.language);
      }
      await this.changed();
    };
    const result = this.settingsQueue.then(run, run);
    this.settingsQueue = result.catch(() => undefined);
    return result;
  }

  async setHydrationGoal(goalMl: number): Promise<void> {
    await this.updateSettings((s) => withGoal(s, goalMl, this.today()));
  }

  async requestNotificationPermission(): Promise<PermissionInfo> {
    const permission = await requestPermission();
    this.emit({ permission });
    this.scheduleReconcile(0);
    return permission;
  }

  async refreshPermission(): Promise<PermissionInfo> {
    const permission = await getPermission();
    this.emit({ permission });
    return permission;
  }

  async sendTestNotification(text: { title: string; body: string }): Promise<boolean> {
    return scheduleTest(text, this.snapshot.settings.reminders.sound);
  }

  // ---- items, schedules, groups ---------------------------------------

  async addItem(input: NewItemInput, def: ScheduleDefinition): Promise<{ item: Item; schedule: Schedule }> {
    const result = await createItemWithSchedule(this.repo, input, def, this.today(), this.clock());
    await this.changed();
    return result;
  }

  async editItem(itemId: string, changes: Partial<Omit<Item, 'id' | 'createdAt'>>): Promise<Item> {
    const item = await updateItem(this.repo, itemId, changes, this.clock());
    await this.changed();
    return item;
  }

  async editSchedule(itemId: string, def: ScheduleDefinition): Promise<Schedule> {
    const schedule = await updateSchedule(this.repo, itemId, def, this.today(), this.clock());
    await this.changed();
    return schedule;
  }

  async pause(itemId: string): Promise<void> {
    await pauseItem(this.repo, itemId, this.today(), this.clock());
    await this.changed();
  }

  async resume(itemId: string): Promise<void> {
    await resumeItem(this.repo, itemId, this.today(), this.clock());
    await this.changed();
  }

  async archive(itemId: string): Promise<void> {
    await archiveItem(this.repo, itemId, this.today(), this.clock());
    await this.changed();
  }

  async addGroup(name: string, time: GroupTime): Promise<RoutineGroup> {
    const group = await createGroup(this.repo, name, time, this.today(), this.clock());
    await this.changed();
    return group;
  }

  async editGroup(groupId: string, changes: { name?: string; time?: GroupTime }): Promise<RoutineGroup> {
    const group = await updateGroup(this.repo, groupId, changes, this.today(), this.clock());
    await this.changed();
    return group;
  }

  async removeGroup(groupId: string, resolvedTime: string): Promise<void> {
    await archiveGroup(this.repo, groupId, resolvedTime, this.today(), this.clock());
    await this.changed();
  }

  // ---- logging --------------------------------------------------------

  async record(input: Omit<RecordInput, 'item'> & { item?: Item }): Promise<RecordResult> {
    const item = input.item ?? this.snapshot.items.find((i) => i.id === input.occurrence.itemId);
    if (!item) throw new Error('Item not found');
    const result = await recordAction(this.repo, { ...input, item }, this.clock(), this.snapshot.tz);
    await this.changed();
    return result;
  }

  async recordExtra(item: Item, input: { at?: number; amount?: number | null; unit?: string | null; note?: string | null }): Promise<DoseLog> {
    const log = await recordExtraDose(this.repo, item, { ...input, source: 'app' }, this.clock(), this.snapshot.tz);
    await this.changed();
    return log;
  }

  async undo(logId: string): Promise<void> {
    await undoLog(this.repo, logId, this.clock());
    await this.changed();
  }

  async undoMany(logIds: string[]): Promise<void> {
    for (const id of logIds) await undoLog(this.repo, id, this.clock());
    await this.changed();
  }

  async restore(logId: string): Promise<void> {
    await restoreLog(this.repo, logId, this.clock());
    await this.changed();
  }

  async correct(logId: string, changes: Parameters<typeof correctLog>[2]): Promise<void> {
    await correctLog(this.repo, logId, changes, this.clock(), this.snapshot.tz);
    await this.changed();
  }

  async snooze(key: string, minutes?: number): Promise<number> {
    const duration = minutes ?? this.snapshot.settings.reminders.snoozeMinutes;
    const until = this.clock() + duration * 60_000;
    await snoozeOccurrence(this.repo, key, until, this.clock());
    await this.changed();
    return until;
  }

  async remindTonight(key: string): Promise<{ at: number; usedFallback: boolean }> {
    const target = remindTonightAt(this.clock(), this.snapshot.tz, this.snapshot.settings.reminders.remindTonightTime);
    await remindLater(this.repo, key, target.at, this.clock());
    await this.changed();
    return target;
  }

  async clearState(key: string): Promise<void> {
    await clearOccurrenceState(this.repo, key);
    await this.changed();
  }

  async takeAll(views: readonly OccurrenceView[], source: 'group' | 'notification' = 'group'): Promise<DoseLog[]> {
    const itemsById = new Map(this.snapshot.items.map((i) => [i.id, i]));
    const result = await markAllTaken(this.repo, views, itemsById, this.clock(), this.snapshot.tz, source);
    await this.changed();
    return result.logs;
  }

  // ---- hydration ------------------------------------------------------

  async addWater(amountMl: number, at?: number): Promise<HydrationEntry> {
    const entry = await addWater(this.repo, amountMl, this.clock(), this.snapshot.tz, at);
    await this.changed();
    return entry;
  }

  async editWater(id: string, changes: { amountMl?: number; at?: number }): Promise<void> {
    await updateWater(this.repo, id, changes, this.clock(), this.snapshot.tz);
    await this.changed();
  }

  async removeWater(id: string): Promise<void> {
    await removeWater(this.repo, id, this.clock());
    await this.changed();
  }

  async restoreWater(id: string): Promise<void> {
    await restoreWater(this.repo, id, this.clock());
    await this.changed();
  }

  // ---- data -----------------------------------------------------------

  async exportJson(): Promise<string> {
    const bundle = await this.repo.exportAll();
    return JSON.stringify(bundle, null, 2);
  }

  async deleteAllData(): Promise<void> {
    await this.repo.deleteAll();
    const tz = getDeviceTimeZone();
    const settings = defaultSettings(wallClock(this.clock(), tz).date, tz);
    settings.language = this.snapshot.settings.language;
    await this.repo.saveSettings(settings);
    await this.reload({ tzNotice: null });
    this.scheduleReconcile(0);
  }

  async loadDemo(): Promise<void> {
    await loadDemoData(this.repo, this.snapshot.settings, this.today(), this.clock(), this.snapshot.tz);
    await this.changed();
  }

  async removeDemo(): Promise<void> {
    await this.repo.deleteDemoData();
    await this.changed();
  }

  hasDemoData(): boolean {
    return this.snapshot.items.some((i) => i.isDemo) || this.snapshot.hydration.some((h) => h.isDemo && h.deletedAt === null);
  }

  // ---- notification responses ----------------------------------------

  /** Finds the current views for occurrence keys (regenerating their days). */
  viewsForKeys(keys: readonly string[]): OccurrenceView[] {
    const idx = buildIndexes(this.snapshot);
    const now = this.clock();
    const dates = new Set<string>();
    for (const key of keys) {
      const parsed = parseOccurrenceKey(key);
      if (parsed) dates.add(parsed.date);
    }
    const wanted = new Set(keys);
    const views: OccurrenceView[] = [];
    for (const date of dates) {
      const day = buildDay(this.snapshot, idx, date, now);
      for (const view of day.views) if (wanted.has(view.occurrence.key)) views.push(view);
    }
    return views;
  }

  async handleResponse(event: ResponseEvent, labels: { taken: (count: number) => string; skipped: (count: number) => string; snoozed: (time: number) => string; tonight: (time: number, fallback: boolean) => string }): Promise<ResponseOutcome> {
    if (this.handledResponses.has(event.id)) return { route: null, toast: null };
    this.handledResponses.add(event.id);
    const payload = parsePayload(event.payload);
    if (!payload) return { route: null, toast: null };
    if (payload.kind === 'hydration') return { route: '/hydration', toast: null };
    if (payload.kind === 'test') return { route: null, toast: null };
    const keys = payload.occurrenceKeys;
    if (event.isDefaultAction || keys.length === 0) {
      return { route: `/due?keys=${encodeURIComponent(keys.join(','))}`, toast: null };
    }
    const views = this.viewsForKeys(keys).filter((v) => !v.isFinal);
    switch (event.actionIdentifier) {
      case ACTION_TAKEN: {
        const logs = await this.takeAll(views, 'notification');
        return { route: null, toast: { message: labels.taken(logs.length), undo: logs.length ? () => this.undoMany(logs.map((l) => l.id)) : undefined } };
      }
      case ACTION_SKIP: {
        const logIds: string[] = [];
        for (const view of views) {
          const result = await recordAction(this.repo, { occurrence: view.occurrence, item: this.snapshot.items.find((i) => i.id === view.occurrence.itemId)!, action: 'skipped' as FinalAction, source: 'notification' }, this.clock(), this.snapshot.tz);
          if (result.created) logIds.push(result.log.id);
        }
        await this.changed();
        return { route: null, toast: { message: labels.skipped(logIds.length), undo: logIds.length ? () => this.undoMany(logIds) : undefined } };
      }
      case ACTION_SNOOZE: {
        let until = this.clock();
        for (const view of views) until = await this.snooze(view.occurrence.key);
        return { route: null, toast: views.length ? { message: labels.snoozed(until) } : null };
      }
      case ACTION_TONIGHT: {
        let target = { at: this.clock(), usedFallback: false };
        for (const view of views) target = await this.remindTonight(view.occurrence.key);
        return { route: null, toast: views.length ? { message: labels.tonight(target.at, target.usedFallback) } : null };
      }
      case ACTION_LOG_WATER:
        return { route: '/hydration', toast: null };
      default:
        return { route: `/due?keys=${encodeURIComponent(keys.join(','))}`, toast: null };
    }
  }

  newId(): string {
    return newId();
  }
}
