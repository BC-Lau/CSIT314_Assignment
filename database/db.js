// Opens the SQLite database and makes sure all tables exist.
// Uses Node's built-in SQLite (node:sqlite) - no native install needed.
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_DB_FILE = path.join(__dirname, 'app.db');
const SCHEMA_FILE = path.join(__dirname, 'schema.sql');

/**
 * @param {string} file  path to the .db file, or ':memory:' for tests
 */
function createDatabase(file = DEFAULT_DB_FILE) {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(fs.readFileSync(SCHEMA_FILE, 'utf8'));

  const columns = db.prepare('PRAGMA table_info(user_account)').all().map((column) => column.name);
  const migrations = [
    ['is_active', 'INTEGER NOT NULL DEFAULT 1'],
    ['is_locked', 'INTEGER NOT NULL DEFAULT 0'],
    ['security_incident_count', 'INTEGER NOT NULL DEFAULT 0'],
    ['is_verified', 'INTEGER NOT NULL DEFAULT 0'],
    ['has_verified_badge', 'INTEGER NOT NULL DEFAULT 0']
  ];
  for (const [name, definition] of migrations) {
    if (!columns.includes(name)) db.exec(`ALTER TABLE user_account ADD COLUMN ${name} ${definition}`);
  }
  const idpColumns = db.prepare('PRAGMA table_info(idp)').all().map((column) => column.name);
  if (!idpColumns.includes('view_count')) {
    db.exec('ALTER TABLE idp ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0');
  }
  const idpCols = db.prepare('PRAGMA table_info(idp)').all().map((column) => column.name);
  if (!idpCols.includes('is_suspended')) db.exec('ALTER TABLE idp ADD COLUMN is_suspended INTEGER NOT NULL DEFAULT 0');
  db.exec(`CREATE TABLE IF NOT EXISTS moderation_flag (
    id INTEGER PRIMARY KEY AUTOINCREMENT, subject_type TEXT NOT NULL CHECK(subject_type IN ('customer','idp')),
    subject_id INTEGER NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','accepted','suspended','removed')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')), reviewed_at TEXT, UNIQUE(subject_type,subject_id))`);
  db.exec('CREATE INDEX IF NOT EXISTS idx_moderation_flag_status ON moderation_flag(status,created_at)');
  return db;
}

module.exports = { createDatabase };
