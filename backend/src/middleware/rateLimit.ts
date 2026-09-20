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
