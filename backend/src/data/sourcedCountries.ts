// Countries synced from Active Jobs DB (see services/ingestion/sync.ts),
// each with its share of the plan's monthly job quota expressed as a daily
// cap — the sync runs once a day over the previous 24 hours.
//
// Sized for the $45/month "Pro" plan (5,000 jobs/month, a hard limit)
// against volume measured on 2026-09-24 with the API's count endpoint
// (internship titles, trailing 31 days): DE 6,374 · FR 4,765 · IT 1,547 ·
// NL 1,363 · ES 984 · PL 391. The caps total 160/day ≈ 4,800/month,
// leaving headroom under the limit. Add a country to start syncing it;
// raise the caps if the plan is upgraded.
import type { CountryCode } from "../types/domain.js";

export const SOURCED_COUNTRIES: { code: CountryCode; dailyCap: number }[] = [
  { code: "DE", dailyCap: 50 },
  { code: "FR", dailyCap: 43 },
  { code: "IT", dailyCap: 20 },
  { code: "NL", dailyCap: 20 },
  { code: "ES", dailyCap: 17 },
  { code: "PL", dailyCap: 10 },
];
