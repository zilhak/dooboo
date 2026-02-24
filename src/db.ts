import { Database } from "bun:sqlite";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const DATA_DIR = join(homedir(), ".dooboo");
const DB_PATH = join(DATA_DIR, "db.sqlite");

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

db.run("PRAGMA journal_mode = WAL");
db.run("PRAGMA foreign_keys = ON");

db.run(`
  CREATE TABLE IF NOT EXISTS servers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL UNIQUE
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS tokens (
    server_id INTEGER PRIMARY KEY REFERENCES servers(id),
    token TEXT NOT NULL
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS bindings (
    bind_token TEXT PRIMARY KEY,
    server_id INTEGER NOT NULL REFERENCES servers(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

export { db, DATA_DIR, DB_PATH };
