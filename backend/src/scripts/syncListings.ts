// Manual trigger for the ingestion pipeline: `npm run sync:listings`
// (needs a real DATABASE_URL, same as running the server). Not wired to a
// schedule yet — run it by hand for now, or wire a Railway cron job to
// `node dist/scripts/syncListings.js` once this is deployed.
import { SOURCED_EMPLOYERS } from "../data/sourcedEmployers.js";
import { syncAll } from "../services/ingestion/sync.js";
import { pool } from "../db/database.js";

const results = await syncAll(SOURCED_EMPLOYERS);

for (const r of results) {
  if (r.error) {
    console.log(`✗ ${r.employer}: ${r.error}`);
    continue;
  }
  console.log(
    `✓ ${r.employer}: fetched ${r.fetched}, internship-shaped ${r.internshipShaped}, ` +
      `saved ${r.saved}, skipped (non-EU/EEA location) ${r.skippedNonEuLocation}`
  );
}

const totalSaved = results.reduce((sum, r) => sum + r.saved, 0);
console.log(`\nDone — ${totalSaved} listing(s) saved across ${results.length} employer(s).`);

await pool.end();
