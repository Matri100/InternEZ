import type { NextFunction, Request, Response } from "express";
import { timingSafeEqual } from "node:crypto";

declare module "express-session" {
  interface SessionData {
    earlyAccessGranted?: boolean;
  }
}

// Empty/unset key means the gate is off entirely — the default for local
// dev and for whenever the site is ready to be public. Setting
// EARLY_ACCESS_KEY in production turns it on with no code change.
const EARLY_ACCESS_KEY = process.env.EARLY_ACCESS_KEY ?? "";

export function isEarlyAccessEnabled(): boolean {
  return EARLY_ACCESS_KEY.length > 0;
}

export function checkEarlyAccessKey(submitted: string): boolean {
  const a = Buffer.from(submitted);
  const b = Buffer.from(EARLY_ACCESS_KEY);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Applied globally ahead of every route except /api/health and
// /api/early-access itself (see index.ts) — a shared key gating the whole
// app while it's not meant to be publicly visible yet, not a per-user
// permission. Session-backed like login, so a partner who's entered it once
// stays in for the life of the cookie (30 days) instead of re-entering it
// every visit.
export function requireEarlyAccess(req: Request, res: Response, next: NextFunction) {
  if (!isEarlyAccessEnabled() || req.session.earlyAccessGranted) {
    next();
    return;
  }
  res.status(403).json({ error: "Early access key required", earlyAccessRequired: true });
}
