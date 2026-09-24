import { REGIONS } from "../data/reference.js";
import { matchesFilters } from "./listingSearch.js";
import type {
  Company,
  CountryCode,
  InternshipLength,
  Listing,
  SavedSearchFilters,
  WorkArrangement,
} from "../types/domain.js";

const VALID_COUNTRIES = new Set<string>(REGIONS.flatMap((r) => r.countries.map((c) => c.code)));
const VALID_WORK_ARRANGEMENTS: WorkArrangement[] = ["On-site", "Hybrid", "Remote"];
const VALID_DURATIONS: InternshipLength[] = ["3 months", "6 months", "12 months", "Flexible"];

function stringList(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  const strings = value.filter((v): v is string => typeof v === "string" && v.length > 0 && v.length <= maxLength);
  return [...new Set(strings)].slice(0, maxItems);
}

// Validates filters from a request, and upgrades ones stored before
// Browse had multi-select filters — those saved a single `country` string.
export function parseSearchFilters(raw: any): SavedSearchFilters {
  const countries = stringList(raw?.countries, 31, 2);
  if (typeof raw?.country === "string" && raw.country) countries.push(raw.country);
  return {
    query: typeof raw?.query === "string" ? raw.query.slice(0, 200) : "",
    countries: [...new Set(countries)].filter((c): c is CountryCode => VALID_COUNTRIES.has(c)),
    cities: stringList(raw?.cities, 50, 100),
    languages: stringList(raw?.languages, 40, 60),
    workArrangements: stringList(raw?.workArrangements, 3, 20).filter((w): w is WorkArrangement =>
      VALID_WORK_ARRANGEMENTS.includes(w as WorkArrangement)
    ),
    durations: stringList(raw?.durations, 4, 20).filter((d): d is InternshipLength =>
      VALID_DURATIONS.includes(d as InternshipLength)
    ),
    fieldOfStudy: typeof raw?.fieldOfStudy === "string" ? raw.fieldOfStudy.slice(0, 100) : "",
  };
}

// Deliberately excludes eligibility and match score, since those need a
// specific applicant's profile and a saved search is checked against
// every applicant's search the moment a listing is created, not from one
// applicant's session.
export function matchesSavedSearch(listing: Listing, company: Company, filters: SavedSearchFilters): boolean {
  return matchesFilters(listing, company, filters);
}
