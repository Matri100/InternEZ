// Runs once, in its own process context, before the whole test run — vitest
// doesn't share module state between this and the actual test files, so the
// pool opened here is separate from (and must be closed independently of)
// whatever pool the test files create when they import db/database.ts.
//
// Importing database.ts (rather than duplicating its CREATE TABLE
// statements here) triggers its top-level `await pool.query(...)` schema
// creation as a side effect, so the tables are guaranteed to exist before
// the TRUNCATE below runs, even against a brand-new Postgres instance (e.g.
// a fresh CI service container).
export default async function globalSetup() {
  // The TRUNCATE below is destructive — this is a heuristic guard against
  // accidentally pointing a local `npm test` run at a real dev/staging
  // DATABASE_URL and wiping it, not a substitute for using a genuinely
  // separate test database (which CI already does via POSTGRES_DB).
  const url = process.env.DATABASE_URL ?? "";
  if (!/test/i.test(url)) {
    throw new Error(
      `DATABASE_URL doesn't look like a test database (expected "test" somewhere in the name): ${url || "(unset)"}`
    );
  }

  const { pool } = await import("./src/db/database.js");
  await pool.query(`
    TRUNCATE TABLE
      interview_proposals, messages, conversations, notifications,
      reuse_answers, extension_tokens, voluntary_disclosures,
      saved_searches, saved_listings, shortlisted_candidates,
      listing_reports, applications, listings, companies, applicants,
      password_reset_tokens, users, sessions
    CASCADE
  `);
  await pool.end();
}
