import session from "express-session";
import type { SessionData } from "express-session";
import { sqlite } from "./database.js";

const DEFAULT_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

export class SqliteSessionStore extends session.Store {
  get(sid: string, callback: (err: unknown, session?: SessionData | null) => void): void {
    try {
      const row = sqlite.prepare(`SELECT data, expires_at FROM sessions WHERE sid = ?`).get(sid) as
        | { data: string; expires_at: number }
        | undefined;
      if (!row || row.expires_at < Date.now()) {
        callback(null, null);
        return;
      }
      callback(null, JSON.parse(row.data));
    } catch (err) {
      callback(err);
    }
  }

  set(sid: string, sessionData: SessionData, callback?: (err?: unknown) => void): void {
    try {
      const maxAge = sessionData.cookie?.maxAge ?? DEFAULT_MAX_AGE;
      const expiresAt = Date.now() + maxAge;
      sqlite
        .prepare(
          `INSERT INTO sessions (sid, data, expires_at) VALUES (?, ?, ?)
           ON CONFLICT(sid) DO UPDATE SET data = excluded.data, expires_at = excluded.expires_at`
        )
        .run(sid, JSON.stringify(sessionData), expiresAt);
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  destroy(sid: string, callback?: (err?: unknown) => void): void {
    try {
      sqlite.prepare(`DELETE FROM sessions WHERE sid = ?`).run(sid);
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  touch(sid: string, sessionData: SessionData, callback?: () => void): void {
    this.set(sid, sessionData, callback);
  }
}
