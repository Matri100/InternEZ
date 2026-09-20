import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAppData } from "../context/AppData";
import { useReferenceData } from "../context/ReferenceData";
import { ListingCard } from "../components/ListingCard";
import { ApplyModal } from "../components/ApplyModal";
import { ChipGroup } from "../components/ChipGroup";
import { SearchIcon, FilterIcon, BellIcon } from "../components/icons";
import type { ListingWithComputed, SavedSearchFilters } from "../types/domain";

type QuickFilter = "all" | "direct" | "eligible";
type SortKey = "match" | "deadline" | "newest" | "company";

const SORT_LABELS: Record<SortKey, string> = {
  match: "Best match",
  deadline: "Deadline (soonest)",
  newest: "Newest",
  company: "Company (A–Z)",
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function Browse() {
  const { profile, loading: profileLoading } = useAppData();
  const { reference } = useReferenceData();
  const [listings, setListings] = useState<ListingWithComputed[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("match");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [workArrangements, setWorkArrangements] = useState<string[]>([]);
  const [durations, setDurations] = useState<string[]>([]);
  const [fieldFilter, setFieldFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [applying, setApplying] = useState<ListingWithComputed | null>(null);
  const [justApplied, setJustApplied] = useState<string | null>(null);
  const [savingSearch, setSavingSearch] = useState(false);
  const [savedSearchName, setSavedSearchName] = useState("");
  const [savingSearchBusy, setSavingSearchBusy] = useState(false);
  const [savedSearchConfirmed, setSavedSearchConfirmed] = useState(false);

  useEffect(() => {
    api.getListings().then(setListings);
  }, []);

  function toggleSave(listing: ListingWithComputed) {
    setListings((prev) =>
      prev ? prev.map((l) => (l.id === listing.id ? { ...l, saved: !l.saved } : l)) : prev
    );
    const call = listing.saved ? api.unsaveListing(listing.id) : api.saveListing(listing.id);
    call.catch(() => {
      // Revert on failure — the request layer already surfaces network errors via thrown Errors.
      setListings((prev) =>
        prev ? prev.map((l) => (l.id === listing.id ? { ...l, saved: listing.saved } : l)) : prev
      );
    });
  }

  const activeExtraFilters =
    workArrangements.length + durations.length + (fieldFilter ? 1 : 0) + (countryFilter ? 1 : 0);

  function clearExtraFilters() {
    setWorkArrangements([]);
    setDurations([]);
    setFieldFilter("");
    setCountryFilter("");
  }

  function toggleFrom(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  async function saveCurrentSearch() {
    if (!savedSearchName.trim()) return;
    setSavingSearchBusy(true);
    try {
      const filters: SavedSearchFilters = {
        query: searchQuery,
        workArrangements: workArrangements as SavedSearchFilters["workArrangements"],
        durations: durations as SavedSearchFilters["durations"],
        fieldOfStudy: fieldFilter,
        country: countryFilter as SavedSearchFilters["country"],
      };
      await api.createSavedSearch(savedSearchName.trim(), filters);
      setSavingSearch(false);
      setSavedSearchName("");
      setSavedSearchConfirmed(true);
      setTimeout(() => setSavedSearchConfirmed(false), 3000);
    } finally {
      setSavingSearchBusy(false);
    }
  }

  const visible = useMemo(() => {
    if (!listings) return [];
    const query = searchQuery.trim().toLowerCase();
    const filtered = listings.filter((l) => {
      if (quickFilter === "direct" && l.origin !== "direct") return false;
      if (quickFilter === "eligible" && l.eligibilityResult.level !== "ok") return false;
      if (workArrangements.length > 0 && !workArrangements.includes(l.workArrangement)) return false;
      if (durations.length > 0 && !durations.includes(l.duration)) return false;
      if (fieldFilter && !l.targetFields.includes(fieldFilter)) return false;
      if (countryFilter && l.country !== countryFilter) return false;
      if (query) {
        const haystack = [l.title, l.company.name, l.department, l.location, ...l.skills]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "deadline":
          return (a.applicationDeadline || "9999-99-99").localeCompare(b.applicationDeadline || "9999-99-99");
        case "newest":
          return b.createdAt.localeCompare(a.createdAt);
        case "company":
          return a.company.name.localeCompare(b.company.name);
        case "match":
        default:
          return b.match.total - a.match.total;
      }
    });

    return sorted;
  }, [listings, searchQuery, quickFilter, sortKey, workArrangements, durations, fieldFilter, countryFilter]);

  if (!profileLoading && profile && !profile.profileComplete) {
    return (
      <div className="page">
        <div className="empty-state">
          <h3>Save your profile first</h3>
          <p style={{ marginBottom: 16 }}>
            Browse and match scores need a saved profile to work from.
          </p>
          <Link to="/profile" className="btn btn-primary">
            Go to profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
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
            placeholder="Search role, company, skills…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </label>
        <button
          type="button"
          className={`search-filter-btn ${showMoreFilters ? "active" : ""}`}
          onClick={() => setShowMoreFilters((v) => !v)}
          aria-label="More filters"
          title="More filters"
        >
          <FilterIcon />
          {activeExtraFilters > 0 && <span className="search-filter-count">{activeExtraFilters}</span>}
        </button>
      </div>

      <div className="browse-controls">
        <div className="filter-row">
          {(
            [
              ["all", "All"],
              ["direct", "Direct-posted only"],
              ["eligible", "Eligible only"],
            ] as [QuickFilter, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`filter-btn ${quickFilter === key ? "active" : ""}`}
              onClick={() => setQuickFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {savingSearch ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                className="input"
                style={{ width: 170 }}
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
            </div>
          ) : savedSearchConfirmed ? (
            <span style={{ fontSize: 13, color: "var(--ok)" }}>Search saved — we'll notify you of new matches.</span>
          ) : (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSavingSearch(true)}>
              <BellIcon />
              Save this search
            </button>
          )}

          <label className="sort-control">
            <span>Sort</span>
            <select className="input" value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <option key={key} value={key}>
                  {SORT_LABELS[key]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {showMoreFilters && reference && (
        <div className="more-filters card">
          <div className="more-filters-row">
            <div className="field">
              <label>Work arrangement</label>
              <ChipGroup
                options={reference.workArrangements}
                selected={workArrangements}
                onToggle={(v) => toggleFrom(workArrangements, setWorkArrangements, v)}
              />
            </div>
            <div className="field">
              <label>Duration</label>
              <ChipGroup
                options={reference.internshipLengths}
                selected={durations}
                onToggle={(v) => toggleFrom(durations, setDurations, v)}
              />
            </div>
          </div>
          <div className="more-filters-row">
            <div className="field">
              <label htmlFor="fieldFilter">Field of study</label>
              <select id="fieldFilter" className="input" value={fieldFilter} onChange={(e) => setFieldFilter(e.target.value)}>
                <option value="">Any field</option>
                {reference.fieldGroups.map((group) => (
                  <optgroup key={group.category} label={group.category}>
                    {group.fields.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="countryFilter">Country</label>
              <select id="countryFilter" className="input" value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}>
                <option value="">Any country</option>
                {reference.regions.flatMap((r) => r.countries).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {activeExtraFilters > 0 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearExtraFilters}>
              Clear these filters
            </button>
          )}
        </div>
      )}

      {!listings && <p style={{ color: "var(--text-secondary)" }}>Loading listings…</p>}

      {listings && visible.length === 0 && (
        <div className="empty-state">
          <h3>No listings match these filters</h3>
          <p>Try loosening a filter above.</p>
        </div>
      )}

      {visible.map((listing) => (
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
