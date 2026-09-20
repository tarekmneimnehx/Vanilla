import * as SQLite from 'expo-sqlite';
import type { DoseLog, HydrationEntry, Item, OccurrenceState, RoutineGroup, Schedule, Settings } from '@/domain/types';
import type { DateRange, ExportBundle, Repository, ScheduledNotificationRecord } from './repository';
import { MIGRATIONS } from './migrations';

export const DATABASE_NAME = 'rituvaya.db';

interface DataRow {
  data: string;
}

function parseRows<T>(rows: DataRow[]): T[] {
  return rows.map((row) => JSON.parse(row.data) as T);
}

/**
 * SQLite-backed repository. Each table keeps the columns needed for indexing
 * and queries plus a `data` JSON column holding the full record, so adding a
 * field never needs a schema migration while structural changes still run
 * through versioned migrations (PRAGMA user_version).
 */
export class SqliteRepository implements Repository {
  readonly kind = 'sqlite' as const;
  private db: SQLite.SQLiteDatabase | null = null;

  constructor(private readonly databaseName: string = DATABASE_NAME) {}

  private get conn(): SQLite.SQLiteDatabase {
    if (!this.db) throw new Error('Repository not initialised');
    return this.db;
  }

  async init(): Promise<void> {
    if (this.db) return;
    const db = await SQLite.openDatabaseAsync(this.databaseName);
    await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    let version = row?.user_version ?? 0;
    for (const migration of MIGRATIONS) {
      if (migration.version <= version) continue;
      await db.withTransactionAsync(async () => {
        await db.execAsync(migration.sql);
        await db.execAsync(`PRAGMA user_version = ${migration.version}`);
      });
      version = migration.version;
    }
    this.db = db;
  }

  async close(): Promise<void> {
    if (!this.db) return;
    await this.db.closeAsync();
    this.db = null;
  }

  async getSettings(): Promise<Settings | null> {
    const row = await this.conn.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', 'settings');
    return row ? (JSON.parse(row.value) as Settings) : null;
  }

  async saveSettings(settings: Settings): Promise<void> {
    await this.conn.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', 'settings', JSON.stringify(settings));
  }

  async listItems(): Promise<Item[]> {
    return parseRows<Item>(await this.conn.getAllAsync<DataRow>('SELECT data FROM items ORDER BY sort_order ASC, created_at ASC'));
  }

  async getItem(id: string): Promise<Item | null> {
    const row = await this.conn.getFirstAsync<DataRow>('SELECT data FROM items WHERE id = ?', id);
    return row ? (JSON.parse(row.data) as Item) : null;
  }

  async upsertItem(item: Item): Promise<void> {
    await this.conn.runAsync(
      'INSERT OR REPLACE INTO items (id, status, is_demo, sort_order, created_at, updated_at, data) VALUES (?, ?, ?, ?, ?, ?, ?)',
      item.id,
      item.status,
      item.isDemo ? 1 : 0,
      item.sortOrder,
      item.createdAt,
      item.updatedAt,
      JSON.stringify(item),
    );
  }

  async listSchedules(): Promise<Schedule[]> {
    return parseRows<Schedule>(await this.conn.getAllAsync<DataRow>('SELECT data FROM schedules ORDER BY effective_from DESC, created_at DESC'));
  }

  async upsertSchedule(schedule: Schedule): Promise<void> {
    await this.conn.runAsync(
      'INSERT OR REPLACE INTO schedules (id, item_id, effective_from, effective_to, created_at, data) VALUES (?, ?, ?, ?, ?, ?)',
      schedule.id,
      schedule.itemId,
      schedule.effectiveFrom,
      schedule.effectiveTo,
      schedule.createdAt,
      JSON.stringify(schedule),
    );
  }

  async listGroups(): Promise<RoutineGroup[]> {
    return parseRows<RoutineGroup>(await this.conn.getAllAsync<DataRow>('SELECT data FROM routine_groups ORDER BY sort_order ASC, created_at ASC'));
  }

  async upsertGroup(group: RoutineGroup): Promise<void> {
    await this.conn.runAsync(
      'INSERT OR REPLACE INTO routine_groups (id, sort_order, archived_at, created_at, data) VALUES (?, ?, ?, ?, ?)',
      group.id,
      group.sortOrder,
      group.archivedAt,
      group.createdAt,
      JSON.stringify(group),
    );
  }

  async listOccurrenceStates(): Promise<OccurrenceState[]> {
    return parseRows<OccurrenceState>(await this.conn.getAllAsync<DataRow>('SELECT data FROM occurrence_states'));
  }

