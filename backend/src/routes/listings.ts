import { Router } from "express";
import { db } from "../models/store.js";
import { computeEligibility } from "../services/eligibility.js";
import { computeMatch } from "../services/matching.js";
import { searchListings } from "../services/listingSearch.js";
import { parseSearchFilters } from "../services/savedSearch.js";
import { escapeHtml, isOpenToApplicants, notifyModerators, REPORT_REASON_LABELS, REPORT_REASONS } from "../services/moderation.js";
import { writeLimiter } from "../middleware/rateLimit.js";
import type { ListingSearchQuery, ListingSort, ListingWithComputed, ReportReason } from "../types/domain.js";

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
  // A saved listing the moderators have since removed (or whose company
  // lost its verification) drops out of the list.
  const visibilities = await Promise.all(ids.map((id) => db.getListingVisibility(id)));
  const openIds = ids.filter((_id, i) => isOpenToApplicants(visibilities[i]));
  const computed = await Promise.all(openIds.map((id) => withComputed(id, applicantId)));
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
  const visibility = await db.getListingVisibility(req.params.id);
  if (visibility?.removedAt) {
    res.status(410).json({ error: "This listing was removed by InternEZ's moderators", code: "listingRemoved" });
    return;
  }
  const listing = isOpenToApplicants(visibility) ? await withComputed(req.params.id, req.session.userId!) : null;
  if (!listing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }
  res.json({ ...listing, reported: await db.hasReportedListing(req.session.userId!, listing.id) });
});

const MAX_REPORT_NOTE_LENGTH = 2000;

// Flags a listing for the moderators, who get an email about it. The
// company never learns who reported it.
listingsRouter.post("/:id/report", writeLimiter, async (req, res) => {
  const { reason, note } = req.body ?? {};
  if (!REPORT_REASONS.includes(reason)) {
    res.status(400).json({ error: "Choose what's wrong with the listing", code: "reportReasonRequired" });
    return;
  }
  const listing = await db.getListing(req.params.id);
  if (!listing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }
  const text = typeof note === "string" ? note.trim().slice(0, MAX_REPORT_NOTE_LENGTH) : "";
  const report = await db.createListingReport({
    listingId: listing.id,
    reporterId: req.session.userId!,
    reason: reason as ReportReason,
    note: text,
  });
  if (!report) {
    res.status(409).json({ error: "You've already reported this listing", code: "alreadyReported" });
    return;
  }

  const company = await db.getCompany(listing.companyId);
  notifyModerators(`Listing reported: ${listing.title}`, [
    `<strong>${escapeHtml(listing.title)}</strong> (${escapeHtml(company?.name ?? "unknown company")}, ${listing.origin}) was reported: ${REPORT_REASON_LABELS[report.reason]}.`,
    ...(text ? [`Their note: ${escapeHtml(text)}`] : []),
  ]);
  res.status(201).json({ ok: true });
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
