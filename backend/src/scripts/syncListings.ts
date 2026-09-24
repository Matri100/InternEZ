// Local trigger for the ingestion pipeline: `npm run sync:listings`. Needs
// a real DATABASE_URL and ACTIVE_JOBS_DB_API_KEY in the environment. In
// production the same sync runs via POST /api/admin/sync-listings (see
// routes/admin.ts), triggered daily by .github/workflows/daily-listing-sync.yml.
import { syncActiveJobsDb } from "../services/ingestion/sync.js";
import { pool } from "../db/database.js";

const apiKey = process.env.ACTIVE_JOBS_DB_API_KEY;
if (!apiKey) {
  console.error("ACTIVE_JOBS_DB_API_KEY is required");
  process.exit(1);
}

const results = await syncActiveJobsDb({ apiKey, timeFrame: "24h" });
for (const r of results) {
  if (r.error) {
    console.log(`✗ ${r.country}: ${r.error}`);
    continue;
  }
  console.log(
    `✓ ${r.country}: fetched ${r.fetched}, saved ${r.saved}, duplicates ${r.skippedDuplicate}, ` +
      `not internships ${r.skippedNotInternship}, wrong country ${r.skippedWrongCountry}, no employer ${r.skippedNoEmployer}`
  );
}
console.log(`\nDone — ${results.reduce((sum, r) => sum + r.saved, 0)} listing(s) saved.`);

await pool.end();
