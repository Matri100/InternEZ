import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { ListingWithComputed } from "../types/domain";
import { ELIGIBILITY_LABELS } from "./EligibilityFlag";
import { CompanyLogo } from "./CompanyLogo";
import { MetaRow } from "./MetaRow";
import { BookmarkIcon } from "./icons";
import { useReferenceData } from "../context/ReferenceData";
import { deadlineLabel, durationLabel, startLabel } from "../lib/listingFacts";

export function ListingCard({
  listing,
  onApply,
  onToggleSave,
}: {
  listing: ListingWithComputed;
  onApply: () => void;
  onToggleSave: () => void;
}) {
  const { reference } = useReferenceData();
  // Per-language "Danish — Fluent" tags were too much noise on a card meant
  // to be scanned quickly, and mostly duplicated what the eligibility badge
  // already says. citizenOnly is the sharper, rarer signal underneath it —
  // a listing restricted to one country's citizens, which is exactly what
  // a non-English posting usually implies. Named directly ("France citizens
  // only") rather than a generic "closed to international" so a matching
  // applicant can self-identify at a glance. The fuller language breakdown
  // stays on the listing detail page for anyone who clicks in.
  const citizenOnlyLabel = useMemo(() => {
    const code = listing.eligibility.citizenOnly;
    if (!code) return null;
    const name = reference?.regions.flatMap((r) => r.countries).find((c) => c.code === code)?.name ?? code;
    return `${name} citizens only`;
  }, [listing.eligibility.citizenOnly, reference]);
  const start = startLabel(listing);
  const deadline = deadlineLabel(listing);

  return (
    <div className="listing-card">
      <div className="listing-card-top">
        <CompanyLogo name={listing.company.name} logoUrl={listing.company.logoUrl} size={44} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="listing-title-row">
            <Link to={`/listings/${listing.id}`}>{listing.title}</Link>
          </div>
          <div className="listing-meta" style={{ marginTop: 4 }}>
            <span className="company">
              {listing.company.name}
              {listing.company.verified && <span className="verified-mark" title="Verified employer"> ✓</span>}
            </span>
            <span className="detail-row">
              <MetaRow
                items={[
                  listing.location,
                  listing.workArrangement,
                  durationLabel(listing),
                  start && `Starts ${start}`,
                ]}
              />
            </span>
          </div>
        </div>

        <div className="listing-card-flags">
          <span
            className={`eligibility-badge ${listing.eligibilityResult.level}`}
            title={listing.eligibilityResult.why}
          >
            {ELIGIBILITY_LABELS[listing.eligibilityResult.level]}
          </span>

          {citizenOnlyLabel && <span className="listing-flag-badge">{citizenOnlyLabel}</span>}

          {listing.language !== "English" && (
            <span className="listing-flag-badge" title="Not translated — shown as posted">
              Posted in {listing.language}
            </span>
          )}

          {listing.origin === "sourced" && (
            <span
              className="listing-flag-badge"
              title="Pulled from the employer's own hiring system — applying links out to their site"
            >
              External listing
            </span>
          )}

          <button
            type="button"
            className={`save-btn ${listing.saved ? "saved" : ""}`}
            onClick={onToggleSave}
            aria-pressed={listing.saved}
            aria-label={listing.saved ? "Remove from saved" : "Save for later"}
            title={listing.saved ? "Remove from saved" : "Save for later"}
          >
            <BookmarkIcon filled={listing.saved} />
          </button>
        </div>
      </div>

      <div className="listing-card-footer">
        <span className="listing-card-deadline">{deadline && `Apply by ${deadline}`}</span>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onApply}>
          Apply
        </button>
      </div>
    </div>
  );
}
