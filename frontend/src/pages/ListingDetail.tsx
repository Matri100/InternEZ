import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { EligibilityFlag } from "../components/EligibilityFlag";
import { MatchBar } from "../components/MatchBar";
import { MatchSummary } from "../components/MatchSummary";
import { ApplyModal } from "../components/ApplyModal";
import { ReportListingModal } from "../components/ReportListingModal";
import { CompanyLogo } from "../components/CompanyLogo";
import { Description } from "../components/Description";
import { MetaRow } from "../components/MetaRow";
import { BookmarkIcon } from "../components/icons";
import { useI18n } from "../i18n";
import { deadlineLabel, knownDuration, startLabel } from "../lib/listingFacts";
import type { ListingWithComputed } from "../types/domain";

function FactValue({ value }: { value: string | null }) {
  const { t } = useI18n();
  return value ? <span>{value}</span> : <span className="fact-missing">{t("common.notSpecified")}</span>;
}

export function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<ListingWithComputed | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [applying, setApplying] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [applied, setApplied] = useState(false);
  const { t, formatDate, languageName } = useI18n();

  useEffect(() => {
    if (!id) return;
    api
      .getListing(id)
      .then(setListing)
      .catch((err) => {
        if (err instanceof ApiError && err.code === "listingRemoved") setRemoved(true);
        else setNotFound(true);
      });
  }, [id]);

  function toggleSave() {
    if (!listing) return;
    const nextSaved = !listing.saved;
    setListing({ ...listing, saved: nextSaved });
    const call = nextSaved ? api.saveListing(listing.id) : api.unsaveListing(listing.id);
    call.catch(() => setListing((prev) => (prev ? { ...prev, saved: !nextSaved } : prev)));
  }

  if (notFound || removed) {
    return (
      <div className="page page-narrow">
        <div className="empty-state">
          <h3>{removed ? t("listing.removedTitle") : t("listing.notFound")}</h3>
          {removed && <p>{t("listing.removedBody")}</p>}
          <Link to="/browse" className="btn btn-secondary" style={{ marginTop: 12 }}>
            {t("listing.backToBrowse")}
          </Link>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="page page-narrow">
        <p style={{ color: "var(--text-secondary)" }}>{t("common.loading")}</p>
      </div>
    );
  }

  const duration = knownDuration(listing);
  const saveLabel = listing.saved ? t("listing.unsave") : t("listing.save");

  return (
    <div className="page">
      <Link to="/browse" style={{ fontSize: 13, color: "var(--text-secondary)", textDecoration: "none" }}>
        ← {t("listing.backToBrowse")}
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
                    ]}
                  />
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className={`save-btn ${listing.saved ? "saved" : ""}`}
            onClick={toggleSave}
            aria-pressed={listing.saved}
            aria-label={saveLabel}
            title={saveLabel}
          >
            <BookmarkIcon filled={listing.saved} />
          </button>
        </div>
        <div style={{ marginTop: 12 }}>
          <EligibilityFlag result={listing.eligibilityResult} />
        </div>
      </div>

      {applied && <div className="banner">{t("listing.appliedBanner")}</div>}

      <div className="detail-grid">
        <div>
          <div className="detail-section">
            <h3>{t("listing.about")}</h3>
            <Description text={listing.description} />
          </div>

          {listing.requirements.length > 0 && (
            <div className="detail-section">
              <h3>{t("listing.requirements")}</h3>
              <ul>
                {listing.requirements.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {listing.skills.length > 0 && (
            <div className="detail-section">
              <h3>{t("listing.skills")}</h3>
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
              <h3>{t("listing.languageRequirements")}</h3>
              <div className="tag-row">
                {listing.requiredLanguages.map((l) => (
                  <span className="tag" key={l.language}>
                    {languageName(l.language)} — {t(`languageLevel.${l.minLevel}`)}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="detail-section">
            <h3>{t("listing.matchBreakdown")}</h3>
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
                <span>{t("listing.department")}</span>
                <span>{listing.department}</span>
              </div>
            )}
            <div className="sidebar-fact">
              <span>{t("listing.workArrangement")}</span>
              <span>{t(`arrangement.${listing.workArrangement}`)}</span>
            </div>
            <div className="sidebar-fact">
              <span>{t("listing.minEducation")}</span>
              <span>{t(`education.${listing.requiredEducationLevel}`)}</span>
            </div>
            <div className="sidebar-fact">
              <span>{t("listing.duration")}</span>
              <FactValue value={duration && t(`duration.${duration}`)} />
            </div>
            <div className="sidebar-fact">
              <span>{t("listing.start")}</span>
              <FactValue value={startLabel(listing)} />
            </div>
            {listing.endLabel && (
              <div className="sidebar-fact">
                <span>{t("listing.end")}</span>
                <span>{listing.endLabel}</span>
              </div>
            )}
            <div className="sidebar-fact">
              <span>{t("listing.deadline")}</span>
              <FactValue value={deadlineLabel(listing, formatDate)} />
            </div>
            <div className="sidebar-fact">
              <span>{t("listing.compensation")}</span>
              <FactValue value={listing.compensation || null} />
            </div>
          </div>

          <button type="button" className="btn btn-primary" onClick={() => setApplying(true)} disabled={applied}>
            {applied ? t("listing.applied") : t("listing.apply")}
          </button>

          {listing.reported ? (
            <p className="report-link-done">{t("report.reported")}</p>
          ) : (
            <button type="button" className="report-link" onClick={() => setReporting(true)}>
              {t("report.open")}
            </button>
          )}
        </div>
      </div>

      {reporting && (
        <ReportListingModal
          listingId={listing.id}
          onClose={() => setReporting(false)}
          onReported={() => setListing((prev) => (prev ? { ...prev, reported: true } : prev))}
        />
      )}

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
