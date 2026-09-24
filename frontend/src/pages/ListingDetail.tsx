import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { EligibilityFlag } from "../components/EligibilityFlag";
import { MatchBar } from "../components/MatchBar";
import { MatchSummary } from "../components/MatchSummary";
import { ApplyModal } from "../components/ApplyModal";
import { CompanyLogo } from "../components/CompanyLogo";
import { Description } from "../components/Description";
import { MetaRow } from "../components/MetaRow";
import { BookmarkIcon } from "../components/icons";
import { NOT_SPECIFIED, deadlineLabel, durationLabel, startLabel } from "../lib/listingFacts";
import type { ListingWithComputed } from "../types/domain";

function FactValue({ value }: { value: string | null }) {
  return value ? <span>{value}</span> : <span className="fact-missing">{NOT_SPECIFIED}</span>;
}

export function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<ListingWithComputed | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .getListing(id)
      .then(setListing)
      .catch(() => setNotFound(true));
  }, [id]);

  function toggleSave() {
    if (!listing) return;
    const nextSaved = !listing.saved;
    setListing({ ...listing, saved: nextSaved });
    const call = nextSaved ? api.saveListing(listing.id) : api.unsaveListing(listing.id);
    call.catch(() => setListing((prev) => (prev ? { ...prev, saved: !nextSaved } : prev)));
  }

  if (notFound) {
    return (
      <div className="page page-narrow">
        <div className="empty-state">
          <h3>Listing not found</h3>
          <Link to="/browse" className="btn btn-secondary" style={{ marginTop: 12 }}>
            Back to browse
          </Link>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="page page-narrow">
        <p style={{ color: "var(--text-secondary)" }}>Loading…</p>
      </div>
    );
  }

  return (
    <div className="page">
      <Link to="/browse" style={{ fontSize: 13, color: "var(--text-secondary)", textDecoration: "none" }}>
        ← Back to browse
      </Link>

      <div className="detail-header" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div className="listing-title-row" style={{ alignItems: "center" }}>
            <CompanyLogo name={listing.company.name} logoUrl={listing.company.logoUrl} size={48} />
            <div>
              <div className="listing-title-row">
                <a>{listing.title}</a>
              </div>
              <div className="listing-meta" style={{ marginTop: 4 }}>
                <span className="company">
                  {listing.company.name}
                  {listing.company.verified && <span className="verified-mark" title="Verified employer"> ✓</span>}
                </span>
                <span className="detail-row">
                  <MetaRow items={[listing.location, listing.workArrangement, durationLabel(listing)]} />
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className={`save-btn ${listing.saved ? "saved" : ""}`}
            onClick={toggleSave}
            aria-pressed={listing.saved}
            aria-label={listing.saved ? "Remove from saved" : "Save for later"}
            title={listing.saved ? "Remove from saved" : "Save for later"}
          >
            <BookmarkIcon filled={listing.saved} />
          </button>
        </div>
        <div style={{ marginTop: 12 }}>
          <EligibilityFlag result={listing.eligibilityResult} />
        </div>
      </div>

      {applied && <div className="banner">Application submitted — you can see it under Applications.</div>}

      <div className="detail-grid">
        <div>
          <div className="detail-section">
            <h3>About this role</h3>
            <Description text={listing.description} />
          </div>

          {listing.requirements.length > 0 && (
            <div className="detail-section">
              <h3>Requirements</h3>
              <ul>
                {listing.requirements.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {listing.skills.length > 0 && (
            <div className="detail-section">
              <h3>Skills</h3>
              <div className="tag-row">
                {listing.skills.map((s) => (
                  <span className="tag" key={s}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {listing.requiredLanguages.length > 0 && (
            <div className="detail-section">
              <h3>Language requirements</h3>
              <div className="tag-row">
                {listing.requiredLanguages.map((l) => (
                  <span className="tag" key={l.language}>
                    {l.language} — {l.minLevel}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="detail-section">
            <h3>Match breakdown</h3>
            <MatchBar match={listing.match} />
          </div>
        </div>

        <div className="detail-sidebar">
          <div className="sidebar-card">
            <MatchSummary match={listing.match} />
          </div>

          <div className="sidebar-card">
            {listing.department && (
              <div className="sidebar-fact">
                <span>Department</span>
                <span>{listing.department}</span>
              </div>
            )}
            <div className="sidebar-fact">
              <span>Work arrangement</span>
              <span>{listing.workArrangement}</span>
            </div>
            <div className="sidebar-fact">
              <span>Min. education</span>
              <span>{listing.requiredEducationLevel}</span>
            </div>
            <div className="sidebar-fact">
              <span>Duration</span>
              <FactValue value={durationLabel(listing)} />
            </div>
            <div className="sidebar-fact">
              <span>Start</span>
              <FactValue value={startLabel(listing)} />
            </div>
            {listing.endLabel && (
              <div className="sidebar-fact">
                <span>End</span>
                <span>{listing.endLabel}</span>
              </div>
            )}
            <div className="sidebar-fact">
              <span>Deadline</span>
              <FactValue value={deadlineLabel(listing)} />
            </div>
            <div className="sidebar-fact">
              <span>Compensation</span>
              <FactValue value={listing.compensation || null} />
            </div>
          </div>

          <button type="button" className="btn btn-primary" onClick={() => setApplying(true)} disabled={applied}>
            {applied ? "Applied" : "Apply"}
          </button>
        </div>
      </div>

      {applying && (
        <ApplyModal
          listing={listing}
          onClose={() => setApplying(false)}
          onSubmitted={() => {
            setApplied(true);
            setApplying(false);
          }}
        />
      )}
    </div>
  );
}
