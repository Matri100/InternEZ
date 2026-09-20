import { Router } from "express";
import { db } from "../models/store.js";
import {
  DISABILITY_STATUS_OPTIONS,
  GENDER_IDENTITY_OPTIONS,
  RACE_ETHNICITY_OPTIONS,
  VETERAN_STATUS_OPTIONS,
} from "../data/reference.js";
import type {
  CertificationEntry,
  DocumentFile,
  EducationEntry,
  LanguageProficiency,
  ProjectEntry,
  VoluntaryDisclosures,
  WorkExperienceEntry,
} from "../types/domain.js";

export const profileRouter = Router();

const MAX_DOCUMENTS = 10;
const MAX_DOCUMENT_BYTES = 6 * 1024 * 1024; // ~6MB per file, comfortably under the 15mb body limit

profileRouter.get("/", async (req, res) => {
  const applicant = await db.getApplicant(req.session.userId!);
  res.json(applicant);
});

profileRouter.put("/", async (req, res) => {
  const applicantId = req.session.userId!;
  const body = req.body ?? {};
  const education: Omit<EducationEntry, "id" | "applicantId">[] = Array.isArray(body.education)
    ? body.education
    : [];
  const workExperience: Omit<WorkExperienceEntry, "id" | "applicantId">[] = Array.isArray(body.workExperience)
    ? body.workExperience
    : [];
  const projects: Omit<ProjectEntry, "id" | "applicantId">[] = Array.isArray(body.projects) ? body.projects : [];
  const certifications: Omit<CertificationEntry, "id" | "applicantId">[] = Array.isArray(body.certifications)
    ? body.certifications
    : [];
  const documents: Omit<DocumentFile, "id" | "applicantId">[] = Array.isArray(body.documents) ? body.documents : [];
  const languages: LanguageProficiency[] = Array.isArray(body.languages) ? body.languages : [];

  if (documents.length > MAX_DOCUMENTS) {
    res.status(400).json({ error: `At most ${MAX_DOCUMENTS} files allowed` });
    return;
  }
  for (const doc of documents) {
    if (typeof doc.size === "number" && doc.size > MAX_DOCUMENT_BYTES) {
      res.status(400).json({ error: `${doc.fileName} is too large (max 6MB per file)` });
      return;
    }
  }

  const promptsBody = body.coverLetterPrompts ?? {};
  const patch = {
    name: String(body.name ?? ""),
    email: String(body.email ?? ""),
    phone: String(body.phone ?? ""),
    portfolioUrl: String(body.portfolioUrl ?? ""),
    citizenship: body.citizenship ?? null,
    secondCitizenship: body.secondCitizenship ?? null,
    placeOfBirth: body.placeOfBirth ?? null,
    residence: body.residence ?? null,
    availableFrom: String(body.availableFrom ?? ""),
    preferredLength: body.preferredLength ?? null,
    workArrangementPreference: Array.isArray(body.workArrangementPreference) ? body.workArrangementPreference : [],
    preferredLocations: Array.isArray(body.preferredLocations) ? body.preferredLocations : [],
    languages,
    skills: Array.isArray(body.skills) ? body.skills : [],
    interests: Array.isArray(body.interests) ? body.interests : [],
    qualifications: Array.isArray(body.qualifications) ? body.qualifications : [],
    summary: String(body.summary ?? ""),
    coverLetterPrompts: {
      whyThisField: String(promptsBody.whyThisField ?? ""),
      provenStrength: String(promptsBody.provenStrength ?? ""),
      workingStyle: String(promptsBody.workingStyle ?? ""),
      careerGoals: String(promptsBody.careerGoals ?? ""),
    },
    profileComplete: Boolean(body.profileComplete),
    discoverable: Boolean(body.discoverable),
  };

  await db.saveApplicant(applicantId, patch);
  await db.setEducation(applicantId, education);
  await db.setWorkExperience(applicantId, workExperience);
  await db.setProjects(applicantId, projects);
  await db.setCertifications(applicantId, certifications);
  await db.setDocuments(applicantId, documents);
  const full = await db.getApplicant(applicantId);
  res.json(full);
});

// --- data export & account deletion ---

profileRouter.get("/export", async (req, res) => {
  const data = await db.getApplicantExportData(req.session.userId!);
  res.setHeader("Content-Disposition", "attachment; filename=\"internez-data-export.json\"");
  res.json(data);
});

profileRouter.delete("/account", async (req, res) => {
  await db.deleteApplicantAccount(req.session.userId!);
  req.session.destroy(() => res.status(204).send());
});

// --- browser extension pairing ---
// The extension can't use the session cookie (it runs on whatever external
// site the applicant is applying on), so it authenticates with this token
// instead — generated here, pasted into the extension once.

profileRouter.get("/extension-token", async (req, res) => {
  res.json({ connected: await db.hasExtensionToken(req.session.userId!) });
});

profileRouter.post("/extension-token", async (req, res) => {
  const token = await db.createExtensionToken(req.session.userId!);
  res.json({ token });
});

profileRouter.delete("/extension-token", async (req, res) => {
  await db.revokeExtensionToken(req.session.userId!);
  res.status(204).send();
});

// --- voluntary self-identification (GDPR-sensitive, entirely opt-in) ---
// Never required to use InternEZ, never bundled into the main profile PUT.
// Values outside the fixed option lists are dropped to "" rather than
// rejected outright — same permissive-on-malformed-input style as the rest
// of this file, just paired with a stricter allow-list given what this data
// actually is.

function validOrEmpty(value: unknown, allowed: string[]): string {
  const s = String(value ?? "");
  return allowed.includes(s) ? s : "";
}

profileRouter.get("/voluntary-disclosures", async (req, res) => {
  res.json(await db.getVoluntaryDisclosures(req.session.userId!));
});

profileRouter.put("/voluntary-disclosures", async (req, res) => {
  const body = req.body ?? {};
  const patch: VoluntaryDisclosures = {
    genderIdentity: validOrEmpty(body.genderIdentity, GENDER_IDENTITY_OPTIONS),
    raceEthnicity: validOrEmpty(body.raceEthnicity, RACE_ETHNICITY_OPTIONS),
    veteranStatus: validOrEmpty(body.veteranStatus, VETERAN_STATUS_OPTIONS),
    disabilityStatus: validOrEmpty(body.disabilityStatus, DISABILITY_STATUS_OPTIONS),
    consentToAutofill: Boolean(body.consentToAutofill),
  };
  res.json(await db.saveVoluntaryDisclosures(req.session.userId!, patch));
});
