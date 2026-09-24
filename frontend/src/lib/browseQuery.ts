// Browse keeps its filters in the page URL ("/browse?countries=DE,FR&
// languages=German"), so the back button, a reload or a shared link all
// land on the same results. This converts between that URL and the
// filter values the page and API work with.
import type { CountryCode, InternshipLength, ListingSort, SavedSearchFilters, WorkArrangement } from "../types/domain";

export interface BrowseState extends SavedSearchFilters {
  directOnly: boolean;
  eligibleOnly: boolean;
  sort: ListingSort;
  page: number;
  showMap: boolean;
}

export type ListFilterKey = "countries" | "cities" | "languages" | "workArrangements" | "durations";

// URL parameter name for each filter — the same names the API reads.
const LIST_PARAMS: Record<ListFilterKey, string> = {
  countries: "countries",
  cities: "cities",
  languages: "languages",
  workArrangements: "arrangements",
  durations: "durations",
};

const SORTS: ListingSort[] = ["match", "newest", "deadline", "company"];

function list(params: URLSearchParams, name: string): string[] {
  return (params.get(name) ?? "").split(",").filter(Boolean);
}

export function readBrowseState(params: URLSearchParams): BrowseState {
  const sort = params.get("sort") as ListingSort;
  const page = Number.parseInt(params.get("page") ?? "1", 10);
  return {
    query: params.get("q") ?? "",
    countries: list(params, LIST_PARAMS.countries) as CountryCode[],
    cities: list(params, LIST_PARAMS.cities),
    languages: list(params, LIST_PARAMS.languages),
    workArrangements: list(params, LIST_PARAMS.workArrangements) as WorkArrangement[],
    durations: list(params, LIST_PARAMS.durations) as InternshipLength[],
    fieldOfStudy: params.get("field") ?? "",
    directOnly: params.get("direct") === "1",
    eligibleOnly: params.get("eligible") === "1",
    sort: SORTS.includes(sort) ? sort : "match",
    page: Number.isFinite(page) && page > 0 ? page : 1,
    showMap: params.get("map") === "1",
  };
}

// Only non-default values go into the URL, so an unfiltered Browse is
// just "/browse".
export function writeBrowseState(state: BrowseState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.query.trim()) params.set("q", state.query.trim());
  for (const key of Object.keys(LIST_PARAMS) as ListFilterKey[]) {
    if (state[key].length > 0) params.set(LIST_PARAMS[key], state[key].join(","));
  }
  if (state.fieldOfStudy) params.set("field", state.fieldOfStudy);
  if (state.directOnly) params.set("direct", "1");
  if (state.eligibleOnly) params.set("eligible", "1");
  if (state.sort !== "match") params.set("sort", state.sort);
  if (state.page > 1) params.set("page", String(state.page));
  if (state.showMap) params.set("map", "1");
  return params;
}

// What the API gets: the URL minus the view-only map toggle.
export function apiParams(state: BrowseState): string {
  const params = writeBrowseState({ ...state, showMap: false });
  return params.toString();
}

export function savedSearchFilters(state: BrowseState): SavedSearchFilters {
  return {
    query: state.query.trim(),
    countries: state.countries,
    cities: state.cities,
    languages: state.languages,
    workArrangements: state.workArrangements,
    durations: state.durations,
    fieldOfStudy: state.fieldOfStudy,
  };
}

// A saved search opened again from the Saved page.
export function browseUrlFor(filters: SavedSearchFilters): string {
  const params = writeBrowseState({
    ...filters,
    directOnly: false,
    eligibleOnly: false,
    sort: "match",
    page: 1,
    showMap: false,
  });
  const query = params.toString();
  return query ? `/browse?${query}` : "/browse";
}

export function activeFilterCount(state: BrowseState): number {
  return (
    state.countries.length +
    state.cities.length +
    state.languages.length +
    state.workArrangements.length +
    state.durations.length +
    (state.fieldOfStudy ? 1 : 0) +
    (state.directOnly ? 1 : 0) +
    (state.eligibleOnly ? 1 : 0)
  );
}
