import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { motionReduced } from "../accessibility/settings";
import { useAppData } from "../context/AppData";
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
import { T, useI18n } from "../i18n";
import { useCityName } from "../lib/cityNames";
import type { MessageKey } from "../i18n/messages/en";
import type { ListingSearchResult, ListingSort, ListingSummary } from "../types/domain";

const EuropeMap = lazy(() => import("../components/browse/EuropeMap"));

const SORT_LABELS: Record<ListingSort, MessageKey> = {
  match: "browse.sortMatch",
  deadline: "browse.sortDeadline",
  newest: "browse.sortNewest",
  company: "browse.sortCompany",
};

const SEARCH_DEBOUNCE_MS = 300;

function greeting(): MessageKey {
  const hour = new Date().getHours();
  if (hour < 12) return "browse.goodMorning";
  if (hour < 18) return "browse.goodAfternoon";
  return "browse.goodEvening";
}

// Language names come lower-case in some languages ("allemand"); as a
// list option they start with a capital.
function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

export function Browse() {
  const { profile, loading: profileLoading } = useAppData();
  const { t, countryName, languageName } = useI18n();
  const cityName = useCityName();
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
    resultsTop.current?.scrollIntoView({ behavior: motionReduced() ? "auto" : "smooth", block: "start" });
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
          <h3>{t("browse.profileFirstTitle")}</h3>
          <p style={{ marginBottom: 16 }}>{t("browse.profileFirstBody")}</p>
          <Link to="/profile" className="btn btn-primary">
            {t("browse.goToProfile")}
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
    ...state.cities.map((c) => ({ key: `city-${c}`, label: cityName(c), remove: () => toggleIn("cities", c) })),
    ...state.languages.map((l) => ({
      key: `lang-${l}`,
      label: t("browse.chipPostedIn", { language: languageName(l) }),
      remove: () => toggleIn("languages", l),
    })),
    ...state.workArrangements.map((w) => ({
      key: `wa-${w}`,
      label: t(`arrangement.${w}`),
      remove: () => toggleIn("workArrangements", w),
    })),
    ...state.durations.map((d) => ({ key: `dur-${d}`, label: t(`duration.${d}`), remove: () => toggleIn("durations", d) })),
    ...(state.fieldOfStudy
      ? [{ key: "field", label: state.fieldOfStudy, remove: () => update({ fieldOfStudy: "" }) }]
      : []),
    ...(state.directOnly
      ? [{ key: "direct", label: t("browse.directChip"), remove: () => update({ directOnly: false }) }]
      : []),
    ...(state.eligibleOnly
      ? [{ key: "eligible", label: t("browse.eligibleChip"), remove: () => update({ eligibleOnly: false }) }]
      : []),
  ];

  return (
    <div className="page page-wide">
      <div className="page-header">
        <div>
          <p className="eyebrow">{t(greeting())}</p>
          <h1>{profile?.name || t("browse.welcomeBack")}</h1>
        </div>
      </div>

      <div className="search-row">
        <label className="search-bar">
          <SearchIcon />
          <input
            type="search"
            placeholder={t("browse.searchPlaceholder")}
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
          aria-label={t("browse.filters")}
          title={t("browse.filters")}
        >
          <FilterIcon />
          {filterCount > 0 && <span className="search-filter-count">{filterCount}</span>}
        </button>
      </div>

      <div className="browse-layout">
        <aside
          id="browse-filters"
          className={`browse-sidebar ${showFilters ? "open" : ""}`}
          aria-label={t("browse.filters")}
        >
          {facets && (
            <>
              <FacetList
                title={t("browse.facetCountry")}
                options={facets.countries}
                selected={state.countries}
                onToggle={(v) => toggleIn("countries", v)}
                label={countryName}
                searchPlaceholder={t("browse.findCountry")}
              />
              <FacetList
                title={t("browse.facetCity")}
                options={facets.cities}
                selected={state.cities}
                onToggle={(v) => toggleIn("cities", v)}
                label={cityName}
                searchPlaceholder={t("browse.findCity")}
              />
              <FacetList
                title={t("browse.facetPostedIn")}
                options={facets.languages}
                selected={state.languages}
                onToggle={(v) => toggleIn("languages", v)}
                label={(v) => capitalize(languageName(v))}
                action={
                  spokenLanguages.length > 0 && (
                    <button type="button" className="facet-action" onClick={() => update({ languages: spokenLanguages })}>
                      {t("browse.languagesISpeak")}
                    </button>
                  )
                }
              />
              <FacetList
                title={t("browse.facetArrangement")}
                options={facets.workArrangements}
                selected={state.workArrangements}
                onToggle={(v) => toggleIn("workArrangements", v)}
                label={(v) => t(`arrangement.${v}` as MessageKey)}
              />
              <FacetList
                title={t("browse.facetDuration")}
                options={facets.durations}
                selected={state.durations}
                onToggle={(v) => toggleIn("durations", v)}
                label={(v) => t(`duration.${v}` as MessageKey)}
              />
              <FacetList
                title={t("browse.facetField")}
                options={facets.fieldsOfStudy}
                selected={state.fieldOfStudy ? [state.fieldOfStudy] : []}
                onToggle={(v) => update({ fieldOfStudy: state.fieldOfStudy === v ? "" : v })}
                searchPlaceholder={t("browse.findField")}
              />
              <fieldset className="facet">
                <div className="facet-head">
                  <legend>{t("browse.facetShowOnly")}</legend>
                </div>
                <ul className="facet-options">
                  <li>
                    <label className="facet-option">
                      <input
                        type="checkbox"
                        checked={state.eligibleOnly}
                        onChange={() => update({ eligibleOnly: !state.eligibleOnly })}
                      />
                      <span className="facet-label">{t("browse.onlyEligible")}</span>
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
                        <span className="facet-label">{t("browse.onlyDirect")}</span>
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
                <T k="browse.total" params={{ count: result.total }} tags={{ b: <strong /> }} />
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
                {state.showMap ? t("browse.hideMap") : t("browse.showMap")}
              </button>
              {savingSearch ? (
                <span className="browse-save-search">
                  <input
                    className="input"
                    placeholder={t("browse.nameSearch")}
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
                    {savingSearchBusy ? t("common.saving") : t("common.save")}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSavingSearch(false)}>
                    {t("common.cancel")}
                  </button>
                </span>
              ) : savedSearchConfirmed ? (
                <span className="browse-save-confirmed">{t("browse.searchSaved")}</span>
              ) : (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSavingSearch(true)}>
                  <BellIcon />
                  {t("browse.saveSearch")}
                </button>
              )}
              <label className="sort-control">
                <span>{t("browse.sort")}</span>
                <select
                  className="input"
                  value={state.sort}
                  onChange={(e) => update({ sort: e.target.value as ListingSort })}
                >
                  {(Object.keys(SORT_LABELS) as ListingSort[]).map((key) => (
                    <option key={key} value={key}>
                      {t(SORT_LABELS[key])}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {chips.length > 0 && (
            <div className="active-filters" aria-label={t("browse.activeFilters")}>
              {chips.map((chip) => (
                <button type="button" key={chip.key} className="active-filter" onClick={chip.remove}>
                  {chip.label}
                  <span aria-hidden="true">×</span>
                  <span className="visually-hidden">{t("browse.removeFilter")}</span>
                </button>
              ))}
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
                {t("browse.clearAll")}
              </button>
            </div>
          )}

          {state.showMap && (
            <Suspense fallback={<div className="europe-map europe-map-loading">{t("browse.loadingMap")}</div>}>
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
              <h3>{t("browse.loadError")}</h3>
              <p>{t("browse.loadErrorBody")}</p>
            </div>
          )}

          {!result && loading && !loadError && <p className="browse-loading">{t("browse.loadingListings")}</p>}

          {result && result.items.length === 0 && !loadError && (
            <div className="empty-state">
              <h3>{t("browse.noResults")}</h3>
              <p>{state.query ? t("browse.noResultsBodyQuery") : t("browse.noResultsBody")}</p>
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
                    {t("common.applicationSubmitted")}
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
