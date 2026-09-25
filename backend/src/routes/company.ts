import { Router, type NextFunction, type Request, type Response } from "express";
import { db } from "../models/store.js";
import type {
  Applicant,
  ApplicantSummary,
  ApplicationStatus,
  ApplicationWithApplicant,
  Listing,
  TalentProfile,
} from "../types/domain.js";
import { EDUCATION_LEVEL_RANK } from "../data/reference.js";
import { notifySavedSearchMatches } from "../services/listingAlerts.js";
import { detectListingLanguage } from "../services/language.js";
import { writeLimiter } from "../middleware/rateLimit.js";

export const companyRouter = Router();

function primaryEducationOf(applicant: Applicant) {
  const primary = applicant.education.reduce<(typeof applicant.education)[number] | null>((best, e) => {
    if (!best || EDUCATION_LEVEL_RANK[e.level] > EDUCATION_LEVEL_RANK[best.level]) return e;
    return best;
  }, null);
  return primary ? { level: primary.level, institution: primary.institution, field: primary.field } : null;
}

// The most recently uploaded "Resume / CV" document, if any — documents are
// appended in DocumentsEditor, so the last match is the newest.
function resumeOf(applicant: Applicant) {
  const resumes = applicant.documents.filter((d) => d.kind === "Resume / CV");
  return resumes.length > 0 ? resumes[resumes.length - 1] : null;
}

const STATUS_NOTIFICATION_COPY: Partial<Record<ApplicationStatus, { title: string; body: (listingTitle: string) => string }>> = {
  reviewing: { title: "Application under review", body: (t) => `Your application for ${t} is now under review.` },
  interview: { title: "Interview stage", body: (t) => `Your application for ${t} has moved to the interview stage.` },
  offer: { title: "Offer extended", body: (t) => `An offer has been extended for ${t}.` },
  rejected: { title: "Application update", body: (t) => `Your application for ${t} was not selected.` },
};

// --- Company profile ---

companyRouter.get("/", async (req, res) => {
  const company = await db.getCompany(req.session.userId!);
  res.json(company);
});

companyRouter.put("/", async (req, res) => {
  const body = req.body ?? {};
  const patch = {
    name: String(body.name ?? ""),
    // Ignored for an existing company — saveCompany never changes
    // verification, which is the moderators' decision, never self-declared.
    verified: false,
    logoUrl: body.logoUrl ?? null,
    description: String(body.description ?? ""),
    website: String(body.website ?? ""),
    headquarters: body.headquarters ?? null,
    companySize: body.companySize ?? null,
  };
  const saved = await db.saveCompany(req.session.userId!, patch);
  res.json(saved);
});

// --- Listings owned by this company ---

function parseListingInput(body: any): Omit<Listing, "id" | "companyId" | "createdAt"> {
  const title = String(body.title ?? "");
  const description = String(body.description ?? "");
  return {
    title,
    location: String(body.location ?? ""),
    country: body.country ?? null,
    origin: "direct",
    // Only "sourced" listings (see services/ingestion/) ever have a real
    // external apply link — a company posting directly through this form
    // is the real pipeline, so there's nothing to link out to.
    applyUrl: "",
    department: String(body.department ?? ""),
    workArrangement: body.workArrangement,
    requiredEducationLevel: body.requiredEducationLevel,
    duration: body.duration,
    startDate: String(body.startDate ?? "flexible"),
    startLabel: String(body.startLabel ?? ""),
    endLabel: String(body.endLabel ?? ""),
    compensation: String(body.compensation ?? ""),
    applicationDeadline: String(body.applicationDeadline ?? ""),
    description,
    // Always derived server-side, regardless of anything the client sends
    // — there's no form field for this (see PostListing.tsx), it's read
    // straight from what the company actually typed.
    language: detectListingLanguage(title, description),
    requirements: Array.isArray(body.requirements) ? body.requirements : [],
    skills: Array.isArray(body.skills) ? body.skills : [],
    targetFields: Array.isArray(body.targetFields) ? body.targetFields : [],
    requiredLanguages: Array.isArray(body.requiredLanguages) ? body.requiredLanguages : [],
    industries: Array.isArray(body.industries) ? body.industries : [],
    preferredQualifications: Array.isArray(body.preferredQualifications) ? body.preferredQualifications : [],
    eligibility: {
      allowedRegions: Array.isArray(body.eligibility?.allowedRegions) ? body.eligibility.allowedRegions : undefined,
      citizenOnly: body.eligibility?.citizenOnly || undefined,
      clearance: Boolean(body.eligibility?.clearance) || undefined,
    },
    extraQuestions: Array.isArray(body.extraQuestions)
      ? body.extraQuestions
          .filter((q: any) => q && typeof q.prompt === "string" && q.prompt.trim())
          .map((q: any, i: number) => ({
            key: typeof q.key === "string" && q.key ? q.key : `q_${Date.now()}_${i}`,
            prompt: String(q.prompt),
            type: ["short_text", "long_text", "yes_no"].includes(q.type) ? q.type : "long_text",
            required: Boolean(q.required),
          }))
      : [],
  };
}

