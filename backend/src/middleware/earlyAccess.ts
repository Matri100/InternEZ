import type { NextFunction, Request, Response } from "express";
import { timingSafeEqual } from "node:crypto";

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

// Deliberately stateless — no session, no cookie. The frontend resends the
// key itself as a header on every request (see api/client.ts), stored in
// sessionStorage rather than a cookie, specifically so a new tab or a
// closed-and-reopened browser has nothing to inherit and has to enter the
// key again. A cookie-backed "stay unlocked" flag was tried first and
// rejected — cookies are shared across every tab in a browser, which is
// exactly the persistence this was asked not to have.
export function requireEarlyAccess(req: Request, res: Response, next: NextFunction) {
  if (!isEarlyAccessEnabled()) {
    next();
    return;
  }
  const provided = req.header("x-early-access-key");
  if (typeof provided === "string" && checkEarlyAccessKey(provided)) {
    next();
    return;
  }
  res.status(403).json({ error: "Early access key required", earlyAccessRequired: true });
}
