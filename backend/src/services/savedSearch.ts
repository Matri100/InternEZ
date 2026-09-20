import type { Listing, SavedSearchFilters } from "../types/domain.js";

// Mirrors the structural half of Browse's own client-side filter predicate
// (workArrangement/duration/field/country/text) — deliberately excludes
// eligibility and match score, since those need a specific applicant's
// profile and a saved search is checked against every applicant's search
// the moment a listing is created, not from one applicant's session.
export function matchesSavedSearch(listing: Listing, filters: SavedSearchFilters): boolean {
  if (filters.workArrangements.length > 0 && !filters.workArrangements.includes(listing.workArrangement)) {
    return false;
  }
  if (filters.durations.length > 0 && !filters.durations.includes(listing.duration)) {
    return false;
  }
  if (filters.fieldOfStudy && !listing.targetFields.includes(filters.fieldOfStudy)) {
    return false;
  }
  if (filters.country && listing.country !== filters.country) {
    return false;
  }
  const query = filters.query.trim().toLowerCase();
  if (query) {
    const haystack = [listing.title, listing.department, listing.location, ...listing.skills].join(" ").toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  return true;
}
