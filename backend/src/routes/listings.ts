import { Router } from "express";
import { db } from "../models/store.js";
import { computeEligibility } from "../services/eligibility.js";
import { computeMatch } from "../services/matching.js";
import type { ListingWithComputed, SavedSearchFilters, WorkArrangement, InternshipLength } from "../types/domain.js";

export const listingsRouter = Router();

const VALID_WORK_ARRANGEMENTS: WorkArrangement[] = ["On-site", "Hybrid", "Remote"];
const VALID_DURATIONS: InternshipLength[] = ["3 months", "6 months", "12 months", "Flexible"];

function parseSavedSearchFilters(body: any): SavedSearchFilters {
  const raw = body?.filters ?? {};
  return {
    query: typeof raw.query === "string" ? raw.query.slice(0, 200) : "",
    workArrangements: Array.isArray(raw.workArrangements)
      ? raw.workArrangements.filter((w: unknown): w is WorkArrangement => VALID_WORK_ARRANGEMENTS.includes(w as WorkArrangement))
      : [],
    durations: Array.isArray(raw.durations)
      ? raw.durations.filter((d: unknown): d is InternshipLength => VALID_DURATIONS.includes(d as InternshipLength))
      : [],
    fieldOfStudy: typeof raw.fieldOfStudy === "string" ? raw.fieldOfStudy : "",
    country: typeof raw.country === "string" ? raw.country : "",
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
  const listings = await db.listListings();
  const computed = await Promise.all(listings.map((l) => withComputed(l.id, applicantId)));
  const results = computed.filter((l): l is ListingWithComputed => l !== null);
  results.sort((a, b) => b.match.total - a.match.total);
  res.json(results);
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
    filters: parseSavedSearchFilters(req.body),
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
