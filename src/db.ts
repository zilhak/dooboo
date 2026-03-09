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

// 외부(호스트)에서 접근 가능한 경로. Docker 환경에서는 볼륨 마운트의 호스트 측 경로.
// 미설정 시 DATA_DIR과 동일 (로컬 실행).
const HOST_DATA_DIR = process.env.DOOBOO_HOST_DATA_DIR || DATA_DIR;

/** 컨테이너 내부 경로를 호스트 경로로 변환 (MCP 응답에 사용) */
function toHostPath(internalPath: string): string {
  if (HOST_DATA_DIR === DATA_DIR) return internalPath;
  return internalPath.replace(DATA_DIR, HOST_DATA_DIR);
}

export { db, DATA_DIR, HOST_DATA_DIR, DB_PATH, toHostPath };
