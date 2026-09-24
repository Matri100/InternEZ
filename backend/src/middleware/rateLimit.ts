import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";

// Keyed by session user id (falls back to IP pre-login) rather than IP
// alone — the endpoints this guards all require auth, so a signed-in
// abuser cycling IPs is the realistic threat, not a shared office network.
// The IP fallback goes through express-rate-limit's own helper rather than
// raw req.ip — it normalizes IPv6 addresses so a client can't dodge the
// limit just by requesting from a different address within their own /64.
function keyByUser(req: Request): string {
  return req.session?.userId ?? ipKeyGenerator(req.ip ?? "");
}

// Applications and messages/pokes are the write paths a signed-in account
// could use to spam other users — everything else (browsing, profile
// edits) has no one else on the receiving end, so it's left unlimited.
export const writeLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUser,
  message: { error: "Too many requests — please slow down and try again in a moment." },
});

// Login/signup had no rate limit at all before this — unlimited password
// guesses against a real account, or unlimited account-creation spam.
// Tighter than writeLimiter on purpose (10 per 15 min, not 20 per 1 min):
// OWASP-style guidance for an auth endpoint specifically, not a general
// write path. keyByUser still works here even though nobody's signed in
// yet — there's no session cookie before a successful login/signup
// (saveUninitialized: false), so it already falls through to the IP key.
export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUser,
  message: { error: "Too many attempts — please wait a few minutes and try again." },
});

// The early-access page-load check (GET /early-access/status). Its own,
// much looser bucket: it runs on every full page load, so sharing
// authLimiter's 10 per 15 minutes — a bucket login, signup and unlock also
// draw from — locked people out after about ten reloads, showing them the
// key screen again and blocking their next login. It doesn't need
// authLimiter's strictness either: every gated route already checks the
// same cookie, unlimited, so this one adds no brute-force surface.
export const accessCheckLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUser,
  message: { error: "Too many requests — please slow down and try again in a moment." },
});
