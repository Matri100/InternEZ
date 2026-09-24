import { Router } from "express";
import { db } from "../models/store.js";
import { computeEligibility } from "../services/eligibility.js";
import { computeMatch } from "../services/matching.js";
import { searchListings } from "../services/listingSearch.js";
import { parseSearchFilters } from "../services/savedSearch.js";
import type { ListingSearchQuery, ListingSort, ListingWithComputed } from "../types/domain.js";

export const listingsRouter = Router();

const SORTS: ListingSort[] = ["match", "newest", "deadline", "company"];

// "?countries=DE,FR&languages=German" — list filters travel as
// comma-separated values (no filter value contains a comma: cities are
// the part of a location before its first comma).
function listParam(value: unknown): string[] {
  return typeof value === "string" ? value.split(",").map((v) => v.trim()).filter(Boolean) : [];
}

function parseListingSearchQuery(query: Record<string, unknown>): ListingSearchQuery {
  const page = Number.parseInt(String(query.page ?? "1"), 10);
  return {
    ...parseSearchFilters({
      query: query.q,
      countries: listParam(query.countries),
      cities: listParam(query.cities),
      languages: listParam(query.languages),
      workArrangements: listParam(query.arrangements),
      durations: listParam(query.durations),
      fieldOfStudy: query.field,
    }),
    directOnly: query.direct === "1",
    eligibleOnly: query.eligible === "1",
    sort: SORTS.includes(query.sort as ListingSort) ? (query.sort as ListingSort) : "match",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

async function withComputed(listingId: string, applicantId: string): Promise<ListingWithComputed | null> {
  const listing = await db.getListing(listingId);
  if (!listing) return null;
  const company = await db.getCompany(listing.companyId);
  const applicant = await db.getApplicant(applicantId);
  if (!company || !applicant) return null;

  const eligibilityResult = computeEligibility(applicant, listing.eligibility);
  const saved = await db.isListingSaved(applicantId, listingId);

  return {
    ...listing,
    company,
    eligibilityResult,
    match: computeMatch(applicant, listing, eligibilityResult),
    saved,
  };
}

listingsRouter.get("/", async (req, res) => {
  const applicantId = req.session.userId!;
  const [applicant, rows, savedIds] = await Promise.all([
    db.getApplicant(applicantId),
    db.listVisibleListingRows(),
    db.listSavedListingIds(applicantId),
  ]);
  if (!applicant) {
    res.status(404).json({ error: "Applicant profile not found" });
    return;
  }
  res.json(
    searchListings({ rows, applicant, savedIds: new Set(savedIds), query: parseListingSearchQuery(req.query) })
  );
});

// Must come before "/:id" — otherwise "saved" would be matched as an id.
listingsRouter.get("/saved", async (req, res) => {
  const applicantId = req.session.userId!;
  const ids = await db.listSavedListingIds(applicantId);
  const computed = await Promise.all(ids.map((id) => withComputed(id, applicantId)));
  const results = computed.filter((l): l is ListingWithComputed => l !== null);
  results.sort((a, b) => b.match.total - a.match.total);
  res.json(results);
});

// Must come before "/:id" — otherwise "saved-searches" would be matched as an id.
listingsRouter.get("/saved-searches", async (req, res) => {
  const searches = await db.listSavedSearches(req.session.userId!);
  res.json(searches);
});

listingsRouter.post("/saved-searches", async (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim().slice(0, 100) : "";
  if (!name) {
    res.status(400).json({ error: "A name is required" });
    return;
  }
  const search = await db.createSavedSearch({
    applicantId: req.session.userId!,
    name,
    filters: parseSearchFilters(req.body?.filters),
  });
  res.status(201).json(search);
});

listingsRouter.delete("/saved-searches/:id", async (req, res) => {
  const ok = await db.deleteSavedSearch(req.params.id, req.session.userId!);
  if (!ok) {
    res.status(404).json({ error: "Saved search not found" });
    return;
  }
  res.status(204).send();
});

listingsRouter.post("/:id/save", async (req, res) => {
  const listing = await db.getListing(req.params.id);
  if (!listing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }
  await db.saveListing(req.session.userId!, req.params.id);
  res.json({ saved: true });
});

listingsRouter.delete("/:id/save", async (req, res) => {
  await db.unsaveListing(req.session.userId!, req.params.id);
  res.json({ saved: false });
});

listingsRouter.get("/:id", async (req, res) => {
  const listing = await withComputed(req.params.id, req.session.userId!);
  if (!listing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }
  res.json(listing);
});

listingsRouter.get("/:id/reused-answers", async (req, res) => {
  const listing = await db.getListing(req.params.id);
  if (!listing || listing.extraQuestions.length === 0) {
    res.json({ answers: {} });
    return;
  }
  const answers = await db.getReusedAnswers(
    req.session.userId!,
    listing.extraQuestions.map((q) => q.key)
  );
  res.json({ answers });
});
