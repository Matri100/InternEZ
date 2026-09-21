import { Link } from "react-router-dom";
import type { ListingWithComputed } from "../types/domain";
import { ELIGIBILITY_LABELS } from "./EligibilityFlag";
import { CompanyLogo } from "./CompanyLogo";
import { MetaRow } from "./MetaRow";
import { BookmarkIcon } from "./icons";

export function ListingCard({
  listing,
  onApply,
  onToggleSave,
}: {
  listing: ListingWithComputed;
  onApply: () => void;
  onToggleSave: () => void;
}) {
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
                items={[listing.location, listing.workArrangement, listing.duration, `Starts ${listing.startLabel}`]}
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

          {listing.requiredLanguages.map((l) => (
            <span className="language-badge" key={l.language}>
              {l.language} — {l.minLevel}
            </span>
          ))}

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
        <span className="listing-card-deadline">Apply by {listing.applicationDeadline}</span>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onApply}>
          Apply
        </button>
      </div>
    </div>
  );
}
