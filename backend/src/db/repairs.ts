// Data fixes that need JavaScript, not just SQL (database.ts holds the
// SQL-only ones). Each is idempotent and runs on every boot — the SQL
// filter narrows it to rows that still need fixing, so once the fix is
// applied there's nothing left to select.
import { pool } from "./database.js";
import { cleanInline, cleanText, decodeEntities, removeLeakedCss } from "../services/ingestion/stripHtml.js";

// Postgres regex for text the cleanup would still change: an HTML entity,
// an invisible or odd-width space character, a line that starts with a
// bullet symbol, a LinkedIn tag, a run of blank lines, doubled spaces, or
// a "{" (leaked CSS). Deliberately not a bare "&" — "R&D" is legitimate text. Text that
// matches but comes out unchanged (a real "{" in prose) is skipped below.
const NEEDS_CLEANING = [
  String.raw`&(#[0-9]+|#[xX][0-9a-fA-F]+|[A-Za-z][A-Za-z0-9]*);`,
  String.raw`[ ­​﻿ -   　]`,
  String.raw`(^|\n)(-\s*)?[•◦▪●■□➢➤►▸✓✔·○]`,
  String.raw`#LI-`,
  String.raw`\n[ \t]*\n[ \t]*\n`,
  String.raw`[ \t]{2}|\t`,
  String.raw`\{`,
].join("|");

// Descriptions and titles ingested before stripHtml decoded every entity
// and dropped <style> blocks were stored with "&#xe9;"-style codes and CSS
// left in. The original HTML isn't kept, so this cleans the stored text
// itself — no feed re-fetch.
export async function repairSourcedListingText(): Promise<void> {
  const listings = await pool.query(
    `SELECT id, title, location, description FROM listings
     WHERE id LIKE 'ajdb:%' AND (title ~ $1 OR location ~ $1 OR description ~ $1)`,
    [NEEDS_CLEANING]
  );
  let listingsCleaned = 0;
  for (const row of listings.rows) {
    const title = cleanInline(row.title);
    const location = cleanInline(row.location);
    const description = cleanText(removeLeakedCss(decodeEntities(row.description)));
    if (title === row.title && location === row.location && description === row.description) continue;
    await pool.query(`UPDATE listings SET title = $2, location = $3, description = $4 WHERE id = $1`, [
      row.id,
      title,
      location,
      description,
    ]);
    listingsCleaned++;
  }

  const companies = await pool.query(`SELECT id, name FROM companies WHERE id LIKE 'ajdb:%' AND name ~ $1`, [
    NEEDS_CLEANING,
  ]);
  let companiesCleaned = 0;
  for (const row of companies.rows) {
    const name = cleanInline(row.name);
    if (name === row.name) continue;
    await pool.query(`UPDATE companies SET name = $2 WHERE id = $1`, [row.id, name]);
    companiesCleaned++;
  }

  if (listingsCleaned + companiesCleaned > 0) {
    console.log(`Cleaned stored text of ${listingsCleaned} listings and ${companiesCleaned} companies`);
  }
}
