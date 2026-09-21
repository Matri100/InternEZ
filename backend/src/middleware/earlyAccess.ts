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

// No dependency on express-session or cookie-parser — this is the one
// cookie in the app not going through either, on purpose, so it can't be
// touched by session.regenerate() (see routes/auth.ts's history) and
// doesn't need a new package for what's a two-line parse.
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

// Tried sessionStorage first (per-tab, but unreliable on mobile — iOS
// Safari can clear a backgrounded tab's sessionStorage when switching
// apps), then localStorage with an expiry (more reliable, but still not
// what browsers actually build for this). A cookie is the mechanism
// mobile browsers are careful not to break on backgrounding, which is
// exactly the problem this exists to solve — same 24h expiry as before,
// just via Max-Age instead of a value the frontend has to track itself.
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
