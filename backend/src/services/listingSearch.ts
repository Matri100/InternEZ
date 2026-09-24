// Browse's filtering, facet counts, sorting and paging. Pure (no I/O):
// routes/listings.ts loads the visible listings and the viewer's profile,
// this decides what to show. Everything runs in memory over listing
// summaries (no descriptions), which stays fast into the tens of
// thousands of rows — eligibility and match score are computed per
// viewer anyway, so they can't be pushed into SQL.
import { canonicalCity, cityNamesFor } from "../data/cities.js";
import { computeEligibility } from "./eligibility.js";
import { computeMatch } from "./matching.js";
import type {
  Applicant,
  Company,
  CountryCode,
  FacetCount,
  InternshipLength,
  Listing,
  ListingFacets,
  ListingSearchQuery,
  ListingSearchResult,
  ListingSummary,
  SavedSearchFilters,
} from "../types/domain.js";

export const PAGE_SIZE = 20;

export type ListingRow = Omit<Listing, "description">;

// Accent- and case-insensitive, so "munchen" finds "München".
function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

// The city part of a location as the feed wrote it: "Warszawa" from
// "Warszawa, Masovian Voivodeship, Poland". null when the location is only
// a country, or a remote/placeholder label.
function rawCityOf(listing: Pick<Listing, "location">): string | null {
  const first = listing.location.split(",")[0].trim();
  if (!first || !listing.location.includes(",")) return null;
  return first;
}

// The city a listing is filtered and counted under — one name however the
// feed spelled it ("Warsaw" for "Warszawa" too; see data/cities.ts).
export function cityOf(listing: Pick<Listing, "location" | "country">): string | null {
  const raw = rawCityOf(listing);
  return raw ? canonicalCity(raw, listing.country) : null;
}

// Sourced listings get duration "Flexible" only because the feed gives no
// length (see ingestion/normalize.ts) — that means unknown, so it
// shouldn't match a "Flexible" filter or count towards it.
export function effectiveDuration(listing: Pick<Listing, "origin" | "duration">): InternshipLength | null {
  if (listing.origin === "sourced" && listing.duration === "Flexible") return null;
  return listing.duration;
}

type Dimension =
  | "query"
  | "countries"
  | "cities"
  | "languages"
  | "workArrangements"
  | "durations"
  | "fieldOfStudy"
  | "direct"
  | "eligible";

interface Candidate {
  listing: ListingRow;
  company: Company;
  haystack: string;
  city: string | null;
}

function toCandidate(listing: ListingRow, company: Company): Candidate {
  const raw = rawCityOf(listing);
  // Every known name of the city is searchable, so "Warschau" (typed in
  // the German interface) finds "Warszawa, ..., Poland".
  const cityNames = raw ? cityNamesFor(raw, listing.country) : [];
  return {
    listing,
    company,
    city: raw ? canonicalCity(raw, listing.country) : null,
    haystack: fold(
      [listing.title, company.name, listing.department, listing.location, ...cityNames, ...listing.skills].join(" ")
    ),
  };
}

function queryWords(query: string): string[] {
  return fold(query).split(/\s+/).filter(Boolean);
}

// Which of the structural (profile-independent) filters a listing fails.
function failedDimensions(candidate: Candidate, filters: SavedSearchFilters, words: string[]): Dimension[] {
  const { listing } = candidate;
  const failed: Dimension[] = [];
  if (words.some((w) => !candidate.haystack.includes(w))) failed.push("query");
  if (filters.countries.length > 0 && !filters.countries.includes(listing.country as CountryCode)) {
    failed.push("countries");
  }
  // A filter value is normally already canonical (it came from the city
  // facet); one saved before cities were merged ("Warszawa") still matches.
  const { city } = candidate;
  if (
    filters.cities.length > 0 &&
    !(city && filters.cities.some((c) => c === city || canonicalCity(c, listing.country) === city))
  ) {
    failed.push("cities");
  }
  if (filters.languages.length > 0 && !filters.languages.includes(listing.language)) failed.push("languages");
  if (filters.workArrangements.length > 0 && !filters.workArrangements.includes(listing.workArrangement)) {
    failed.push("workArrangements");
  }
  const duration = effectiveDuration(listing);
  if (filters.durations.length > 0 && !(duration && filters.durations.includes(duration))) failed.push("durations");
  if (filters.fieldOfStudy && !listing.targetFields.includes(filters.fieldOfStudy)) failed.push("fieldOfStudy");
  return failed;
}

// Used for saved-search alerts (routes/company.ts), where there's no
// viewer profile — same rules as Browse's structural filters.
export function matchesFilters(listing: ListingRow, company: Company, filters: SavedSearchFilters): boolean {
  return failedDimensions(toCandidate(listing, company), filters, queryWords(filters.query)).length === 0;
}

