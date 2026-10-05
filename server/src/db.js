import Database from 'better-sqlite3'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, '..', 'data', 'app.db')

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

export const WATER_BODY_TYPES = ['river', 'lake', 'pond', 'stream']

// A water sample submitted by a user: sensor readings and a photo
const samplesTableSql = (name) => `
  CREATE TABLE IF NOT EXISTS ${name} (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    location     TEXT,
    source_type  TEXT    CHECK (source_type IN (${WATER_BODY_TYPES.map((t) => `'${t}'`).join(', ')})),
    ph           REAL,            -- 0 to 14
    turbidity    REAL,            -- NTU
    tds          REAL,            -- Total Dissolved Solids, mg/L (same as ppm)
    temperature  REAL,            -- °C
    image_path   TEXT,            -- path of the uploaded image, relative to server/
    created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  ${samplesTableSql('samples')}

  -- Output of the analysis (sensor thresholds now, CNN model later) for one sample
  CREATE TABLE IF NOT EXISTS analysis_results (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    sample_id        INTEGER NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
    is_contaminated  INTEGER NOT NULL CHECK (is_contaminated IN (0, 1)),
    confidence       REAL    CHECK (confidence BETWEEN 0 AND 1),
    model_version    TEXT,
    notes            TEXT,
    created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  -- Crops suggested for a given analysis result
  CREATE TABLE IF NOT EXISTS crop_recommendations (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    analysis_id        INTEGER NOT NULL REFERENCES analysis_results(id) ON DELETE CASCADE,
    crop_name          TEXT    NOT NULL,
    suitability_score  REAL    CHECK (suitability_score BETWEEN 0 AND 100),
    reason             TEXT,
    created_at         TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_samples_user       ON samples(user_id);
  CREATE INDEX IF NOT EXISTS idx_analysis_sample    ON analysis_results(sample_id);
  CREATE INDEX IF NOT EXISTS idx_crops_analysis     ON crop_recommendations(analysis_id);
`)

// Migration: older databases allowed different water body types (no 'stream').
// SQLite can't change a CHECK constraint in place, so rebuild the table.
const { sql: currentSamplesSql } = db.prepare("SELECT sql FROM sqlite_master WHERE name = 'samples'").get()
if (!currentSamplesSql.includes("'stream'")) {
  db.pragma('foreign_keys = OFF')
  db.transaction(() => {
    db.exec(samplesTableSql('samples_new'))
    db.exec(`
      INSERT INTO samples_new (id, user_id, location, source_type, ph, turbidity, tds, temperature, image_path, created_at)
      SELECT id, user_id, location,
             CASE WHEN source_type IN (${WATER_BODY_TYPES.map((t) => `'${t}'`).join(', ')}) THEN source_type END,
             ph, turbidity, tds, temperature, image_path, created_at
      FROM samples;
      DROP TABLE samples;
      ALTER TABLE samples_new RENAME TO samples;
      CREATE INDEX IF NOT EXISTS idx_samples_user ON samples(user_id);
    `)
    const problems = db.pragma('foreign_key_check')
    if (problems.length) throw new Error('Foreign key check failed during samples migration')
  })()
  db.pragma('foreign_keys = ON')
  console.log('Migrated samples table: water body types are now', WATER_BODY_TYPES.join(', '))
}

export default db
