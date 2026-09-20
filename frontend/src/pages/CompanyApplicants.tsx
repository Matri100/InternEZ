import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { MetaRow } from "../components/MetaRow";
import { COMPANY_SETTABLE_STATUSES, APPLICATION_STATUS_LABELS } from "../lib/applicationStatus";
import { SearchIcon } from "../components/icons";
import type { ApplicationStatus, ApplicationWithApplicant } from "../types/domain";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

type QuickFilter = "all" | ApplicationStatus;
type ViewMode = "list" | "board";
type SortKey = "newest" | "oldest" | "name";

const BOARD_COLUMNS: ApplicationStatus[] = [
  "applied",
  "appliedExternally",
  "reviewing",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
];

const SORT_LABELS: Record<SortKey, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  name: "Applicant name (A–Z)",
};

export function CompanyApplicants() {
  const [applications, setApplications] = useState<ApplicationWithApplicant[] | null>(null);
  const [messaging, setMessaging] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [view, setView] = useState<ViewMode>("list");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  useEffect(() => {
    api.getCompanyApplications().then(setApplications);
  }, []);

  function changeStatus(id: string, status: ApplicationStatus) {
    const previous = applications;
    setApplications((prev) => (prev ? prev.map((a) => (a.id === id ? { ...a, status } : a)) : prev));
    api.updateApplicationStatus(id, status).catch(() => setApplications(previous));
  }

  async function message(applicantId: string) {
    setMessaging(applicantId);
    try {
      const conversation = await api.startConversation(applicantId);
      navigate(`/messages?c=${conversation.id}`);
    } finally {
      setMessaging(null);
    }
  }

  const visible = useMemo(() => {
    if (!applications) return [];
    const query = searchQuery.trim().toLowerCase();
    const filtered = applications.filter((app) => {
      if (quickFilter !== "all" && app.status !== quickFilter) return false;
      if (query) {
        const haystack = [app.applicant.name, app.listingTitle, ...app.applicant.skills].join(" ").toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
    const sorted = [...filtered];
    switch (sortKey) {
      case "newest":
        sorted.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
        break;
      case "oldest":
        sorted.sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
        break;
      case "name":
        sorted.sort((a, b) => a.applicant.name.localeCompare(b.applicant.name));
        break;
    }
    return sorted;
  }, [applications, searchQuery, quickFilter, sortKey]);

  if (!applications) {
    return (
      <div className="page">
        <p style={{ color: "var(--text-secondary)" }}>Loading…</p>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="page">
        <div className="empty-state">
          <h3>No applications yet</h3>
          <p>Once someone applies to one of your listings, they'll show up here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Applicants</h1>
          <p>{applications.length} application{applications.length === 1 ? "" : "s"} received across your listings.</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div className="view-toggle">
            <button type="button" className={view === "list" ? "active" : ""} onClick={() => setView("list")}>
              List
            </button>
            <button type="button" className={view === "board" ? "active" : ""} onClick={() => setView("board")}>
              Board
            </button>
          </div>
          <a href="/api/company/applications/export.csv" className="btn btn-secondary btn-sm">
            Export CSV
          </a>
        </div>
      </div>

      <div className="search-row">
        <label className="search-bar">
          <SearchIcon />
          <input
            type="search"
            placeholder="Search applicant, listing, skills…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </label>
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

      {view === "list" && (
        <div className="filter-row" style={{ marginBottom: "var(--space-4)" }}>
          {(["all", ...BOARD_COLUMNS] as QuickFilter[]).map((key) => (
            <button
              key={key}
              type="button"
              className={`filter-btn ${quickFilter === key ? "active" : ""}`}
              onClick={() => setQuickFilter(key)}
            >
              {key === "all" ? "All" : APPLICATION_STATUS_LABELS[key]}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 && (
        <div className="empty-state">
          <h3>No applicants match these filters</h3>
          <p>Try loosening a filter above.</p>
        </div>
      )}

      {view === "list" ? (
        <div className="application-list">
          {visible.map((app) => {
            const isExpanded = expanded.has(app.id);
            return (
            <div className="application-row" key={app.id}>
              <div className="application-row-main">
                <button
                  type="button"
                  className="application-row-toggle"
                  onClick={() => toggleExpanded(app.id)}
                  aria-expanded={isExpanded}
                >
                  <h3>{app.applicant.name}</h3>
                  <span className={`chevron ${isExpanded ? "open" : ""}`} aria-hidden="true">
                    ▾
                  </span>
                </button>
                <span className="company">Applied to {app.listingTitle}</span>
                {app.status === "appliedExternally" && (
                  <p className="detail-block" style={{ fontSize: 13, color: "var(--text-faint)" }}>
                    Sourced listing — this applicant went through, but there's no InternEZ pipeline to move it
                    through; the status shown here won't change automatically.
                  </p>
                )}
                <p className="detail-block" style={{ fontSize: 13.5, color: "var(--text-secondary)" }}>
                  <MetaRow
                    items={[
                      app.applicant.primaryEducation
                        ? `${app.applicant.primaryEducation.level} in ${app.applicant.primaryEducation.field}`
                        : null,
                      app.applicant.skills.length > 0
                        ? `${app.applicant.skills.length} skill${app.applicant.skills.length === 1 ? "" : "s"} listed`
                        : null,
                    ]}
                  />
                </p>

                {isExpanded && (
                  <>
                    {app.applicant.primaryEducation?.institution && (
                      <p className="detail-block" style={{ fontSize: 13.5, color: "var(--text-secondary)" }}>
                        {app.applicant.primaryEducation.institution}
                      </p>
                    )}
                    {app.applicant.summary && (
                      <p className="detail-block" style={{ fontSize: 14, color: "var(--text)", maxWidth: "56ch", lineHeight: 1.6 }}>
                        {app.applicant.summary}
                      </p>
                    )}
                    {app.applicant.skills.length > 0 && (
                      <div className="tag-row detail-block">
                        {app.applicant.skills.slice(0, 8).map((s) => (
                          <span className="tag" key={s}>
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                    {app.extraAnswers.length > 0 && (
                      <div className="detail-block detail-block-divider">
                        {app.extraAnswers.map((a) => (
                          <p key={a.key} style={{ fontSize: 13.5, color: "var(--text-secondary)", maxWidth: "56ch", marginBottom: 6, lineHeight: 1.5 }}>
                            <strong style={{ color: "var(--text)" }}>{a.prompt}</strong> {a.answer}
                          </p>
                        ))}
                      </div>
                    )}
                    <p className="detail-block" style={{ fontSize: 12.5, color: "var(--text-faint)" }}>
                      <MetaRow
                        items={[
                          app.applicant.email,
                          app.applicant.phone || null,
                          app.applicant.portfolioUrl ? (
                            <a key="portfolio" href={app.applicant.portfolioUrl} target="_blank" rel="noreferrer">
                              Portfolio
                            </a>
                          ) : null,
                          app.applicant.resume ? (
                            <a key="resume" href={app.applicant.resume.dataUrl} download={app.applicant.resume.fileName}>
                              View resume
                            </a>
                          ) : null,
                        ]}
                      />
                    </p>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm detail-block"
                      onClick={() => message(app.applicant.id)}
                      disabled={messaging === app.applicant.id}
                    >
                      {messaging === app.applicant.id ? "Opening…" : "Message"}
                    </button>
                  </>
                )}
              </div>
              <div className="application-row-meta">
                {!COMPANY_SETTABLE_STATUSES.includes(app.status) ? (
                  <span className={`status-badge ${app.status}`}>{APPLICATION_STATUS_LABELS[app.status]}</span>
                ) : (
                  <select
                    className={`status-select ${app.status}`}
                    value={app.status}
                    onChange={(e) => changeStatus(app.id, e.target.value as ApplicationStatus)}
                    aria-label={`Status for ${app.applicant.name}`}
                  >
                    {COMPANY_SETTABLE_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {APPLICATION_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                )}
                {app.overridden && <span className="override-badge">Applied despite flag</span>}
                <span>{formatDate(app.submittedAt)}</span>
              </div>
            </div>
            );
          })}
        </div>
      ) : (
        <div className="kanban-board">
          {BOARD_COLUMNS.map((status) => {
            const column = visible.filter((a) => a.status === status);
            return (
              <div className="kanban-column" key={status}>
                <div className="kanban-column-header">
                  <span className={`status-badge ${status}`}>{APPLICATION_STATUS_LABELS[status]}</span>
                  <span className="kanban-column-count">{column.length}</span>
                </div>
                <div className="kanban-column-body">
                  {column.map((app) => (
                    <div className="kanban-card" key={app.id}>
                      <strong>{app.applicant.name}</strong>
                      <span>{app.listingTitle}</span>
                      <span className="kanban-card-date">{formatDate(app.submittedAt)}</span>
                      {COMPANY_SETTABLE_STATUSES.includes(app.status) ? (
                        <select
                          className={`status-select ${app.status}`}
                          value={app.status}
                          onChange={(e) => changeStatus(app.id, e.target.value as ApplicationStatus)}
                          aria-label={`Status for ${app.applicant.name}`}
                        >
                          {COMPANY_SETTABLE_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {APPLICATION_STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={`status-badge ${app.status}`}>{APPLICATION_STATUS_LABELS[app.status]}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
