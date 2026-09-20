import session from "express-session";
import type { SessionData } from "express-session";
import { pool } from "./database.js";

const DEFAULT_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

export class PgSessionStore extends session.Store {
  get(sid: string, callback: (err: unknown, session?: SessionData | null) => void): void {
    pool
      .query(`SELECT data, expires_at FROM sessions WHERE sid = $1`, [sid])
      .then(({ rows }) => {
        const row = rows[0] as { data: string; expires_at: string } | undefined;
        if (!row || Number(row.expires_at) < Date.now()) {
          callback(null, null);
          return;
        }
        callback(null, JSON.parse(row.data));
      })
      .catch((err) => callback(err));
  }

  set(sid: string, sessionData: SessionData, callback?: (err?: unknown) => void): void {
    const maxAge = sessionData.cookie?.maxAge ?? DEFAULT_MAX_AGE;
    const expiresAt = Date.now() + maxAge;
    pool
      .query(
        `INSERT INTO sessions (sid, data, expires_at) VALUES ($1, $2, $3)
         ON CONFLICT (sid) DO UPDATE SET data = excluded.data, expires_at = excluded.expires_at`,
        [sid, JSON.stringify(sessionData), expiresAt]
      )
      .then(() => callback?.())
      .catch((err) => callback?.(err));
  }

  destroy(sid: string, callback?: (err?: unknown) => void): void {
    pool
      .query(`DELETE FROM sessions WHERE sid = $1`, [sid])
      .then(() => callback?.())
      .catch((err) => callback?.(err));
  }

  touch(sid: string, sessionData: SessionData, callback?: () => void): void {
    this.set(sid, sessionData, callback);
  }
}
