import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { useReferenceData } from "../context/ReferenceData";
import { ChipGroup } from "../components/ChipGroup";
import { BookmarkIcon, SearchIcon, FilterIcon } from "../components/icons";
import type { TalentProfile } from "../types/domain";

type QuickFilter = "all" | "shortlisted";

export function TalentBrowse() {
  const { reference } = useReferenceData();
  const [talent, setTalent] = useState<TalentProfile[] | null>(null);
  const [locked, setLocked] = useState(false);
  const [pokedIds, setPokedIds] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [workArrangements, setWorkArrangements] = useState<string[]>([]);
  const [countryFilter, setCountryFilter] = useState("");

  useEffect(() => {
    api
      .getTalent()
      .then(setTalent)
      .catch((err) => {
        if (err instanceof ApiError && err.code === "companyNotVerified") setLocked(true);
        else throw err;
      });
  }, []);

  const activeExtraFilters = workArrangements.length + (countryFilter ? 1 : 0);

  function clearExtraFilters() {
    setWorkArrangements([]);
    setCountryFilter("");
  }

  function toggleFrom(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function toggleShortlist(person: TalentProfile) {
    setTalent((prev) => (prev ? prev.map((p) => (p.id === person.id ? { ...p, shortlisted: !p.shortlisted } : p)) : prev));
    const call = person.shortlisted ? api.unshortlistTalent(person.id) : api.shortlistTalent(person.id);
    call.catch(() => {
      setTalent((prev) => (prev ? prev.map((p) => (p.id === person.id ? { ...p, shortlisted: person.shortlisted } : p)) : prev));
    });
  }

  const visible = useMemo(() => {
    if (!talent) return [];
    const query = searchQuery.trim().toLowerCase();
    return talent.filter((person) => {
      if (quickFilter === "shortlisted" && !person.shortlisted) return false;
      if (workArrangements.length > 0 && !workArrangements.some((w) => person.workArrangementPreference.includes(w as any))) {
        return false;
      }
      if (countryFilter && !person.preferredLocations.includes(countryFilter as any)) return false;
      if (query) {
        const haystack = [person.name, person.summary, ...person.skills, ...person.interests].join(" ").toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [talent, searchQuery, quickFilter, workArrangements, countryFilter]);

  async function poke(id: string) {
    setBusyId(id);
    try {
      await api.pokeTalent(id);
      setPokedIds((prev) => new Set(prev).add(id));
    } finally {
      setBusyId(null);
    }
  }

  async function message(id: string) {
    setBusyId(id);
    try {
      const conversation = await api.startConversation(id);
      navigate(`/messages?c=${conversation.id}`);
    } finally {
      setBusyId(null);
    }
  }

  if (locked) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Discover talent</h1>
            <p>Applicants who've opted in to be found — even for roles they haven't applied to.</p>
          </div>
        </div>
        <div className="empty-state">
          <h3>Opens once your company is verified</h3>
          <p>
            Students who opt in share their CV and contact details here, so only companies InternEZ has verified can
            see them. We review every new company that signs up.
          </p>
        </div>
      </div>
    );
  }

  if (!talent) {
    return (
      <div className="page">
        <p style={{ color: "var(--text-secondary)" }}>Loading…</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Discover talent</h1>
          <p>Applicants who've opted in to be found — even for roles they haven't applied to.</p>
        </div>
      </div>

      {talent.length > 0 && (
        <>
          <div className="search-row">
            <label className="search-bar">
              <SearchIcon />
              <input
                type="search"
                placeholder="Search name, skills, interests…"
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

          {showMoreFilters && reference && (
            <div className="more-filters card">
              <div className="more-filters-row">
                <div className="field">
                  <label>Work arrangement</label>
                  <ChipGroup
                    options={reference.workArrangementPreferences}
                    selected={workArrangements}
                    onToggle={(v) => toggleFrom(workArrangements, setWorkArrangements, v)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="talentCountryFilter">Preferred location</label>
                  <select
                    id="talentCountryFilter"
                    className="input"
                    value={countryFilter}
                    onChange={(e) => setCountryFilter(e.target.value)}
                  >
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

          <div className="browse-controls">
            <div className="filter-row">
              {(
                [
                  ["all", "All"],
                  ["shortlisted", "Shortlisted only"],
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
          </div>
        </>
      )}

      {talent.length === 0 && (
        <div className="empty-state">
          <h3>No one discoverable yet</h3>
          <p>When applicants opt in to talent search, they'll show up here.</p>
        </div>
      )}

      {talent.length > 0 && visible.length === 0 && (
        <div className="empty-state">
          <h3>No one matches these filters</h3>
          <p>Try loosening a filter above.</p>
        </div>
      )}

      <div className="application-list">
        {visible.map((person) => (
          <div className="application-row" key={person.id}>
            <div className="application-row-main">
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <h3 style={{ margin: 0 }}>{person.name}</h3>
                <button
                  type="button"
                  className={`save-btn ${person.shortlisted ? "saved" : ""}`}
                  onClick={() => toggleShortlist(person)}
                  aria-pressed={person.shortlisted}
                  aria-label={person.shortlisted ? "Remove from shortlist" : "Shortlist this candidate"}
                  title={person.shortlisted ? "Remove from shortlist" : "Shortlist this candidate"}
                >
                  <BookmarkIcon filled={person.shortlisted} />
                </button>
              </div>
              {person.primaryEducation && (
                <p className="detail-block" style={{ fontSize: 13.5, color: "var(--text-secondary)" }}>
                  {person.primaryEducation.level} in {person.primaryEducation.field}
                  {person.primaryEducation.institution && ` — ${person.primaryEducation.institution}`}
                </p>
              )}
              {person.summary && (
                <p className="detail-block" style={{ fontSize: 14, color: "var(--text)", maxWidth: "56ch", lineHeight: 1.6 }}>
                  {person.summary}
                </p>
              )}
              {person.skills.length > 0 && (
                <div className="tag-row detail-block">
                  {person.skills.slice(0, 8).map((s) => (
                    <span className="tag" key={s}>
                      {s}
                    </span>
                  ))}
                </div>
              )}
              <div className="detail-block" style={{ display: "flex", gap: 16 }}>
                {person.portfolioUrl && (
                  <a href={person.portfolioUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12.5 }}>
                    Portfolio
                  </a>
                )}
                {person.resume && (
                  <a href={person.resume.dataUrl} download={person.resume.fileName} style={{ fontSize: 12.5 }}>
                    View resume
                  </a>
                )}
              </div>
            </div>
            <div className="application-row-meta" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => message(person.id)}
                disabled={busyId === person.id}
              >
                Message
              </button>
              <button
                type="button"
                className="btn btn-sm"
                style={
                  pokedIds.has(person.id)
                    ? { background: "var(--steel-soft)", color: "var(--steel-ink)", borderColor: "var(--steel)" }
                    : { background: "var(--surface)", color: "var(--text)", borderColor: "var(--border-strong)" }
                }
                onClick={() => poke(person.id)}
                disabled={busyId === person.id || pokedIds.has(person.id)}
              >
                {pokedIds.has(person.id) ? "Poked ✓" : "Poke"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