  async upsertOccurrenceState(state: OccurrenceState): Promise<void> {
    await this.conn.runAsync('INSERT OR REPLACE INTO occurrence_states (key, updated_at, data) VALUES (?, ?, ?)', state.key, state.updatedAt, JSON.stringify(state));
  }

  async deleteOccurrenceState(key: string): Promise<void> {
    await this.conn.runAsync('DELETE FROM occurrence_states WHERE key = ?', key);
  }

  async listLogs(range?: DateRange): Promise<DoseLog[]> {
    if (range) {
      return parseRows<DoseLog>(
        await this.conn.getAllAsync<DataRow>('SELECT data FROM dose_logs WHERE local_date >= ? AND local_date <= ? ORDER BY at ASC, created_at ASC', range.from, range.to),
      );
    }
    return parseRows<DoseLog>(await this.conn.getAllAsync<DataRow>('SELECT data FROM dose_logs ORDER BY at ASC, created_at ASC'));
  }

  async getLog(id: string): Promise<DoseLog | null> {
    const row = await this.conn.getFirstAsync<DataRow>('SELECT data FROM dose_logs WHERE id = ?', id);
    return row ? (JSON.parse(row.data) as DoseLog) : null;
  }

  async upsertLog(log: DoseLog): Promise<void> {
    await this.conn.runAsync(
      'INSERT OR REPLACE INTO dose_logs (id, item_id, occurrence_key, local_date, action, at, deleted_at, created_at, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      log.id,
      log.itemId,
      log.occurrenceKey,
      log.localDate,
      log.action,
      log.at,
      log.deletedAt,
      log.createdAt,
      JSON.stringify(log),
    );
  }

  async listHydration(range?: DateRange): Promise<HydrationEntry[]> {
    if (range) {
      return parseRows<HydrationEntry>(
        await this.conn.getAllAsync<DataRow>('SELECT data FROM hydration_entries WHERE local_date >= ? AND local_date <= ? ORDER BY at ASC', range.from, range.to),
      );
    }
    return parseRows<HydrationEntry>(await this.conn.getAllAsync<DataRow>('SELECT data FROM hydration_entries ORDER BY at ASC'));
  }

  async upsertHydration(entry: HydrationEntry): Promise<void> {
    await this.conn.runAsync(
      'INSERT OR REPLACE INTO hydration_entries (id, local_date, at, is_demo, deleted_at, created_at, data) VALUES (?, ?, ?, ?, ?, ?, ?)',
      entry.id,
      entry.localDate,
      entry.at,
      entry.isDemo ? 1 : 0,
      entry.deletedAt,
      entry.createdAt,
      JSON.stringify(entry),
    );
  }

  async listScheduledNotifications(): Promise<ScheduledNotificationRecord[]> {
    return parseRows<ScheduledNotificationRecord>(await this.conn.getAllAsync<DataRow>('SELECT data FROM scheduled_notifications ORDER BY fire_at ASC'));
  }

  async upsertScheduledNotification(record: ScheduledNotificationRecord): Promise<void> {
    await this.conn.runAsync(
      'INSERT OR REPLACE INTO scheduled_notifications (id, native_id, fire_at, data) VALUES (?, ?, ?, ?)',
      record.id,
      record.nativeId,
      record.fireAt,
      JSON.stringify(record),
    );
  }

  async deleteScheduledNotification(id: string): Promise<void> {
    await this.conn.runAsync('DELETE FROM scheduled_notifications WHERE id = ?', id);
  }

  async clearScheduledNotifications(): Promise<void> {
    await this.conn.runAsync('DELETE FROM scheduled_notifications');
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
    await this.conn.withTransactionAsync(async () => {
      for (const table of ['settings', 'items', 'schedules', 'routine_groups', 'occurrence_states', 'dose_logs', 'hydration_entries', 'scheduled_notifications']) {
        await this.conn.execAsync(`DELETE FROM ${table}`);
      }
    });
  }

  async deleteDemoData(): Promise<void> {
    await this.conn.withTransactionAsync(async () => {
      await this.conn.execAsync(`
        DELETE FROM schedules WHERE item_id IN (SELECT id FROM items WHERE is_demo = 1);
        DELETE FROM dose_logs WHERE item_id IN (SELECT id FROM items WHERE is_demo = 1);
        DELETE FROM occurrence_states WHERE key IN (SELECT s.key FROM occurrence_states s JOIN items i ON s.key LIKE i.id || '|%' WHERE i.is_demo = 1);
        DELETE FROM items WHERE is_demo = 1;
        DELETE FROM hydration_entries WHERE is_demo = 1;
      `);
    });
  }
}