companyRouter.get("/listings", async (req, res) => {
  const listings = await db.listListingsByCompany(req.session.userId!);
  res.json(listings);
});

companyRouter.get("/listings/:id", async (req, res) => {
  const listing = await db.getListing(req.params.id);
  if (!listing || listing.companyId !== req.session.userId) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }
  res.json(listing);
});

companyRouter.post("/listings", async (req, res) => {
  const input = parseListingInput(req.body ?? {});
  if (!input.title.trim()) {
    res.status(400).json({ error: "Title is required" });
    return;
  }
  const listing = await db.createListing(req.session.userId!, input);

  // An unverified company's listing stays hidden until the moderators
  // verify it, and saved searches hear about it then instead (see
  // routes/moderation.ts).
  const company = await db.getCompany(listing.companyId);
  if (company?.verified) await notifySavedSearchMatches(listing, company);

  res.status(201).json(listing);
});

companyRouter.put("/listings/:id", async (req, res) => {
  const input = parseListingInput(req.body ?? {});
  const updated = await db.updateListing(req.params.id, req.session.userId!, input);
  if (!updated) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }
  res.json(updated);
});

companyRouter.delete("/listings/:id", async (req, res) => {
  const ok = await db.deleteListing(req.params.id, req.session.userId!);
  if (!ok) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }
  res.status(204).send();
});

// --- Applications received across all of this company's listings ---

async function buildApplicationsWithApplicant(companyId: string): Promise<(ApplicationWithApplicant & { listingTitle: string })[]> {
  const applications = await db.listApplicationsForCompany(companyId);

  const results: (ApplicationWithApplicant & { listingTitle: string })[] = [];
  for (const app of applications) {
    const [listing, applicant] = await Promise.all([db.getListing(app.listingId), db.getApplicant(app.applicantId)]);
    if (!listing || !applicant) continue;

    const applicantSummary: ApplicantSummary = {
      id: applicant.id,
      name: applicant.name || "(no name provided)",
      email: applicant.email,
      phone: applicant.phone,
      portfolioUrl: applicant.portfolioUrl,
      summary: applicant.summary,
      primaryEducation: primaryEducationOf(applicant),
      skills: applicant.skills,
      resume: resumeOf(applicant),
    };

    results.push({ ...app, applicant: applicantSummary, listingTitle: listing.title });
  }
  return results;
}

companyRouter.get("/applications", async (req, res) => {
  res.json(await buildApplicationsWithApplicant(req.session.userId!));
});

function csvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

companyRouter.get("/applications/export.csv", async (req, res) => {
  const results = await buildApplicationsWithApplicant(req.session.userId!);
  const header = ["Applicant", "Email", "Phone", "Listing", "Status", "Submitted", "Skills", "Portfolio"];
  const rows = results.map((r) =>
    [
      r.applicant.name,
      r.applicant.email,
      r.applicant.phone,
      r.listingTitle,
      r.status,
      r.submittedAt,
      r.applicant.skills.join("; "),
      r.applicant.portfolioUrl,
    ]
      .map(csvField)
      .join(",")
  );
  const csv = [header.map(csvField).join(","), ...rows].join("\r\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=\"applicants.csv\"");
  res.send(csv);
});

