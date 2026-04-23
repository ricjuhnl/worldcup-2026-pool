import initSqlJs, { Database as SqlDatabase, SqlJsStatic } from 'sql.js';
import { join, dirname } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

const dbPath = join(process.cwd(), 'data', 'database.sqlite');

let db: SqlDatabase | null = null;
let SQL: SqlJsStatic | null = null;

export async function initDb(): Promise<SqlDatabase> {
  if (db) return db;

  SQL = await initSqlJs();

  const dataDir = dirname(dbPath);
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  if (existsSync(dbPath)) {
    const file = readFileSync(dbPath);
    db = new SQL.Database(file);
  } else {
    db = new SQL.Database();
    createTables(db);
    saveDb();
  }

  return db;
}

export async function getDb(): Promise<SqlDatabase> {
  if (!db || !SQL) {
    await initDb();
  }
  return db!;
}

function createTables(database: SqlDatabase) {
  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      avatar_initials TEXT,
      score INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      is_admin INTEGER DEFAULT 0
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS matches (
      game INTEGER PRIMARY KEY,
      fifa_id TEXT NOT NULL,
      round TEXT,
      group_letter TEXT,
      date TEXT NOT NULL,
      location TEXT,
      location_city TEXT,
      location_country TEXT,
      stadium TEXT,
      home_abbreviation TEXT NOT NULL,
      home_team TEXT NOT NULL,
      away_abbreviation TEXT NOT NULL,
      away_team TEXT NOT NULL,
      home_score INTEGER DEFAULT -1,
      away_score INTEGER DEFAULT -1
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS predictions (
      user_id TEXT NOT NULL,
      game INTEGER NOT NULL,
      home_prediction INTEGER,
      away_prediction INTEGER,
      points INTEGER DEFAULT 0,
      updated_at INTEGER,
      PRIMARY KEY (user_id, game),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (game) REFERENCES matches(game)
    )
  `);


}

export function saveDb(): void {
  if (!db) return;
  const dataDir = dirname(dbPath);
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
  writeFileSync(dbPath, db.export());
}

export default db;