function tally(counts: Map<string, number>, value: string | null) {
  if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
}

// Sorted by count, then name — with every currently selected value kept
// (at 0 if nothing matches) so it can still be unselected.
function toFacet(counts: Map<string, number>, selected: string[]): FacetCount[] {
  for (const value of selected) if (!counts.has(value)) counts.set(value, 0);
  return [...counts]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

function compareDeadline(a: ListingRow, b: ListingRow): number {
  // Listings without a deadline go last, not first.
  return (a.applicationDeadline || "9999-99-99").localeCompare(b.applicationDeadline || "9999-99-99");
}

export function searchListings(input: {
  rows: { listing: ListingRow; company: Company }[];
  applicant: Applicant;
  savedIds: Set<string>;
  query: ListingSearchQuery;
}): ListingSearchResult {
  const { applicant, savedIds, query } = input;
  const words = queryWords(query.query);

  const evaluated = input.rows.map(({ listing, company }) => {
    const candidate = toCandidate(listing, company);
    const failed = failedDimensions(candidate, query, words);
    if (query.directOnly && listing.origin !== "direct") failed.push("direct");
    const eligibilityResult = computeEligibility(applicant, listing.eligibility);
    if (query.eligibleOnly && eligibilityResult.level !== "ok") failed.push("eligible");
    return { candidate, failed, eligibilityResult };
  });

  // A listing counts towards a facet's options when it passes every
  // filter except that facet's own — the standard faceted-search rule,
  // so picking "Germany" doesn't make every other country show 0.
  const passesAllBut = (failed: Dimension[], dimension: Dimension) =>
    failed.length === 0 || (failed.length === 1 && failed[0] === dimension);

  const counts = {
    countries: new Map<string, number>(),
    cities: new Map<string, number>(),
    languages: new Map<string, number>(),
    workArrangements: new Map<string, number>(),
    durations: new Map<string, number>(),
    fieldsOfStudy: new Map<string, number>(),
  };
  const cityCountry = new Map<string, CountryCode | null>();
  let direct = 0;
  let eligible = 0;
  for (const { candidate, failed, eligibilityResult } of evaluated) {
    const { listing } = candidate;
    if (passesAllBut(failed, "countries")) tally(counts.countries, listing.country);
    if (candidate.city) cityCountry.set(candidate.city, listing.country);
    if (passesAllBut(failed, "cities")) tally(counts.cities, candidate.city);
    if (passesAllBut(failed, "languages")) tally(counts.languages, listing.language);
    if (passesAllBut(failed, "workArrangements")) tally(counts.workArrangements, listing.workArrangement);
    if (passesAllBut(failed, "durations")) tally(counts.durations, effectiveDuration(listing));
    if (passesAllBut(failed, "fieldOfStudy")) for (const field of listing.targetFields) tally(counts.fieldsOfStudy, field);
    if (passesAllBut(failed, "direct") && listing.origin === "direct") direct++;
    if (passesAllBut(failed, "eligible") && eligibilityResult.level === "ok") eligible++;
  }

  const facets: ListingFacets = {
    countries: toFacet(counts.countries, query.countries),
    cities: toFacet(counts.cities, query.cities).map((f) => ({ ...f, country: cityCountry.get(f.value) ?? null })),
    languages: toFacet(counts.languages, query.languages),
    workArrangements: toFacet(counts.workArrangements, query.workArrangements),
    durations: toFacet(counts.durations, query.durations),
    fieldsOfStudy: toFacet(counts.fieldsOfStudy, query.fieldOfStudy ? [query.fieldOfStudy] : []),
    direct,
    eligible,
  };

  const matching: ListingSummary[] = evaluated
    .filter((e) => e.failed.length === 0)
    .map(({ candidate: { listing, company }, eligibilityResult }) => ({
      ...listing,
      company,
      eligibilityResult,
      match: computeMatch(applicant, listing, eligibilityResult),
      saved: savedIds.has(listing.id),
    }));

  matching.sort((a, b) => {
    switch (query.sort) {
      case "newest":
        return b.createdAt.localeCompare(a.createdAt);
      case "deadline":
        return compareDeadline(a, b) || b.createdAt.localeCompare(a.createdAt);
      case "company":
        return a.company.name.localeCompare(b.company.name) || a.title.localeCompare(b.title);
      case "match":
      default:
        return b.match.total - a.match.total || b.createdAt.localeCompare(a.createdAt);
    }
  });

  const pageCount = Math.max(1, Math.ceil(matching.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, query.page), pageCount);
  return {
    items: matching.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    total: matching.length,
    page,
    pageSize: PAGE_SIZE,
    facets,
  };
}
