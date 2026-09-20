export interface Migration {
  version: number;
  sql: string;
}

/**
 * Ordered, append-only migrations. The database records the last applied
 * version in PRAGMA user_version. Never edit an entry that has shipped; add a
 * new one.
 */
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY NOT NULL,
        status TEXT NOT NULL,
        is_demo INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        data TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_items_status ON items (status);
      CREATE TABLE IF NOT EXISTS schedules (
        id TEXT PRIMARY KEY NOT NULL,
        item_id TEXT NOT NULL,
        effective_from TEXT NOT NULL,
        effective_to TEXT,
        created_at INTEGER NOT NULL,
        data TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_schedules_item ON schedules (item_id, effective_from);
      CREATE TABLE IF NOT EXISTS routine_groups (
        id TEXT PRIMARY KEY NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        archived_at INTEGER,
        created_at INTEGER NOT NULL,
        data TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS occurrence_states (
        key TEXT PRIMARY KEY NOT NULL,
        updated_at INTEGER NOT NULL,
        data TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS dose_logs (
        id TEXT PRIMARY KEY NOT NULL,
        item_id TEXT NOT NULL,
        occurrence_key TEXT,
        local_date TEXT NOT NULL,
        action TEXT NOT NULL,
        at INTEGER NOT NULL,
        deleted_at INTEGER,
        created_at INTEGER NOT NULL,
        data TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_dose_logs_date ON dose_logs (local_date);
      CREATE INDEX IF NOT EXISTS idx_dose_logs_item ON dose_logs (item_id, local_date);
      CREATE INDEX IF NOT EXISTS idx_dose_logs_occurrence ON dose_logs (occurrence_key);
      CREATE TABLE IF NOT EXISTS hydration_entries (
        id TEXT PRIMARY KEY NOT NULL,
        local_date TEXT NOT NULL,
        at INTEGER NOT NULL,
        is_demo INTEGER NOT NULL DEFAULT 0,
        deleted_at INTEGER,
        created_at INTEGER NOT NULL,
        data TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_hydration_date ON hydration_entries (local_date);
      CREATE TABLE IF NOT EXISTS scheduled_notifications (
        id TEXT PRIMARY KEY NOT NULL,
        native_id TEXT NOT NULL,
        fire_at INTEGER NOT NULL,
        data TEXT NOT NULL
      );
    `,
  },
];

export const CURRENT_DB_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;
