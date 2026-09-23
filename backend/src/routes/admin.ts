// Server-to-server trigger for the ingestion pipeline (see
// services/ingestion/) — no session/cookie involved, since the caller is a
// script or a future cron job, never a logged-in browser. Gated by its own
// shared secret instead, checked the same timing-safe way as the early
// access key.
import { Router } from "express";
import { timingSafeEqual } from "node:crypto";
import { SOURCED_EMPLOYERS } from "../data/sourcedEmployers.js";
import { syncAll } from "../services/ingestion/sync.js";
import { authLimiter } from "../middleware/rateLimit.js";

export const adminRouter = Router();

const SYNC_SECRET = process.env.SYNC_SECRET ?? "";

function checkSyncSecret(submitted: string): boolean {
  if (!SYNC_SECRET) return false; // unset means the route stays unusable, not open
  const a = Buffer.from(submitted);
  const b = Buffer.from(SYNC_SECRET);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Manually triggered for now (curl, or a person). This is an HTTP route
// rather than just the standalone CLI script (scripts/syncListings.ts)
// specifically so a Railway cron job can call it on a schedule later
// without needing shell access to the service.
adminRouter.post("/sync-listings", authLimiter, async (req, res) => {
  const key = req.headers["x-sync-key"];
  if (typeof key !== "string" || !checkSyncSecret(key)) {
    res.status(403).json({ error: "Invalid or missing sync key" });
    return;
  }
  const results = await syncAll(SOURCED_EMPLOYERS);
  res.json({ results });
});