// "appliedExternally" is deliberately excluded — it's assigned automatically
// by createApplication for non-direct listings, never manually set by a
// company (there's no real pipeline on our end to move it through).
const APPLICATION_STATUSES: ApplicationStatus[] = ["applied", "reviewing", "interview", "offer", "rejected"];

companyRouter.put("/applications/:id/status", async (req, res) => {
  const { status } = req.body ?? {};
  if (!APPLICATION_STATUSES.includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }
  const updated = await db.updateApplicationStatus(req.params.id, req.session.userId!, status);
  if (!updated) {
    res.status(404).json({ error: "Application not found" });
    return;
  }

  const copy = STATUS_NOTIFICATION_COPY[updated.status];
  if (copy) {
    const listing = await db.getListing(updated.listingId);
    if (listing) {
      await db.createNotification({
        userId: updated.applicantId,
        role: "applicant",
        type: "status_change",
        title: copy.title,
        body: copy.body(listing.title),
        params: { status: updated.status, listingTitle: listing.title },
        link: "/applications",
      });
    }
  }

  res.json(updated);
});

// --- Analytics ---

companyRouter.get("/analytics", async (req, res) => {
  const analytics = await db.getCompanyAnalytics(req.session.userId!);
  res.json(analytics);
});

// --- Talent discovery (opt-in applicants) ---

// Students who opted into discovery share their CV and contact details
// with companies, so only companies InternEZ has verified get to see them.
async function requireVerifiedCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const company = await db.getCompany(req.session.userId!);
    if (!company?.verified) {
      res.status(403).json({
        error: "Talent search opens once InternEZ has verified your company.",
        code: "companyNotVerified",
      });
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
}

companyRouter.use("/talent", requireVerifiedCompany);

companyRouter.get("/talent", async (req, res) => {
  const companyId = req.session.userId!;
  const [applicants, shortlistedIds] = await Promise.all([
    db.listDiscoverableApplicants(),
    db.listShortlistedApplicantIds(companyId),
  ]);
  const shortlisted = new Set(shortlistedIds);
  const results: TalentProfile[] = applicants.map((applicant) => ({
    id: applicant.id,
    name: applicant.name || "(no name provided)",
    summary: applicant.summary,
    primaryEducation: primaryEducationOf(applicant),
    skills: applicant.skills,
    interests: applicant.interests,
    preferredLocations: applicant.preferredLocations,
    workArrangementPreference: applicant.workArrangementPreference,
    portfolioUrl: applicant.portfolioUrl,
    resume: resumeOf(applicant),
    shortlisted: shortlisted.has(applicant.id),
  }));
  res.json(results);
});

companyRouter.post("/talent/:applicantId/shortlist", async (req, res) => {
  const applicant = await db.getApplicant(req.params.applicantId);
  if (!applicant || !applicant.discoverable) {
    res.status(404).json({ error: "Applicant not found" });
    return;
  }
  await db.shortlistCandidate(req.session.userId!, req.params.applicantId);
  res.json({ shortlisted: true });
});

companyRouter.delete("/talent/:applicantId/shortlist", async (req, res) => {
  await db.unshortlistCandidate(req.session.userId!, req.params.applicantId);
  res.json({ shortlisted: false });
});

companyRouter.post("/talent/:applicantId/poke", writeLimiter, async (req, res) => {
  const applicant = await db.getApplicant(req.params.applicantId);
  if (!applicant || !applicant.discoverable) {
    res.status(404).json({ error: "Applicant not found" });
    return;
  }
  const companyId = req.session.userId!;
  const company = await db.getCompany(companyId);
  const conversation = await db.getOrCreateConversation(applicant.id, companyId);
  await db.sendMessage(
    conversation.id,
    "company",
    `${company?.name || "A company"} has reviewed your profile and would like to connect.`
  );
  const summary = await db.summarizeConversation(conversation, "company");
  res.status(201).json(summary);
});

// --- data export & account deletion ---

companyRouter.get("/export", async (req, res) => {
  const data = await db.getCompanyExportData(req.session.userId!);
  res.setHeader("Content-Disposition", "attachment; filename=\"internez-data-export.json\"");
  res.json(data);
});

companyRouter.delete("/account", async (req, res) => {
  await db.deleteCompanyAccount(req.session.userId!);
  req.session.destroy(() => res.status(204).send());
});
