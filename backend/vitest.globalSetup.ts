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
  const { pool } = await import("./src/db/database.js");
  await pool.query(`
    TRUNCATE TABLE
      interview_proposals, messages, conversations, notifications,
      reuse_answers, extension_tokens, voluntary_disclosures,
      saved_searches, saved_listings, shortlisted_candidates,
      applications, listings, companies, applicants, users, sessions
    CASCADE
  `);
  await pool.end();
}
