// One sync run: for each configured country, fetch new internship-titled
// jobs from Active Jobs DB (capped at that country's share of the plan
// quota), normalize them, drop duplicates, and upsert. A failure fetching
// one country is reported in its result rather than aborting the others.
import { db } from "../../models/store.js";
import { countryName } from "../../data/reference.js";
import { SOURCED_COUNTRIES } from "../../data/sourcedCountries.js";
import { fetchActiveJobsDb, type ActiveJobsDbJob } from "./activeJobsDb.js";
import { normalizeActiveJob } from "./normalize.js";
import type { CountryCode } from "../../types/domain.js";

export interface CountrySyncResult {
  country: CountryCode;
  fetched: number;
  saved: number;
  skippedNotInternship: number;
  skippedWrongCountry: number;
  skippedNoEmployer: number;
  skippedDuplicate: number;
  error?: string;
}

export interface SyncOptions {
  apiKey: string;
  // "24h" for the daily run; "7d" for a one-off backfill when first seeding.
  timeFrame: "24h" | "7d";
  // Overrides every country's daily cap — for small test runs and backfills.
  perCountry?: number;
  // Restricts the run to these countries (must also be in SOURCED_COUNTRIES).
  countries?: CountryCode[];
}

export async function syncActiveJobsDb(options: SyncOptions): Promise<CountrySyncResult[]> {
  const targets = SOURCED_COUNTRIES.filter((c) => !options.countries || options.countries.includes(c.code));
  const savedCompanies = new Set<string>();
  const results: CountrySyncResult[] = [];
  for (const target of targets) {
    results.push(await syncCountry(target.code, options.perCountry ?? target.dailyCap, options, savedCompanies));
  }
  return results;
}

async function syncCountry(
  country: CountryCode,
  limit: number,
  options: SyncOptions,
  savedCompanies: Set<string>
): Promise<CountrySyncResult> {
  const result: CountrySyncResult = {
    country,
    fetched: 0,
    saved: 0,
    skippedNotInternship: 0,
    skippedWrongCountry: 0,
    skippedNoEmployer: 0,
    skippedDuplicate: 0,
  };

  let jobs: ActiveJobsDbJob[];
  try {
    jobs = await fetchActiveJobsDb({
      apiKey: options.apiKey,
      countryName: countryName(country),
      timeFrame: options.timeFrame,
      limit,
    });
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
    return result;
  }
  result.fetched = jobs.length;

  const now = new Date();
  const seenThisRun = new Set<string>();
  for (const job of jobs) {
    const normalized = normalizeActiveJob(job, country, now);
    if ("skipped" in normalized) {
      if (normalized.skipped === "notInternship") result.skippedNotInternship++;
      else if (normalized.skipped === "wrongCountry") result.skippedWrongCountry++;
      else result.skippedNoEmployer++;
      continue;
    }

    const { listingId, companyId, company, listing, expiresAt } = normalized;
    const dedupeKey = `${companyId}|${listing.title.toLowerCase()}`;
    if (seenThisRun.has(dedupeKey) || (await db.hasVisibleDuplicateListing(companyId, listing.title, listingId))) {
      result.skippedDuplicate++;
      continue;
    }
    seenThisRun.add(dedupeKey);

    if (!savedCompanies.has(companyId)) {
      await db.saveCompany(companyId, company);
      savedCompanies.add(companyId);
    }
    await db.upsertSourcedListing(listingId, companyId, listing, expiresAt);
    result.saved++;
  }

  return result;
}
