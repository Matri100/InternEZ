import { Router } from "express";
import { accessCheckLimiter, authLimiter } from "../middleware/rateLimit.js";
import {
  EARLY_ACCESS_COOKIE,
  EARLY_ACCESS_COOKIE_MAX_AGE_MS,
  checkEarlyAccessKey,
  getEarlyAccessCookie,
  isEarlyAccessEnabled,
} from "../middleware/earlyAccess.js";

export const earlyAccessRouter = Router();

// Re-checked on every page load against whatever cookie is already there
// (if any) — see accessCheckLimiter for why it isn't on authLimiter.
earlyAccessRouter.get("/status", accessCheckLimiter, (req, res) => {
  if (!isEarlyAccessEnabled()) {
    res.json({ granted: true });
    return;
  }
  const provided = getEarlyAccessCookie(req);
  res.json({ granted: typeof provided === "string" && checkEarlyAccessKey(provided) });
});

earlyAccessRouter.post("/unlock", authLimiter, (req, res) => {
  const { key } = req.body ?? {};
  if (typeof key !== "string" || !checkEarlyAccessKey(key)) {
    res.status(401).json({ error: "Incorrect key" });
    return;
  }
  // httpOnly (not readable via JS — the frontend doesn't need to, the
  // browser just resends it), sameSite: lax (internez.eu and
  // api.internez.eu are sibling subdomains of the same registrable
  // domain, so this is "same-site" for cookie purposes despite being
  // cross-origin — see index.ts's login cookie for the same reasoning).
  res.cookie(EARLY_ACCESS_COOKIE, key, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: EARLY_ACCESS_COOKIE_MAX_AGE_MS,
  });
  res.json({ granted: true });
});
