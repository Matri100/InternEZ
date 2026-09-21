import { Router } from "express";
import { authLimiter } from "../middleware/rateLimit.js";
import { checkEarlyAccessKey, isEarlyAccessEnabled } from "../middleware/earlyAccess.js";

export const earlyAccessRouter = Router();

// Called on mount with whatever key (if any) the frontend still has in
// sessionStorage from earlier in this tab's life — rate limited since,
// unlike before, this now validates a submitted key too and is just as
// guessable as /unlock otherwise.
earlyAccessRouter.get("/status", authLimiter, (req, res) => {
  if (!isEarlyAccessEnabled()) {
    res.json({ granted: true });
    return;
  }
  const provided = req.header("x-early-access-key");
  res.json({ granted: typeof provided === "string" && checkEarlyAccessKey(provided) });
});

earlyAccessRouter.post("/unlock", authLimiter, (req, res) => {
  const { key } = req.body ?? {};
  if (typeof key !== "string" || !checkEarlyAccessKey(key)) {
    res.status(401).json({ error: "Incorrect key" });
    return;
  }
  res.json({ granted: true });
});
