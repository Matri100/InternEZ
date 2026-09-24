import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { ListingCard } from "../components/ListingCard";
import { ApplyModal } from "../components/ApplyModal";
import { BellIcon } from "../components/icons";
import { browseUrlFor } from "../lib/browseQuery";
import { useI18n } from "../i18n";
import { useCityName } from "../lib/cityNames";
import type { ListingWithComputed, SavedSearch } from "../types/domain";

function describeFilters(
  filters: SavedSearch["filters"],
  i18n: ReturnType<typeof useI18n>,
  cityName: (city: string) => string
): string {
  const { t, countryName, languageName } = i18n;
  const parts: string[] = [];
  if (filters.query) parts.push(`"${filters.query}"`);
  parts.push(...filters.countries.map(countryName));
  parts.push(...filters.cities.map(cityName));
  parts.push(...filters.languages.map((l) => t("browse.chipPostedIn", { language: languageName(l) })));
  parts.push(...filters.workArrangements.map((w) => t(`arrangement.${w}`)));
  parts.push(...filters.durations.map((d) => t(`duration.${d}`)));
  if (filters.fieldOfStudy) parts.push(filters.fieldOfStudy);
  return parts.length > 0 ? parts.join(", ") : t("saved.allNew");
}

export function Saved() {
  const [listings, setListings] = useState<ListingWithComputed[] | null>(null);
  const [searches, setSearches] = useState<SavedSearch[] | null>(null);
  const [applying, setApplying] = useState<ListingWithComputed | null>(null);
  const [justApplied, setJustApplied] = useState<string | null>(null);
  const i18n = useI18n();
  const { t } = i18n;
  const cityName = useCityName();

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
          <h1>{t("saved.title")}</h1>
          <p>{t("saved.subtitle")}</p>
        </div>
      </div>

      {searches && searches.length > 0 && (
        <section style={{ marginBottom: "var(--space-7)" }}>
          <h2 style={{ fontSize: 16, marginBottom: "var(--space-3)" }}>{t("saved.searches")}</h2>
          <div className="application-list">
            {searches.map((search) => (
              <div className="application-row" key={search.id} style={{ padding: "var(--space-4) var(--space-5)" }}>
                <div className="application-row-main">
                  <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15 }}>
                    <BellIcon />
                    {search.name}
                  </h3>
                  <span className="company">{describeFilters(search.filters, i18n, cityName)}</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Link to={browseUrlFor(search.filters)} className="btn btn-secondary btn-sm">
                    {t("common.open")}
                  </Link>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeSearch(search)}>
                    {t("common.remove")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <h2 style={{ fontSize: 16, marginBottom: "var(--space-3)" }}>{t("saved.listings")}</h2>

      {!listings && <p style={{ color: "var(--text-secondary)" }}>{t("common.loading")}</p>}

      {listings && listings.length === 0 && (
        <div className="empty-state">
          <h3>{t("saved.emptyTitle")}</h3>
          <p style={{ marginBottom: 16 }}>{t("saved.emptyBody")}</p>
          <Link to="/browse" className="btn btn-primary">
            {t("common.browseListings")}
          </Link>
        </div>
      )}

      {listings?.map((listing) => (
        <div key={listing.id}>
          <ListingCard listing={listing} onApply={() => setApplying(listing)} onToggleSave={() => unsave(listing)} />
          {justApplied === listing.id && (
            <p style={{ fontSize: 13, color: "var(--ok)", marginTop: -8, marginBottom: 16 }}>
              {t("common.applicationSubmitted")}
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
