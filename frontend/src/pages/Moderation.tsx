// InternEZ's own moderation page: reviewing company accounts and acting on
// reported listings. Only accounts listed in the backend's ADMIN_USER_IDS
// can load it. It's for the InternEZ team, not the public, so it stays in
// English rather than going through the translations.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { ModerationCompany, ModerationOverview, ModerationReportedListing, ReportReason } from "../types/domain";

const REASON_LABELS: Record<ReportReason, string> = {
  scam: "Scam or fake",
  discriminatory: "Discriminatory or offensive",
  inaccurate: "Wrong or misleading",
  closed: "No longer available",
  other: "Something else",
};

// What the company is told when a listing comes down, pre-filled from the
// most common report reason — edited before sending whenever it doesn't fit.
const REMOVAL_TEMPLATES: Record<ReportReason, string> = {
  scam: "It breaks InternEZ's rules for genuine internship offers.",
  discriminatory: "It contains discriminatory or offensive requirements.",
  inaccurate: "Its information is wrong or misleading.",
  closed: "The position is no longer available.",
  other: "It doesn't meet InternEZ's listing guidelines.",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function topReason(listing: ModerationReportedListing): ReportReason {
  const counts = new Map<ReportReason, number>();
  for (const r of listing.reports) counts.set(r.reason, (counts.get(r.reason) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function websiteHref(website: string) {
  return /^https?:\/\//i.test(website) ? website : `https://${website}`;
}

export function Moderation() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<ModerationOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [removing, setRemoving] = useState<{ listingId: string; reason: string } | null>(null);

  function load() {
    api
      .getModeration()
      .then(setOverview)
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load the moderation data."));
  }

  useEffect(() => {
    if (user?.isAdmin) load();
  }, [user?.isAdmin]);

  async function act(key: string, action: () => Promise<unknown>) {
    setBusy(key);
    setError(null);
    try {
      await action();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work — try again.");
    } finally {
      setBusy(null);
    }
  }

  if (!user?.isAdmin) {
    return (
      <div className="page page-narrow">
        <div className="page-header">
          <div>
            <h1>Moderation</h1>
            <p>This page is for InternEZ's moderators.</p>
          </div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <p style={{ fontSize: 14 }}>
            To make this account a moderator, add its id to <code>ADMIN_USER_IDS</code> in the backend's environment
            variables and restart the backend:
          </p>
          <p style={{ marginTop: 12 }}>
            <code className="moderation-id">{user?.id}</code>
          </p>
        </div>
      </div>
    );
  }

  function companyRow(company: ModerationCompany, actions: { label: string; action: () => Promise<unknown>; danger?: boolean; confirm?: string }[]) {
    return (
      <div className="moderation-item" key={company.id}>
        <div className="moderation-item-main">
          <h3>{company.name || "(no name yet)"}</h3>
          <p className="moderation-meta">
            {company.email} · signed up {formatDate(company.signedUpAt)} · {company.listingCount}{" "}
            {company.listingCount === 1 ? "listing" : "listings"}
            {company.headquarters ? ` · ${company.headquarters}` : ""}
          </p>
          <p className="moderation-meta">
            {company.website ? (
              <a href={websiteHref(company.website)} target="_blank" rel="noopener noreferrer">
                {company.website}
              </a>
            ) : (
              "No website given"
            )}
          </p>
          <div className="tag-row" style={{ marginTop: 8 }}>
            {company.website && (
              <span className={`moderation-hint ${company.emailMatchesWebsite ? "good" : "warn"}`}>
                {company.emailMatchesWebsite ? "Email matches website" : "Email doesn't match website"}
              </span>
            )}
            {company.personalEmail && <span className="moderation-hint warn">Personal email address</span>}
            {company.suspendedAt && (
              <span className="moderation-hint warn">Suspended {formatDate(company.suspendedAt)}</span>
            )}
          </div>
          {company.description && <p className="moderation-description">{company.description}</p>}
        </div>
        <div className="moderation-actions">
          {actions.map(({ label, action, danger, confirm }) => (
            <button
              key={label}
              type="button"
              className={`btn btn-sm ${danger ? "btn-ghost moderation-danger" : "btn-secondary"}`}
              disabled={busy !== null}
              onClick={() => {
                if (confirm && !window.confirm(confirm)) return;
                act(`${company.id}:${label}`, action);
              }}
            >
              {busy === `${company.id}:${label}` ? "Working…" : label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Moderation</h1>
          <p>Review new companies and act on reported listings.</p>
        </div>
      </div>

      {error && (
        <div className="banner" role="alert" style={{ borderColor: "var(--blocked)" }}>
          {error}
        </div>
      )}
      {!overview && !error && <p style={{ color: "var(--text-secondary)" }}>Loading…</p>}

      {overview && (
        <>
          <section className="moderation-section">
            <h2>Reported listings ({overview.reportedListings.length})</h2>
            {overview.reportedListings.length === 0 && <p className="moderation-empty">No open reports.</p>}
            {overview.reportedListings.map((listing) => (
              <div className="moderation-item" key={listing.listingId}>
                <div className="moderation-item-main">
                  <h3>
                    {listing.title}
                    {listing.removedAt && <span className="moderation-hint warn" style={{ marginLeft: 8 }}>Removed</span>}
                  </h3>
                  <p className="moderation-meta">
                    {listing.companyName} · {listing.origin === "direct" ? "posted on InternEZ" : "from the listing feed"}
                    {user.role === "applicant" && (
                      <>
                        {" · "}
                        <Link to={`/listings/${listing.listingId}`}>open listing</Link>
                      </>
                    )}
                  </p>
                  <ul className="moderation-reports">
                    {listing.reports.map((report) => (
                      <li key={report.id}>
                        <strong>{REASON_LABELS[report.reason]}</strong> · {formatDate(report.createdAt)} ·{" "}
                        {report.reporterEmail ?? "deleted account"}
                        {report.note && <p className="moderation-description">{report.note}</p>}
                      </li>
                    ))}
                  </ul>

                  {removing?.listingId === listing.listingId && (
                    <div className="field" style={{ marginTop: 12, marginBottom: 0 }}>
                      <label htmlFor={`reason-${listing.listingId}`}>
                        Reason{listing.origin === "direct" ? " (the company sees this)" : ""}
                      </label>
                      <textarea
                        id={`reason-${listing.listingId}`}
                        className="input"
                        rows={2}
                        maxLength={500}
                        value={removing.reason}
                        onChange={(e) => setRemoving({ listingId: listing.listingId, reason: e.target.value })}
                      />
                      <div className="tag-row">
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          disabled={busy !== null || !removing.reason.trim()}
                          onClick={() =>
                            act(`${listing.listingId}:remove`, async () => {
                              await api.removeListing(listing.listingId, removing.reason.trim());
                              setRemoving(null);
                            })
                          }
                        >
                          {busy === `${listing.listingId}:remove` ? "Removing…" : "Remove listing"}
                        </button>
                        <button type="button" className="btn btn-sm btn-ghost" onClick={() => setRemoving(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="moderation-actions">
                  <span className="moderation-count">
                    {listing.reports.length} {listing.reports.length === 1 ? "report" : "reports"}
                  </span>
                  {!listing.removedAt && removing?.listingId !== listing.listingId && (
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost moderation-danger"
                      disabled={busy !== null}
                      onClick={() => setRemoving({ listingId: listing.listingId, reason: REMOVAL_TEMPLATES[topReason(listing)] })}
                    >
                      Remove…
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    disabled={busy !== null}
                    onClick={() => act(`${listing.listingId}:dismiss`, () => api.dismissReports(listing.listingId))}
                  >
                    {busy === `${listing.listingId}:dismiss` ? "Working…" : "Dismiss reports"}
                  </button>
                </div>
              </div>
            ))}
          </section>

          <section className="moderation-section">
            <h2>Companies waiting for review ({overview.pendingCompanies.length})</h2>
            <p className="moderation-help">
              Their listings stay hidden from students and talent search stays closed to them until they're verified.
            </p>
            {overview.pendingCompanies.length === 0 && <p className="moderation-empty">Nobody is waiting.</p>}
            {overview.pendingCompanies.map((company) =>
              companyRow(company, [
                { label: "Verify", action: () => api.moderateCompany(company.id, "verify") },
                {
                  label: "Suspend",
                  danger: true,
                  confirm: `Suspend ${company.name || company.email}? They'll be signed out and can't sign in again.`,
                  action: () => api.moderateCompany(company.id, "suspend"),
                },
              ])
            )}
          </section>

          <section className="moderation-section">
            <h2>Removed listings ({overview.removedListings.length})</h2>
            {overview.removedListings.length === 0 && <p className="moderation-empty">Nothing removed.</p>}
            {overview.removedListings.map((listing) => (
              <div className="moderation-item" key={listing.listingId}>
                <div className="moderation-item-main">
                  <h3>{listing.title}</h3>
                  <p className="moderation-meta">
                    {listing.companyName} · removed {formatDate(listing.removedAt)}
                  </p>
                  <p className="moderation-description">{listing.removedReason}</p>
                </div>
                <div className="moderation-actions">
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    disabled={busy !== null}
                    onClick={() => act(`${listing.listingId}:restore`, () => api.restoreListing(listing.listingId))}
                  >
                    {busy === `${listing.listingId}:restore` ? "Working…" : "Restore"}
                  </button>
                </div>
              </div>
            ))}
          </section>

          <details className="moderation-section">
            <summary>
              <h2>Verified companies ({overview.verifiedCompanies.length})</h2>
            </summary>
            {overview.verifiedCompanies.map((company) =>
              companyRow(company, [
                { label: "Unverify", action: () => api.moderateCompany(company.id, "unverify") },
                {
                  label: "Suspend",
                  danger: true,
                  confirm: `Suspend ${company.name || company.email}? They'll be signed out, can't sign in again, and their listings disappear.`,
                  action: () => api.moderateCompany(company.id, "suspend"),
                },
              ])
            )}
          </details>

          <details className="moderation-section">
            <summary>
              <h2>Suspended companies ({overview.suspendedCompanies.length})</h2>
            </summary>
            {overview.suspendedCompanies.map((company) =>
              companyRow(company, [
                { label: "Lift suspension", action: () => api.moderateCompany(company.id, "unsuspend") },
              ])
            )}
          </details>
        </>
      )}
    </div>
  );
}
