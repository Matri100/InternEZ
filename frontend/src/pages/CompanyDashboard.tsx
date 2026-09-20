import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { MetaRow } from "../components/MetaRow";
import type { Company, Listing } from "../types/domain";

export function CompanyDashboard() {
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const navigate = useNavigate();

  function load() {
    api.getCompanyListings().then(setListings);
    api.getCompany().then(setCompany);
  }

  useEffect(load, []);

  const profileDone = Boolean(company?.name && company?.description);

  async function remove(id: string) {
    setDeletingId(id);
    try {
      await api.deleteListing(id);
      load();
    } finally {
      setDeletingId(null);
    }
  }

  async function duplicate(listing: Listing) {
    setDuplicatingId(listing.id);
    try {
      const { id, companyId, createdAt, ...input } = listing;
      const copy = await api.createListing({ ...input, title: `Copy of ${listing.title}` });
      navigate(`/company/listings/${copy.id}/edit`);
    } finally {
      setDuplicatingId(null);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>My listings</h1>
          <p>Everything you've posted, direct to applicants.</p>
        </div>
        <Link to="/company/listings/new" className="btn btn-primary">
          + Post a listing
        </Link>
      </div>

      {!listings && <p style={{ color: "var(--text-secondary)" }}>Loading…</p>}

      {listings && listings.length === 0 && (
        <div className="empty-state">
          <h3>No listings yet</h3>
          <p style={{ marginBottom: 16 }}>Post your first internship to start receiving applications.</p>
          <ul className="onboarding-checklist">
            <li className={profileDone ? "done" : ""}>
              <Link to="/company">Complete your company profile</Link>
            </li>
            <li>
              <Link to="/company/listings/new">Post your first listing</Link>
            </li>
          </ul>
          <Link to="/company/listings/new" className="btn btn-primary">
            Post a listing
          </Link>
        </div>
      )}

      <div className="application-list">
        {listings?.map((listing) => (
          <div className="application-row" key={listing.id}>
            <div className="application-row-main">
              <h3>{listing.title}</h3>
              <span className="company">
                <MetaRow
                  items={[listing.location, listing.workArrangement, `Apply by ${listing.applicationDeadline || "—"}`]}
                />
              </span>
            </div>
            <div className="application-row-meta">
              <Link to={`/company/listings/${listing.id}/edit`} className="btn btn-secondary btn-sm">
                Edit
              </Link>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => duplicate(listing)}
                disabled={duplicatingId === listing.id}
              >
                {duplicatingId === listing.id ? "Duplicating…" : "Duplicate"}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => remove(listing.id)}
                disabled={deletingId === listing.id}
                style={{ color: "var(--blocked)" }}
              >
                {deletingId === listing.id ? "Removing…" : "Delete"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
