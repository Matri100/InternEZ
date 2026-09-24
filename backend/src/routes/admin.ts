// Server-to-server trigger for the ingestion pipeline (see
// services/ingestion/) — no session/cookie involved, since the caller is a
// script or the scheduled GitHub Actions job, never a logged-in browser.
// Gated by its own shared secret instead, checked the same timing-safe way
// as the early access key.
import { Router } from "express";
import { timingSafeEqual } from "node:crypto";
import { syncActiveJobsDb } from "../services/ingestion/sync.js";
import { SOURCED_COUNTRIES } from "../data/sourcedCountries.js";
import { authLimiter } from "../middleware/rateLimit.js";
import type { CountryCode } from "../types/domain.js";

export const adminRouter = Router();

const SYNC_SECRET = process.env.SYNC_SECRET ?? "";
const ACTIVE_JOBS_DB_API_KEY = process.env.ACTIVE_JOBS_DB_API_KEY ?? "";

function checkSyncSecret(submitted: string): boolean {
  if (!SYNC_SECRET) return false; // unset means the route stays unusable, not open
  const a = Buffer.from(submitted);
  const b = Buffer.from(SYNC_SECRET);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

const SYNCED_CODES = new Set<string>(SOURCED_COUNTRIES.map((c) => c.code));

// Optional JSON body, all fields optional — an empty body is the normal
// daily run:
//   timeFrame  "24h" (default) | "7d" for a one-off backfill
//   perCountry 1–1000, overrides every country's daily cap (small test runs)
//   countries  e.g. ["DE", "FR"], restricts the run to those countries
adminRouter.post("/sync-listings", authLimiter, async (req, res) => {
  const key = req.headers["x-sync-key"];
  if (typeof key !== "string" || !checkSyncSecret(key)) {
    res.status(403).json({ error: "Invalid or missing sync key" });
    return;
  }
  if (!ACTIVE_JOBS_DB_API_KEY) {
    res.status(500).json({ error: "ACTIVE_JOBS_DB_API_KEY is not configured on the server" });
    return;
  }

  const body = req.body ?? {};
  const timeFrame = body.timeFrame === "7d" ? "7d" : "24h";
  const perCountry =
    Number.isInteger(body.perCountry) && body.perCountry >= 1 && body.perCountry <= 1000 ? body.perCountry : undefined;
  const countries = Array.isArray(body.countries)
    ? body.countries.filter((c: unknown): c is CountryCode => typeof c === "string" && SYNCED_CODES.has(c))
    : undefined;

  const results = await syncActiveJobsDb({ apiKey: ACTIVE_JOBS_DB_API_KEY, timeFrame, perCountry, countries });
  res.json({ results });
});
