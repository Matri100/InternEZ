import { Link } from "react-router-dom";
import type { ListingSummary } from "../types/domain";
import { CompanyLogo } from "./CompanyLogo";
import { MetaRow } from "./MetaRow";
import { BookmarkIcon } from "./icons";
import { languageCodeOf, useI18n } from "../i18n";
import { eligibilityText } from "../lib/explanations";
import { deadlineLabel, knownDuration, startLabel } from "../lib/listingFacts";

export function ListingCard({
  listing,
  onApply,
  onToggleSave,
}: {
  listing: ListingSummary;
  onApply: () => void;
  onToggleSave: () => void;
}) {
  const { t, locale, formatDate, countryName, languageName } = useI18n();
  // Per-language "Danish — Fluent" tags were too much noise on a card meant
  // to be scanned quickly, and mostly duplicated what the eligibility badge
  // already says. citizenOnly is the sharper, rarer signal underneath it —
  // a listing restricted to one country's citizens, which is exactly what
  // a non-English posting usually implies. Named directly ("France citizens
  // only") rather than a generic "closed to international" so a matching
  // applicant can self-identify at a glance. The fuller language breakdown
  // stays on the listing detail page for anyone who clicks in.
  const citizenOnly = listing.eligibility.citizenOnly;
  const citizenOnlyLabel = citizenOnly ? t("listing.citizensOnly", { country: countryName(citizenOnly) }) : null;
  const start = startLabel(listing);
  const deadline = deadlineLabel(listing, formatDate);
  const duration = knownDuration(listing);
  const saveLabel = listing.saved ? t("listing.unsave") : t("listing.save");

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
              {listing.company.verified && (
                <span className="verified-mark" title={t("listing.verified")}>
                  {" "}
                  ✓
                </span>
              )}
            </span>
            <span className="detail-row">
              <MetaRow
                items={[
                  listing.location,
                  t(`arrangement.${listing.workArrangement}`),
                  duration && t(`duration.${duration}`),
                  start && t("listing.startsOn", { date: start }),
                ]}
              />
            </span>
          </div>
        </div>

        <div className="listing-card-flags">
          <span
            className={`eligibility-badge ${listing.eligibilityResult.level}`}
            title={eligibilityText(listing.eligibilityResult, t, countryName)}
          >
            {t(`eligibility.${listing.eligibilityResult.level}`)}
          </span>

          {citizenOnlyLabel && <span className="listing-flag-badge">{citizenOnlyLabel}</span>}

          {/* Only when the posting isn't in the language the site is shown in. */}
          {languageCodeOf(listing.language) !== locale && (
            <span className="listing-flag-badge" title={t("listing.postedInTitle")}>
              {t("listing.postedIn", { language: languageName(listing.language) })}
            </span>
          )}

          {listing.origin === "sourced" && (
            <span className="listing-flag-badge" title={t("listing.externalTitle")}>
              {t("listing.external")}
            </span>
          )}

          <button
            type="button"
            className={`save-btn ${listing.saved ? "saved" : ""}`}
            onClick={onToggleSave}
            aria-pressed={listing.saved}
            aria-label={saveLabel}
            title={saveLabel}
          >
            <BookmarkIcon filled={listing.saved} />
          </button>
        </div>
      </div>

      <div className="listing-card-footer">
        <span className="listing-card-deadline">{deadline && t("listing.applyBy", { date: deadline })}</span>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onApply}>
          {t("listing.apply")}
        </button>
      </div>
    </div>
  );
}
