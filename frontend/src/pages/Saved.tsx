import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { ListingCard } from "../components/ListingCard";
import { ApplyModal } from "../components/ApplyModal";
import { BellIcon } from "../components/icons";
import { useReferenceData } from "../context/ReferenceData";
import { browseUrlFor } from "../lib/browseQuery";
import type { ListingWithComputed, SavedSearch } from "../types/domain";

function describeFilters(filters: SavedSearch["filters"], countryName: (code: string) => string): string {
  const parts: string[] = [];
  if (filters.query) parts.push(`"${filters.query}"`);
  parts.push(...filters.countries.map(countryName));
  parts.push(...filters.cities);
  parts.push(...filters.languages.map((l) => `in ${l}`));
  parts.push(...filters.workArrangements);
  parts.push(...filters.durations);
  if (filters.fieldOfStudy) parts.push(filters.fieldOfStudy);
  return parts.length > 0 ? parts.join(", ") : "All new listings";
}

export function Saved() {
  const [listings, setListings] = useState<ListingWithComputed[] | null>(null);
  const [searches, setSearches] = useState<SavedSearch[] | null>(null);
  const [applying, setApplying] = useState<ListingWithComputed | null>(null);
  const [justApplied, setJustApplied] = useState<string | null>(null);
  const { reference } = useReferenceData();
  const countryName = (code: string) =>
    reference?.regions.flatMap((r) => r.countries).find((c) => c.code === code)?.name ?? code;

  useEffect(() => {
    api.getSavedListings().then(setListings);
    api.getSavedSearches().then(setSearches);
  }, []);

  function unsave(listing: ListingWithComputed) {
    setListings((prev) => (prev ? prev.filter((l) => l.id !== listing.id) : prev));
    api.unsaveListing(listing.id).catch(() => {
      setListings((prev) => (prev ? [...prev, listing] : prev));
    });
  }

  function removeSearch(search: SavedSearch) {
    setSearches((prev) => (prev ? prev.filter((s) => s.id !== search.id) : prev));
    api.deleteSavedSearch(search.id).catch(() => {
      setSearches((prev) => (prev ? [...prev, search] : prev));
    });
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Saved</h1>
          <p>Listings you've bookmarked, and searches you're watching for new matches.</p>
        </div>
      </div>

      {searches && searches.length > 0 && (
        <section style={{ marginBottom: "var(--space-7)" }}>
          <h2 style={{ fontSize: 16, marginBottom: "var(--space-3)" }}>Saved searches</h2>
          <div className="application-list">
            {searches.map((search) => (
              <div className="application-row" key={search.id} style={{ padding: "var(--space-4) var(--space-5)" }}>
                <div className="application-row-main">
                  <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15 }}>
                    <BellIcon />
                    {search.name}
                  </h3>
                  <span className="company">{describeFilters(search.filters, countryName)}</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Link to={browseUrlFor(search.filters)} className="btn btn-secondary btn-sm">
                    Open
                  </Link>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeSearch(search)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <h2 style={{ fontSize: 16, marginBottom: "var(--space-3)" }}>Saved listings</h2>

      {!listings && <p style={{ color: "var(--text-secondary)" }}>Loading…</p>}

      {listings && listings.length === 0 && (
        <div className="empty-state">
          <h3>Nothing saved yet</h3>
          <p style={{ marginBottom: 16 }}>
            Tap the bookmark icon on a listing while browsing to keep it here.
          </p>
          <Link to="/browse" className="btn btn-primary">
            Browse listings
          </Link>
        </div>
      )}

      {listings?.map((listing) => (
        <div key={listing.id}>
          <ListingCard listing={listing} onApply={() => setApplying(listing)} onToggleSave={() => unsave(listing)} />
          {justApplied === listing.id && (
            <p style={{ fontSize: 13, color: "var(--ok)", marginTop: -8, marginBottom: 16 }}>
              Application submitted.
            </p>
          )}
        </div>
      ))}

      {applying && (
        <ApplyModal
          listing={applying}
          onClose={() => setApplying(null)}
          onSubmitted={() => {
            setJustApplied(applying.id);
            setApplying(null);
          }}
        />
      )}
    </div>
  );
}
