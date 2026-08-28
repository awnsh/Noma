import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { mkdirSync } from 'fs'
import { seedDefaultProfiles } from './seed'

let db: Database.Database | null = null

export function initDatabase(): Database.Database {
  if (db) return db

  const userDataPath = app.getPath('userData')
  mkdirSync(userDataPath, { recursive: true })
  const dbPath = join(userDataPath, 'noma.db')

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  runMigrations(db)
  seedDefaultProfiles(db)

  return db
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

export function closeDatabase(): void {
  db?.close()
  db = null
}

/**
 * Test-only: injects a database instance directly (e.g. an in-memory
 * better-sqlite3 database) so repository functions — which call
 * getDatabase() internally — are unit-testable without Electron's
 * app.getPath('userData'). Never called outside tests.
 */
export function __setDatabaseForTesting(instance: Database.Database): void {
  db = instance
}

export function runMigrations(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      process_name TEXT NOT NULL,
      icon TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      icon TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS controls (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      slot INTEGER NOT NULL,
      label TEXT NOT NULL,
      action_type TEXT NOT NULL,
      action_payload TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    -- Interaction metadata only. Never raw keystrokes/content. See
    -- docs/privacy-and-legal.md and src/main/workflow/captureFilter.ts.
    CREATE TABLE IF NOT EXISTS workflow_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id TEXT,
      event_type TEXT NOT NULL,
      combo_keys TEXT,
      control_id TEXT,
      timestamp INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS suggestions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      explanation TEXT NOT NULL,
      confidence REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      resolved_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS macros (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      application_id TEXT,
      trigger TEXT NOT NULL,
      actions TEXT NOT NULL,
      delay_ms INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS modules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      capabilities TEXT NOT NULL,
      position INTEGER,
      configuration TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_workflow_events_app_time ON workflow_events(application_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_controls_profile ON controls(profile_id);
  `)

  // Additive, backward-compatible schema evolution: existing databases from
  // earlier phases keep working without deleting flow.db between phases.
  ensureColumn(database, 'suggestions', 'application_id', 'application_id TEXT')
  ensureColumn(database, 'suggestions', 'action_kind', 'action_kind TEXT')
  ensureColumn(database, 'suggestions', 'action_payload', 'action_payload TEXT')
  ensureColumn(database, 'suggestions', 'confidence_breakdown', 'confidence_breakdown TEXT')
}

/**
 * Adds `column` to `table` if it isn't already there. `table`/`column`/
 * `definition` are always hardcoded call-site literals, never
 * user-controlled, so building the DDL string is safe here.
 */
function ensureColumn(
  database: Database.Database,
  table: string,
  column: string,
  definition: string
): void {
  const columns = database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  if (!columns.some((existing) => existing.name === column)) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`)
  }
}
