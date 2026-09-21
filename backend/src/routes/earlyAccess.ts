import { Router } from "express";
import { authLimiter } from "../middleware/rateLimit.js";
import { checkEarlyAccessKey, isEarlyAccessEnabled } from "../middleware/earlyAccess.js";

export const earlyAccessRouter = Router();

earlyAccessRouter.get("/status", (req, res) => {
  res.json({ granted: !isEarlyAccessEnabled() || Boolean(req.session.earlyAccessGranted) });
});

// Reuses authLimiter (10/15min) — a shared key handed to multiple partners
// still shouldn't be brute-forceable.
earlyAccessRouter.post("/unlock", authLimiter, (req, res) => {
  const { key } = req.body ?? {};
  if (typeof key !== "string" || !checkEarlyAccessKey(key)) {
    res.status(401).json({ error: "Incorrect key" });
    return;
  }
  req.session.earlyAccessGranted = true;
  res.json({ granted: true });
});
