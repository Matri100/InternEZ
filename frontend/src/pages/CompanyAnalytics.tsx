import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { APPLICATION_STATUS_LABELS } from "../lib/applicationStatus";
import type { ApplicationStatus, CompanyAnalytics as CompanyAnalyticsData } from "../types/domain";

const FUNNEL_ORDER: ApplicationStatus[] = [
  "applied",
  "appliedExternally",
  "reviewing",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
];

function last30Days(daily: { day: string; n: number }[]): { day: string; n: number }[] {
  const byDay = new Map(daily.map((d) => [d.day, d.n]));
  const days: { day: string; n: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ day: key, n: byDay.get(key) ?? 0 });
  }
  return days;
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function StatDelta({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) {
    return <span className="stat-delta">No prior-period data yet</span>;
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return <span className="stat-delta">Flat vs. prior 7 days</span>;
  return (
    <span className={`stat-delta ${pct > 0 ? "up" : "down"}`}>
      {pct > 0 ? "▲" : "▼"} {Math.abs(pct)}% vs. prior 7 days
    </span>
  );
}

export function CompanyAnalytics() {
  const [data, setData] = useState<CompanyAnalyticsData | null>(null);

  useEffect(() => {
    api.getCompanyAnalytics().then(setData);
  }, []);

  if (!data) {
    return (
      <div className="page">
        <p style={{ color: "var(--text-secondary)" }}>Loading…</p>
      </div>
    );
  }

  if (data.totalListings === 0) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Analytics</h1>
          </div>
        </div>
        <div className="empty-state">
          <h3>Nothing to show yet</h3>
          <p style={{ marginBottom: 16 }}>Post a listing to start seeing application analytics here.</p>
          <Link to="/company/listings/new" className="btn btn-primary">
            Post a listing
          </Link>
        </div>
      </div>
    );
  }

  const maxStatusCount = Math.max(1, ...FUNNEL_ORDER.map((s) => data.byStatus[s] ?? 0));
  const trend = last30Days(data.dailyApplications);
  const maxDaily = Math.max(1, ...trend.map((d) => d.n));
  const activeApplications = data.totalApplications - (data.byStatus.withdrawn ?? 0);
  const offers = data.byStatus.offer ?? 0;
  const conversionRate = activeApplications > 0 ? Math.round((offers / activeApplications) * 100) : 0;
  const last7 = trend.slice(-7).reduce((s, d) => s + d.n, 0);
  const prior7 = trend.slice(-14, -7).reduce((s, d) => s + d.n, 0);
  const trendTotal = trend.reduce((s, d) => s + d.n, 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Analytics</h1>
          <p>How your listings are performing, across every applicant who's applied.</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card card">
          <span className="stat-label">Listings posted</span>
          <span className="stat-value">{data.totalListings.toLocaleString()}</span>
        </div>
        <div className="stat-card card">
          <span className="stat-label">Applications received</span>
          <span className="stat-value">{data.totalApplications.toLocaleString()}</span>
          <span className="stat-delta">{activeApplications.toLocaleString()} active</span>
        </div>
        <div className="stat-card card">
          <span className="stat-label">Applications, last 7 days</span>
          <span className="stat-value">{last7.toLocaleString()}</span>
          <StatDelta current={last7} previous={prior7} />
        </div>
        <div className="stat-card card">
          <span className="stat-label">Applied → offer rate</span>
          <span className="stat-value">{conversionRate}%</span>
          <span className="stat-delta">
            {offers.toLocaleString()} of {activeApplications.toLocaleString()} applied
          </span>
        </div>
      </div>

      <section className="analytics-section card">
        <div className="form-section-header">
          <span className="form-section-number">01</span>
          <h2>Pipeline funnel</h2>
          <span className="field-hint">{data.totalApplications.toLocaleString()} total</span>
        </div>
        <div className="funnel-list">
          {FUNNEL_ORDER.map((status) => {
            const n = data.byStatus[status] ?? 0;
            const pct = data.totalApplications > 0 ? Math.round((n / data.totalApplications) * 100) : 0;
            return (
              <div className="funnel-row" key={status}>
                <span className={`status-badge ${status}`}>{APPLICATION_STATUS_LABELS[status]}</span>
                <div className="funnel-bar-track">
                  <div className={`funnel-bar funnel-bar-${status}`} style={{ width: `${(n / maxStatusCount) * 100}%` }} />
                </div>
                <span className="funnel-count">{n}</span>
                <span className="funnel-pct">{pct}%</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="analytics-section card">
        <div className="form-section-header">
          <span className="form-section-number">02</span>
          <h2>Applications, last 30 days</h2>
          <span className="field-hint">
            {trendTotal.toLocaleString()} in range · peak {maxDaily}/day
          </span>
        </div>
        <div className="trend-chart-wrap">
          <div className="trend-chart" role="img" aria-label="Applications received per day over the last 30 days">
            {trend.map((d) => (
              <div
                key={d.day}
                className="trend-bar"
                style={{ height: `${d.n === 0 ? 0 : Math.max(4, (d.n / maxDaily) * 100)}%` }}
                title={`${d.day}: ${d.n} application${d.n === 1 ? "" : "s"}`}
              />
            ))}
          </div>
        </div>
        <div className="trend-chart-axis">
          <span>{formatShortDate(trend[0].day)}</span>
          <span>Today</span>
        </div>
      </section>

      <section className="analytics-section card">
        <div className="form-section-header">
          <span className="form-section-number">03</span>
          <h2>By listing</h2>
          <span className="field-hint">{data.perListing.length} listing{data.perListing.length === 1 ? "" : "s"}</span>
        </div>
        {data.perListing.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", fontSize: 13.5 }}>No listings yet.</p>
        ) : (
          <div className="listing-stat-list">
            {data.perListing.map((l) => (
              <div className="listing-stat-row" key={l.listingId}>
                <span className="listing-stat-title">{l.title || "(untitled)"}</span>
                <div className="funnel-bar-track" style={{ flex: 1 }}>
                  <div
                    className="funnel-bar funnel-bar-applied"
                    style={{ width: `${(l.applicationCount / Math.max(1, data.perListing[0].applicationCount)) * 100}%` }}
                  />
                </div>
                <span className="funnel-count">{l.applicationCount}</span>
                <span className="funnel-pct">
                  {data.totalApplications > 0 ? Math.round((l.applicationCount / data.totalApplications) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
