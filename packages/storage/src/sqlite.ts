import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type KunaiDatabase = Database;

export interface OpenDatabaseOptions {
  readonly readonly?: boolean;
  readonly create?: boolean;
  readonly wal?: boolean;
  readonly busyTimeoutMs?: number;
}

export function openKunaiDatabase(path: string, options: OpenDatabaseOptions = {}): KunaiDatabase {
  if (options.readonly !== true) {
    mkdirSync(dirname(path), { recursive: true });
  }

  const db = new Database(path, {
    readonly: options.readonly ?? false,
    create: options.create ?? true,
  });

  if (options.readonly !== true) {
    db.exec("PRAGMA foreign_keys = ON");
    db.exec(`PRAGMA busy_timeout = ${options.busyTimeoutMs ?? 5000}`);

    if (options.wal !== false) {
      db.exec("PRAGMA journal_mode = WAL");
    }
  }

  return db;
}
