// The moderation page's API (frontend pages/Moderation.tsx): reviewing
// company accounts and acting on reported listings. Mounted behind
// requireAuth + requireAdmin (see index.ts) — only accounts listed in
// ADMIN_USER_IDS get here.
import { Router } from "express";
import { db } from "../models/store.js";
import { reviewHints } from "../services/moderation.js";
import { notifySavedSearchMatches } from "../services/listingAlerts.js";
import type { ModerationOverview, ModerationReportedListing } from "../types/domain.js";

export const moderationRouter = Router();

const MAX_REASON_LENGTH = 500;

moderationRouter.get("/", async (_req, res) => {
  const [companies, reports, removedListings] = await Promise.all([
    db.listModerationCompanies(),
    db.listOpenReports(),
    db.listRemovedListings(),
  ]);

  const withHints = companies.map((company) => ({ ...company, ...reviewHints(company.email, company.website) }));

  const reportedListings = new Map<string, ModerationReportedListing>();
  for (const { title, companyId, companyName, origin, removedAt, ...report } of reports) {
    const entry = reportedListings.get(report.listingId) ?? {
      listingId: report.listingId,
      title,
      companyId,
      companyName,
      origin,
      removedAt,
      reports: [],
    };
    entry.reports.push(report);
    reportedListings.set(report.listingId, entry);
  }

  const overview: ModerationOverview = {
    pendingCompanies: withHints.filter((c) => !c.verified && !c.suspendedAt),
    verifiedCompanies: withHints.filter((c) => c.verified && !c.suspendedAt),
    suspendedCompanies: withHints.filter((c) => c.suspendedAt),
    // Most-reported first: several people flagging the same listing is
    // the strongest signal on this page.
    reportedListings: [...reportedListings.values()].sort((a, b) => b.reports.length - a.reports.length),
    removedListings,
  };
  res.json(overview);
});

// --- companies ---

async function findCompanyAccount(id: string) {
  const [company, user] = await Promise.all([db.getCompany(id), db.getUserById(id)]);
  return company && user && user.role === "company" ? { company, user } : null;
}

moderationRouter.post("/companies/:id/verify", async (req, res) => {
  const account = await findCompanyAccount(req.params.id);
  if (!account) {
    res.status(404).json({ error: "Company not found" });
    return;
  }
  if (account.user.suspendedAt) {
    res.status(409).json({ error: "Lift the suspension before verifying this company" });
    return;
  }
  if (account.company.verified) {
    res.json({ ok: true });
    return;
  }

  await db.setCompanyVerified(account.company.id, true);
  await db.createNotification({
    userId: account.company.id,
    role: "company",
    type: "company_verified",
    title: "Your company is verified",
    body: "Students can now see your listings, and talent search is open to you.",
    link: "/company/listings",
  });

  // Listings posted while the company waited for review only now become
  // visible — so this is when they count as new for saved searches.
  const verified = { ...account.company, verified: true };
  const listings = await db.listListingsByCompany(account.company.id);
  for (const listing of listings.filter((l) => !l.removedAt)) {
    await notifySavedSearchMatches(listing, verified);
  }
  res.json({ ok: true });
});

moderationRouter.post("/companies/:id/unverify", async (req, res) => {
  const account = await findCompanyAccount(req.params.id);
  if (!account) {
    res.status(404).json({ error: "Company not found" });
    return;
  }
  await db.setCompanyVerified(account.company.id, false);
  res.json({ ok: true });
});

// Suspending signs the company out, stops it signing in again, and —
// since it also loses verification — hides its listings.
moderationRouter.post("/companies/:id/suspend", async (req, res) => {
  const account = await findCompanyAccount(req.params.id);
  if (!account) {
    res.status(404).json({ error: "Company not found" });
    return;
  }
  await db.setUserSuspended(account.company.id, true);
  await db.setCompanyVerified(account.company.id, false);
  res.json({ ok: true });
});

// Back to "waiting for review", not straight back to verified.
moderationRouter.post("/companies/:id/unsuspend", async (req, res) => {
  const account = await findCompanyAccount(req.params.id);
  if (!account) {
    res.status(404).json({ error: "Company not found" });
    return;
  }
  await db.setUserSuspended(account.company.id, false);
  res.json({ ok: true });
});

// --- listings ---

moderationRouter.post("/listings/:id/remove", async (req, res) => {
  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, MAX_REASON_LENGTH) : "";
  if (!reason) {
    res.status(400).json({ error: "Give a reason — the company sees it" });
    return;
  }
  const listing = await db.getListing(req.params.id);
  if (!listing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }
  await db.removeListing(listing.id, reason);

  // Only a company with a login can read it; sourced employers have none.
  if (listing.origin === "direct") {
    await db.createNotification({
      userId: listing.companyId,
      role: "company",
      type: "listing_removed",
      title: "A listing was removed",
      body: `InternEZ removed "${listing.title}": ${reason}`,
      params: { listingTitle: listing.title, reason },
      link: "/company/listings",
    });
  }
  res.json({ ok: true });
});

moderationRouter.post("/listings/:id/restore", async (req, res) => {
  const ok = await db.restoreListing(req.params.id);
  if (!ok) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }
  res.json({ ok: true });
});

moderationRouter.post("/listings/:id/dismiss-reports", async (req, res) => {
  const dismissed = await db.dismissListingReports(req.params.id);
  res.json({ dismissed });
});
