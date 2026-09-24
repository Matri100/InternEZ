import { Router } from "express";
import { db } from "../models/store.js";
import { computeEligibility } from "../services/eligibility.js";
import { writeLimiter } from "../middleware/rateLimit.js";
import type { ApplicationWithListing } from "../types/domain.js";

export const applicationsRouter = Router();

applicationsRouter.get("/", async (req, res) => {
  const applicantId = req.session.userId!;
  const applications = await db.listApplications(applicantId);
  const applicant = await db.getApplicant(applicantId);

  const results: ApplicationWithListing[] = [];
  for (const app of applications) {
    const listing = await db.getListing(app.listingId);
    if (!listing || !applicant) continue;
    const company = await db.getCompany(listing.companyId);
    if (!company) continue;
    results.push({
      ...app,
      listing,
      company,
      eligibilityResult: computeEligibility(applicant, listing.eligibility),
    });
  }

  res.json(results);
});

applicationsRouter.post("/", writeLimiter, async (req, res) => {
  const applicantId = req.session.userId!;
  const { listingId, overridden, answers } = req.body ?? {};

  if (typeof listingId !== "string") {
    res.status(400).json({ error: "listingId is required" });
    return;
  }

  const listing = await db.getListing(listingId);
  if (!listing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }

  const alreadyApplied = await db.hasApplied(applicantId, listingId);
  if (alreadyApplied) {
    res.status(409).json({ error: "Already applied to this listing" });
    return;
  }

  const submitted: { key: string; answer: string }[] = Array.isArray(answers)
    ? answers.filter((a) => a && typeof a.key === "string" && typeof a.answer === "string")
    : [];

  // Re-validate required questions server-side — the apply form already
  // blocks submission client-side, but the API can't trust that alone.
  const missingRequired = listing.extraQuestions.filter((q) => {
    if (!q.required) return false;
    const answer = submitted.find((a) => a.key === q.key)?.answer.trim();
    return !answer;
  });
  if (missingRequired.length > 0) {
    res.status(400).json({
      error: `Missing required answer${missingRequired.length > 1 ? "s" : ""}: ${missingRequired.map((q) => q.prompt).join("; ")}`,
    });
    return;
  }

  const application = await db.createApplication({
    applicantId,
    listingId,
    overridden: Boolean(overridden),
    answers: submitted,
  });

  const applicant = await db.getApplicant(applicantId);
  await db.createNotification({
    userId: listing.companyId,
    role: "company",
    type: "new_application",
    title: "New application received",
    body: `${applicant?.name || "An applicant"} applied to ${listing.title}.`,
    params: { applicantName: applicant?.name ?? "", listingTitle: listing.title },
    link: "/company/applicants",
  });

  res.status(201).json(application);
});

applicationsRouter.post("/:id/withdraw", async (req, res) => {
  const updated = await db.withdrawApplication(req.params.id, req.session.userId!);
  if (!updated) {
    res.status(404).json({ error: "Application not found" });
    return;
  }
  res.json(updated);
});
