import type { NextFunction, Request, Response } from "express";
import { timingSafeEqual } from "node:crypto";

// Empty/unset key means the gate is off entirely — the default for local
// dev and for whenever the site is ready to be public. Setting
// EARLY_ACCESS_KEY in production turns it on with no code change.
const EARLY_ACCESS_KEY = process.env.EARLY_ACCESS_KEY ?? "";

export const EARLY_ACCESS_COOKIE = "iez_ea";
export const EARLY_ACCESS_COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h

export function isEarlyAccessEnabled(): boolean {
  return EARLY_ACCESS_KEY.length > 0;
}

export function checkEarlyAccessKey(submitted: string): boolean {
  const a = Buffer.from(submitted);
  const b = Buffer.from(EARLY_ACCESS_KEY);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Its own cookie, not express-session's — stays untouched by
// session.regenerate() on login, and a plain Cookie-header parse doesn't
// need cookie-parser as a dependency for one value.
export function getEarlyAccessCookie(req: Request): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === EARLY_ACCESS_COOKIE) {
      try {
        return decodeURIComponent(part.slice(eq + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function requireEarlyAccess(req: Request, res: Response, next: NextFunction) {
  if (!isEarlyAccessEnabled()) {
    next();
    return;
  }
  const provided = getEarlyAccessCookie(req);
  if (typeof provided === "string" && checkEarlyAccessKey(provided)) {
    next();
    return;
  }
  res.status(403).json({ error: "Early access key required", earlyAccessRequired: true });
}
