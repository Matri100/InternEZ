import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { useAppData } from "../context/AppData";
import { useReferenceData } from "../context/ReferenceData";
import { ListingCard } from "../components/ListingCard";
import { ApplyModal } from "../components/ApplyModal";
import { FacetList } from "../components/browse/FacetList";
import { Pagination } from "../components/browse/Pagination";
import { SearchIcon, FilterIcon, BellIcon } from "../components/icons";
import {
  activeFilterCount,
  apiParams,
  readBrowseState,
  savedSearchFilters,
  writeBrowseState,
  type BrowseState,
  type ListFilterKey,
} from "../lib/browseQuery";
import type { CountryCode, ListingSearchResult, ListingSort, ListingSummary } from "../types/domain";

const EuropeMap = lazy(() => import("../components/browse/EuropeMap"));

const SORT_LABELS: Record<ListingSort, string> = {
  match: "Best match",
  deadline: "Deadline (soonest)",
  newest: "Newest",
  company: "Company (A–Z)",
};

const SEARCH_DEBOUNCE_MS = 300;

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function Browse() {
  const { profile, loading: profileLoading } = useAppData();
  const { reference } = useReferenceData();
  const [searchParams, setSearchParams] = useSearchParams();
  const state = useMemo(() => readBrowseState(searchParams), [searchParams]);

  const [result, setResult] = useState<ListingSearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [searchInput, setSearchInput] = useState(state.query);
  const [showFilters, setShowFilters] = useState(false);
  const [applying, setApplying] = useState<ListingSummary | null>(null);
  const [justApplied, setJustApplied] = useState<string | null>(null);
  const [savingSearch, setSavingSearch] = useState(false);
  const [savedSearchName, setSavedSearchName] = useState("");
  const [savingSearchBusy, setSavingSearchBusy] = useState(false);
  const [savedSearchConfirmed, setSavedSearchConfirmed] = useState(false);
  const resultsTop = useRef<HTMLDivElement>(null);

  // Any filter change goes back to page 1; paging itself passes a page.
  // Each change is a history entry, so Back undoes the last filter — except
  // while typing, which would add one per pause.
  const update = useCallback(
    (patch: Partial<BrowseState>, options: { replace?: boolean } = {}) => {
      setSearchParams(writeBrowseState({ ...state, page: 1, ...patch }), { replace: options.replace });
    },
    [state, setSearchParams]
  );

  const query = apiParams(state);
  useEffect(() => {
    let current = true;
    setLoading(true);
    setLoadError(false);
    api
      .searchListings(query)
      .then((next) => {
        if (current) setResult(next);
      })
      .catch(() => {
        if (current) setLoadError(true);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [query]);

  // Typing updates the URL (and so the results) once the user pauses.
  useEffect(() => {
    if (searchInput.trim() === state.query.trim()) return;
    const timer = setTimeout(() => update({ query: searchInput }, { replace: true }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput, state.query, update]);

  // Keep the box in sync when the URL changes some other way (back button,
  // "Clear all") — but not over the user's own typing, where the URL only
  // lags behind by a trailing space.
  useEffect(() => {
    setSearchInput((typed) => (typed.trim() === state.query.trim() ? typed : state.query));
  }, [state.query]);

  const countryNames = useMemo(
    () => new Map((reference?.regions ?? []).flatMap((r) => r.countries).map((c) => [c.code, c.name])),
    [reference]
  );
  const countryName = useCallback((code: string) => countryNames.get(code as CountryCode) ?? code, [countryNames]);
  const countryCounts = useMemo(
    () => new Map((result?.facets.countries ?? []).map((f) => [f.value, f.count])),
    [result]
  );

  function toggleIn(key: ListFilterKey, value: string) {
    const list = state[key] as string[];
    update({ [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] });
  }

  function changePage(page: number) {
    update({ page });
    resultsTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function clearFilters() {
    setSearchInput("");
    setSearchParams(writeBrowseState({ ...readBrowseState(new URLSearchParams()), sort: state.sort, showMap: state.showMap }));
  }

  function toggleSave(listing: ListingSummary) {
    const setSaved = (saved: boolean) =>
      setResult((prev) =>
        prev ? { ...prev, items: prev.items.map((l) => (l.id === listing.id ? { ...l, saved } : l)) } : prev
      );
    setSaved(!listing.saved);
    const call = listing.saved ? api.unsaveListing(listing.id) : api.saveListing(listing.id);
    // Revert on failure — the request layer already surfaces network errors via thrown Errors.
    call.catch(() => setSaved(listing.saved));
  }

  async function saveCurrentSearch() {
    if (!savedSearchName.trim()) return;
    setSavingSearchBusy(true);
    try {
      await api.createSavedSearch(savedSearchName.trim(), savedSearchFilters(state));
      setSavingSearch(false);
      setSavedSearchName("");
      setSavedSearchConfirmed(true);
      setTimeout(() => setSavedSearchConfirmed(false), 3000);
    } finally {
      setSavingSearchBusy(false);
    }
  }

  // "Languages I speak": the posting languages from the viewer's own
  // profile that at least one result is written in.
  const spokenLanguages = useMemo(() => {
    const available = new Set((result?.facets.languages ?? []).filter((f) => f.count > 0).map((f) => f.value));
    return (profile?.languages ?? []).map((l) => l.language).filter((l) => available.has(l));
  }, [profile, result]);

  if (!profileLoading && profile && !profile.profileComplete) {
    return (
      <div className="page">
        <div className="empty-state">
          <h3>Save your profile first</h3>
          <p style={{ marginBottom: 16 }}>Browse and match scores need a saved profile to work from.</p>
          <Link to="/profile" className="btn btn-primary">
            Go to profile
          </Link>
        </div>
      </div>
    );
  }

  const facets = result?.facets;
  const filterCount = activeFilterCount(state);
  const pageCount = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;

  const chips: { key: string; label: string; remove: () => void }[] = [
    ...state.countries.map((c) => ({ key: `country-${c}`, label: countryName(c), remove: () => toggleIn("countries", c) })),
    ...state.cities.map((c) => ({ key: `city-${c}`, label: c, remove: () => toggleIn("cities", c) })),
    ...state.languages.map((l) => ({ key: `lang-${l}`, label: `In ${l}`, remove: () => toggleIn("languages", l) })),
    ...state.workArrangements.map((w) => ({ key: `wa-${w}`, label: w, remove: () => toggleIn("workArrangements", w) })),
    ...state.durations.map((d) => ({ key: `dur-${d}`, label: d, remove: () => toggleIn("durations", d) })),
    ...(state.fieldOfStudy
      ? [{ key: "field", label: state.fieldOfStudy, remove: () => update({ fieldOfStudy: "" }) }]
      : []),
    ...(state.directOnly ? [{ key: "direct", label: "Direct-posted", remove: () => update({ directOnly: false }) }] : []),
    ...(state.eligibleOnly ? [{ key: "eligible", label: "Eligible only", remove: () => update({ eligibleOnly: false }) }] : []),
  ];

  return (
    <div className="page page-wide">
      <div className="page-header">
        <div>
          <p className="eyebrow">{greeting()}</p>
          <h1>{profile?.name || "Welcome back"}</h1>
        </div>
      </div>

      <div className="search-row">
        <label className="search-bar">
          <SearchIcon />
          <input
            type="search"
            placeholder="Search role, company, city, skills…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </label>
        <button
          type="button"
          className={`search-filter-btn browse-filters-toggle ${showFilters ? "active" : ""}`}
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
          aria-controls="browse-filters"
          aria-label="Filters"
          title="Filters"
        >
          <FilterIcon />
          {filterCount > 0 && <span className="search-filter-count">{filterCount}</span>}
        </button>
      </div>

      <div className="browse-layout">
        <aside id="browse-filters" className={`browse-sidebar ${showFilters ? "open" : ""}`} aria-label="Filters">
          {facets && (
            <>
              <FacetList
                title="Country"
                options={facets.countries}
                selected={state.countries}
                onToggle={(v) => toggleIn("countries", v)}
                label={countryName}
                searchPlaceholder="Find a country"
              />
              <FacetList
                title="City"
                options={facets.cities}
                selected={state.cities}
                onToggle={(v) => toggleIn("cities", v)}
                searchPlaceholder="Find a city"
              />
              <FacetList
                title="Posted in"
                options={facets.languages}
                selected={state.languages}
                onToggle={(v) => toggleIn("languages", v)}
                action={
                  spokenLanguages.length > 0 && (
                    <button type="button" className="facet-action" onClick={() => update({ languages: spokenLanguages })}>
                      Languages I speak
                    </button>
                  )
                }
              />
              <FacetList
                title="Work arrangement"
                options={facets.workArrangements}
                selected={state.workArrangements}
                onToggle={(v) => toggleIn("workArrangements", v)}
              />
              <FacetList
                title="Duration"
                options={facets.durations}
                selected={state.durations}
                onToggle={(v) => toggleIn("durations", v)}
              />
              <FacetList
                title="Field of study"
                options={facets.fieldsOfStudy}
                selected={state.fieldOfStudy ? [state.fieldOfStudy] : []}
                onToggle={(v) => update({ fieldOfStudy: state.fieldOfStudy === v ? "" : v })}
                searchPlaceholder="Find a field"
              />
              <fieldset className="facet">
                <div className="facet-head">
                  <legend>Show only</legend>
                </div>
                <ul className="facet-options">
                  <li>
                    <label className="facet-option">
                      <input
                        type="checkbox"
                        checked={state.eligibleOnly}
                        onChange={() => update({ eligibleOnly: !state.eligibleOnly })}
                      />
                      <span className="facet-label">Listings I'm eligible for</span>
                      <span className="facet-count">{facets.eligible}</span>
                    </label>
                  </li>
                  {(facets.direct > 0 || state.directOnly) && (
                    <li>
                      <label className="facet-option">
                        <input
                          type="checkbox"
                          checked={state.directOnly}
                          onChange={() => update({ directOnly: !state.directOnly })}
                        />
                        <span className="facet-label">Posted directly on InternEZ</span>
                        <span className="facet-count">{facets.direct}</span>
                      </label>
                    </li>
                  )}
                </ul>
              </fieldset>
            </>
          )}
        </aside>

        <section className="browse-results" aria-busy={loading}>
          <div ref={resultsTop} className="browse-results-head">
            <p className="browse-total">
              {result ? (
                <>
                  <strong>{result.total.toLocaleString("en-GB")}</strong>{" "}
                  {result.total === 1 ? "internship" : "internships"}
                </>
              ) : (
                " "
              )}
            </p>
            <div className="browse-actions">
              <button
                type="button"
                className={`btn btn-ghost btn-sm ${state.showMap ? "active" : ""}`}
                aria-pressed={state.showMap}
                onClick={() => setSearchParams(writeBrowseState({ ...state, showMap: !state.showMap }), { replace: true })}
              >
                {state.showMap ? "Hide map" : "Show map"}
              </button>
              {savingSearch ? (
                <span className="browse-save-search">
                  <input
                    className="input"
                    placeholder="Name this search"
                    value={savedSearchName}
                    onChange={(e) => setSavedSearchName(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={saveCurrentSearch}
                    disabled={savingSearchBusy || !savedSearchName.trim()}
                  >
                    {savingSearchBusy ? "Saving…" : "Save"}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSavingSearch(false)}>
                    Cancel
                  </button>
                </span>
              ) : savedSearchConfirmed ? (
                <span className="browse-save-confirmed">Search saved — we'll notify you of new matches.</span>
              ) : (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSavingSearch(true)}>
                  <BellIcon />
                  Save this search
                </button>
              )}
              <label className="sort-control">
                <span>Sort</span>
                <select
                  className="input"
                  value={state.sort}
                  onChange={(e) => update({ sort: e.target.value as ListingSort })}
                >
                  {(Object.keys(SORT_LABELS) as ListingSort[]).map((key) => (
                    <option key={key} value={key}>
                      {SORT_LABELS[key]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {chips.length > 0 && (
            <div className="active-filters" aria-label="Active filters">
              {chips.map((chip) => (
                <button type="button" key={chip.key} className="active-filter" onClick={chip.remove}>
                  {chip.label}
                  <span aria-hidden="true">×</span>
                  <span className="visually-hidden">Remove filter</span>
                </button>
              ))}
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
                Clear all
              </button>
            </div>
          )}

          {state.showMap && (
            <Suspense fallback={<div className="europe-map europe-map-loading">Loading map…</div>}>
              <EuropeMap
                counts={countryCounts}
                selected={state.countries}
                onToggle={(code) => toggleIn("countries", code)}
                countryName={countryName}
              />
            </Suspense>
          )}

          {loadError && (
            <div className="empty-state">
              <h3>Listings couldn't be loaded</h3>
              <p>Check your connection and try again.</p>
            </div>
          )}

          {!result && loading && !loadError && <p className="browse-loading">Loading listings…</p>}

          {result && result.items.length === 0 && !loadError && (
            <div className="empty-state">
              <h3>No listings match these filters</h3>
              <p>Try removing a filter{state.query ? " or searching for something else" : ""}.</p>
            </div>
          )}

          <div className={`browse-list ${loading && result ? "refreshing" : ""}`}>
            {result?.items.map((listing) => (
              <div key={listing.id}>
                <ListingCard
                  listing={listing}
                  onApply={() => setApplying(listing)}
                  onToggleSave={() => toggleSave(listing)}
                />
                {justApplied === listing.id && (
                  <p style={{ fontSize: 13, color: "var(--ok)", marginTop: -8, marginBottom: 16 }}>
                    Application submitted.
                  </p>
                )}
              </div>
            ))}
          </div>

          {result && <Pagination page={result.page} pageCount={pageCount} onChange={changePage} />}
        </section>
      </div>

      {applying && (
        <ApplyModal
          listing={applying}
          onClose={() => setApplying(null)}
          onSubmitted={() => {
            setJustApplied(applying.id);
            setApplying(null);
          }}
        />
      )}
    </div>
  );
}
