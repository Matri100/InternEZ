import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "./store.js";
import type { Applicant, Listing } from "../types/domain.js";

// db points at a real Postgres database (DATABASE_URL) for this whole file —
// vitest.globalSetup.ts truncates every table before this suite runs, so
// each run still starts from a clean slate the way SQLite :memory: did.

function applicantPatch(overrides: Partial<Omit<Applicant, "id" | "education" | "workExperience" | "projects" | "certifications" | "documents">> = {}) {
  return {
    name: "Test Applicant",
    email: `${randomUUID()}@test.dev`,
    phone: "",
    portfolioUrl: "",
    citizenship: null,
    secondCitizenship: null,
    placeOfBirth: null,
    residence: null,
    availableFrom: "",
    preferredLength: null,
    workArrangementPreference: [],
    preferredLocations: [],
    languages: [],
    skills: [],
    interests: [],
    qualifications: [],
    summary: "",
    coverLetterPrompts: { whyThisField: "", provenStrength: "", workingStyle: "", careerGoals: "" },
    profileComplete: true,
    discoverable: false,
    ...overrides,
  };
}

function listingInput(overrides: Partial<Omit<Listing, "id" | "companyId" | "createdAt">> = {}) {
  return {
    title: "Intern role",
    location: "Berlin",
    country: "DE" as const,
    origin: "direct" as const,
    department: "",
    workArrangement: "Hybrid" as const,
    requiredEducationLevel: "Bachelor" as const,
    duration: "6 months" as const,
    startDate: "flexible",
    startLabel: "",
    endLabel: "",
    compensation: "",
    applicationDeadline: "",
    description: "",
    language: "English",
    applyUrl: "",
    requirements: [],
    skills: [],
    targetFields: [],
    requiredLanguages: [],
    industries: [],
    preferredQualifications: [],
    eligibility: {},
    extraQuestions: [],
    ...overrides,
  };
}

async function setupCompanyWithListing(listingOverrides: Parameters<typeof listingInput>[0] = {}) {
  const companyId = randomUUID();
  await db.saveCompany(companyId, {
    name: "Acme",
    verified: false,
    logoUrl: null,
    description: "",
    website: "",
    headquarters: null,
    companySize: null,
  });
  const listing = await db.createListing(companyId, listingInput(listingOverrides));
  return { companyId, listing };
}

async function setupApplicant(overrides: Parameters<typeof applicantPatch>[0] = {}) {
  const applicantId = randomUUID();
  await db.saveApplicant(applicantId, applicantPatch(overrides));
  return applicantId;
}

describe("application status transitions", () => {
  it("starts a direct listing's application as plain 'applied'", async () => {
    const { listing } = await setupCompanyWithListing({ origin: "direct" });
    const applicantId = await setupApplicant();
    const app = await db.createApplication({ applicantId, listingId: listing.id, overridden: false, answers: [] });
    expect(app.status).toBe("applied");
  });

  // The hiring pipeline for a non-direct (sourced-from-elsewhere) listing
  // lives on the company's own system, not InternEZ's — there's no one on
  // our end to move it through reviewing/interview/offer, so it's tagged
  // distinctly rather than looking like a normal, actively-tracked "applied".
  //
  // Checks the re-fetched, persisted row (not just createApplication's
  // returned object) on purpose — this caught a real bug where the INSERT
  // never actually wrote the `status` column, silently falling back to the
  // schema's DEFAULT 'applied' no matter what was computed in memory.
  it("starts a non-direct listing's application as 'appliedExternally' instead", async () => {
    const { listing } = await setupCompanyWithListing({ origin: "sourced" });
    const applicantId = await setupApplicant();
    const app = await db.createApplication({ applicantId, listingId: listing.id, overridden: false, answers: [] });
    expect(app.status).toBe("appliedExternally");

    const persisted = await db.listApplications(applicantId);
    expect(persisted.find((a) => a.id === app.id)?.status).toBe("appliedExternally");
  });

  it("lets a company move status forward on an application to its own listing", async () => {
    const { companyId, listing } = await setupCompanyWithListing();
    const applicantId = await setupApplicant();
    const app = await db.createApplication({ applicantId, listingId: listing.id, overridden: false, answers: [] });

    const updated = await db.updateApplicationStatus(app.id, companyId, "reviewing");
    expect(updated?.status).toBe("reviewing");
  });

  it("refuses to update a status a company doesn't own", async () => {
    const { listing } = await setupCompanyWithListing();
    const applicantId = await setupApplicant();
    const app = await db.createApplication({ applicantId, listingId: listing.id, overridden: false, answers: [] });

    const otherCompanyId = randomUUID();
    const result = await db.updateApplicationStatus(app.id, otherCompanyId, "reviewing");
    expect(result).toBeNull();
  });

  it("lets the owning applicant withdraw their own application", async () => {
    const { listing } = await setupCompanyWithListing();
    const applicantId = await setupApplicant();
    const app = await db.createApplication({ applicantId, listingId: listing.id, overridden: false, answers: [] });

    const withdrawn = await db.withdrawApplication(app.id, applicantId);
    expect(withdrawn?.status).toBe("withdrawn");
  });

  it("refuses to withdraw an application belonging to a different applicant", async () => {
    const { listing } = await setupCompanyWithListing();
    const applicantId = await setupApplicant();
    const app = await db.createApplication({ applicantId, listingId: listing.id, overridden: false, answers: [] });

    const result = await db.withdrawApplication(app.id, randomUUID());
    expect(result).toBeNull();
    const stillApplied = await db.listApplications(applicantId);
    expect(stillApplied.find((a) => a.id === app.id)?.status).toBe("applied");
  });

  // Regression test for a real gap caught during manual testing: a company
  // could otherwise flip a withdrawn application back to an active status
  // via a direct API/store call, even though the UI never offers that.
  it("blocks a company from overriding a withdrawn application's status", async () => {
    const { companyId, listing } = await setupCompanyWithListing();
    const applicantId = await setupApplicant();
    const app = await db.createApplication({ applicantId, listingId: listing.id, overridden: false, answers: [] });

    await db.withdrawApplication(app.id, applicantId);
    const result = await db.updateApplicationStatus(app.id, companyId, "interview");
    expect(result).toBeNull();

    const applications = await db.listApplications(applicantId);
    expect(applications.find((a) => a.id === app.id)?.status).toBe("withdrawn");
  });
});

describe("talent discovery boundary", () => {
  it("only lists applicants who opted into discoverability", async () => {
    const discoverableId = await setupApplicant({ discoverable: true, name: "Discoverable One" });
    await setupApplicant({ discoverable: false, name: "Hidden One" });

    const results = await db.listDiscoverableApplicants();
    const ids = results.map((a) => a.id);
    expect(ids).toContain(discoverableId);
    expect(results.every((a) => a.discoverable)).toBe(true);
  });

  it("reports whether an applicant has applied to a given company, for the messaging boundary", async () => {
    const { companyId, listing } = await setupCompanyWithListing();
    const appliedId = await setupApplicant();
    const notAppliedId = await setupApplicant();
    await db.createApplication({ applicantId: appliedId, listingId: listing.id, overridden: false, answers: [] });

    expect(await db.hasApplicantAppliedToCompany(appliedId, companyId)).toBe(true);
    expect(await db.hasApplicantAppliedToCompany(notAppliedId, companyId)).toBe(false);
  });
});

describe("messaging", () => {
  it("reuses the same conversation for a given applicant/company pair", async () => {
    const { companyId } = await setupCompanyWithListing();
    const applicantId = await setupApplicant();

    const first = await db.getOrCreateConversation(applicantId, companyId);
    const second = await db.getOrCreateConversation(applicantId, companyId);
    expect(second.id).toBe(first.id);
  });

  it("tracks unread counts per participant and clears them on read", async () => {
    const { companyId } = await setupCompanyWithListing();
    const applicantId = await setupApplicant();
    const conversation = await db.getOrCreateConversation(applicantId, companyId);

    await db.sendMessage(conversation.id, "company", "Hello!");
    const summaryBeforeRead = await db.summarizeConversation(conversation, "applicant");
    expect(summaryBeforeRead?.unreadCount).toBe(1);

    await db.markMessagesRead(conversation.id, "applicant");
    const summaryAfterRead = await db.summarizeConversation(conversation, "applicant");
    expect(summaryAfterRead?.unreadCount).toBe(0);
  });
});

describe("interview proposals", () => {
  it("only allows a pending proposal to be responded to once", async () => {
    const { companyId } = await setupCompanyWithListing();
    const applicantId = await setupApplicant();
    const conversation = await db.getOrCreateConversation(applicantId, companyId);

    const proposal = await db.createInterviewProposal({
      conversationId: conversation.id,
      proposedBy: "company",
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      durationMinutes: 30,
      location: "Video call",
      note: "",
    });

    const firstResponse = await db.respondToInterviewProposal(proposal.id, "accepted");
    expect(firstResponse?.status).toBe("accepted");

    const secondResponse = await db.respondToInterviewProposal(proposal.id, "declined");
    expect(secondResponse).toBeNull();

    const stored = await db.getInterviewProposal(proposal.id);
    expect(stored?.status).toBe("accepted");
  });
});

describe("notifications", () => {
  it("counts unread notifications and clears them on mark-all-read", async () => {
    const userId = randomUUID();
    await db.createNotification({ userId, role: "applicant", type: "status_change", title: "t1", body: "b1" });
    await db.createNotification({ userId, role: "applicant", type: "status_change", title: "t2", body: "b2" });

    expect(await db.countUnreadNotifications(userId, "applicant")).toBe(2);

    await db.markAllNotificationsRead(userId, "applicant");
    expect(await db.countUnreadNotifications(userId, "applicant")).toBe(0);
  });

  it("scopes notifications by role so a shared user id can't leak across roles", async () => {
    const sharedId = randomUUID();
    await db.createNotification({ userId: sharedId, role: "applicant", type: "status_change", title: "t", body: "b" });

    expect(await db.countUnreadNotifications(sharedId, "company")).toBe(0);
  });

  it("keeps the values a notification is worded from, so it can be shown in any language", async () => {
    const userId = randomUUID();
    await db.createNotification({
      userId,
      role: "applicant",
      type: "status_change",
      title: "Offer extended",
      body: "An offer has been extended for Data Intern.",
      params: { status: "offer", listingTitle: "Data Intern" },
    });
    await db.createNotification({ userId, role: "applicant", type: "status_change", title: "Old", body: "Old" });

    const stored = await db.listNotifications(userId, "applicant");
    expect(stored.map((n) => n.params)).toEqual(
      expect.arrayContaining([{ status: "offer", listingTitle: "Data Intern" }, null])
    );
  });
});

describe("extension tokens", () => {
  it("resolves a created token back to its applicant", async () => {
    const applicantId = await setupApplicant();
    const token = await db.createExtensionToken(applicantId);

    expect(await db.getApplicantIdByExtensionToken(token)).toBe(applicantId);
    expect(await db.hasExtensionToken(applicantId)).toBe(true);
  });

  it("regenerating a token invalidates the previous one", async () => {
    const applicantId = await setupApplicant();
    const first = await db.createExtensionToken(applicantId);
    const second = await db.createExtensionToken(applicantId);

    expect(first).not.toBe(second);
    expect(await db.getApplicantIdByExtensionToken(first)).toBeNull();
    expect(await db.getApplicantIdByExtensionToken(second)).toBe(applicantId);
  });

  it("returns null for an unknown or revoked token", async () => {
    expect(await db.getApplicantIdByExtensionToken("not-a-real-token")).toBeNull();
  });
});

describe("voluntary disclosures", () => {
  it("defaults to blank fields and no consent when nothing has been saved yet", async () => {
    const applicantId = await setupApplicant();
    expect(await db.getVoluntaryDisclosures(applicantId)).toEqual({
      genderIdentity: "",
      raceEthnicity: "",
      veteranStatus: "",
      disabilityStatus: "",
      consentToAutofill: false,
    });
  });

  it("round-trips a saved record", async () => {
    const applicantId = await setupApplicant();
    const saved = await db.saveVoluntaryDisclosures(applicantId, {
      genderIdentity: "Woman",
      raceEthnicity: "Asian",
      veteranStatus: "Prefer not to say",
      disabilityStatus: "No, I do not have a disability",
      consentToAutofill: true,
    });
    expect(saved.genderIdentity).toBe("Woman");
    expect(saved.consentToAutofill).toBe(true);
    expect(await db.getVoluntaryDisclosures(applicantId)).toEqual(saved);
  });

  it("overwrites rather than duplicates on a second save for the same applicant", async () => {
    const applicantId = await setupApplicant();
    await db.saveVoluntaryDisclosures(applicantId, {
      genderIdentity: "Woman",
      raceEthnicity: "",
      veteranStatus: "",
      disabilityStatus: "",
      consentToAutofill: true,
    });
    await db.saveVoluntaryDisclosures(applicantId, {
      genderIdentity: "",
      raceEthnicity: "",
      veteranStatus: "",
      disabilityStatus: "",
      consentToAutofill: false,
    });
    expect(await db.getVoluntaryDisclosures(applicantId)).toEqual({
      genderIdentity: "",
      raceEthnicity: "",
      veteranStatus: "",
      disabilityStatus: "",
      consentToAutofill: false,
    });
  });
});

// The riskiest new logic in this file — a bug here means either data that
// should be gone survives (a real GDPR problem) or an unrelated account's
// data gets swept up in someone else's deletion.
describe("account deletion", () => {
  async function fullySetUp() {
    const { companyId, listing } = await setupCompanyWithListing();
    const applicantId = await setupApplicant({ discoverable: true });
    const application = await db.createApplication({ applicantId, listingId: listing.id, overridden: false, answers: [] });
    await db.saveListing(applicantId, listing.id);
    await db.createSavedSearch({ applicantId, name: "watch", filters: { query: "", countries: [], cities: [], languages: [], workArrangements: [], durations: [], fieldOfStudy: "" } });
    await db.shortlistCandidate(companyId, applicantId);
    const conversation = await db.getOrCreateConversation(applicantId, companyId);
    await db.sendMessage(conversation.id, "company", "hello");
    const proposal = await db.createInterviewProposal({
      conversationId: conversation.id,
      proposedBy: "company",
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      durationMinutes: 30,
      location: "",
      note: "",
    });
    await db.createNotification({ userId: applicantId, role: "applicant", type: "status_change", title: "t", body: "b" });
    await db.createNotification({ userId: companyId, role: "company", type: "new_application", title: "t", body: "b" });
    await db.createExtensionToken(applicantId);
    await db.saveVoluntaryDisclosures(applicantId, {
      genderIdentity: "Woman",
      raceEthnicity: "",
      veteranStatus: "",
      disabilityStatus: "",
      consentToAutofill: true,
    });
    return { companyId, listing, applicantId, application, conversation, proposal };
  }

  it("removes everything reachable from a deleted applicant account", async () => {
    const { companyId, listing, applicantId, conversation } = await fullySetUp();

    await db.deleteApplicantAccount(applicantId);

    expect(await db.getApplicant(applicantId)).toBeNull();
    expect(await db.getUserById(applicantId)).toBeNull();
    expect(await db.listApplications(applicantId)).toHaveLength(0);
    expect(await db.listSavedListingIds(applicantId)).toHaveLength(0);
    expect(await db.listSavedSearches(applicantId)).toHaveLength(0);
    expect(await db.listShortlistedApplicantIds(companyId)).not.toContain(applicantId);
    expect(await db.getConversationById(conversation.id)).toBeNull();
    expect(await db.listMessages(conversation.id)).toHaveLength(0);
    expect(await db.countUnreadNotifications(applicantId, "applicant")).toBe(0);
    expect(await db.hasExtensionToken(applicantId)).toBe(false);
    expect(await db.getVoluntaryDisclosures(applicantId)).toEqual({
      genderIdentity: "",
      raceEthnicity: "",
      veteranStatus: "",
      disabilityStatus: "",
      consentToAutofill: false,
    });

    // The company itself, and its listing, must survive an applicant's deletion.
    expect(await db.getCompany(companyId)).not.toBeNull();
    expect(await db.getListing(listing.id)).not.toBeNull();
  });

  it("removes everything reachable from a deleted company account, including its listings' applications", async () => {
    const { companyId, listing, applicantId, application, conversation } = await fullySetUp();

    await db.deleteCompanyAccount(companyId);

    expect(await db.getCompany(companyId)).toBeNull();
    expect(await db.getUserById(companyId)).toBeNull();
    expect(await db.getListing(listing.id)).toBeNull();
    expect(await db.getConversationById(conversation.id)).toBeNull();
    expect(await db.countUnreadNotifications(companyId, "company")).toBe(0);

    // Deleting the listing takes its applications with it (avoids a
    // dangling listing_id), but the applicant account itself survives.
    const remainingApplications = await db.listApplications(applicantId);
    expect(remainingApplications.find((a) => a.id === application.id)).toBeUndefined();
    expect(await db.getApplicant(applicantId)).not.toBeNull();
  });

  it("never touches an unrelated account's data", async () => {
    const { applicantId: victimId } = await fullySetUp();
    const bystanderId = await setupApplicant({ name: "Bystander" });
    const { listing: bystanderListing } = await setupCompanyWithListing();
    await db.saveListing(bystanderId, bystanderListing.id);

    await db.deleteApplicantAccount(victimId);

    expect(await db.getApplicant(bystanderId)).not.toBeNull();
    expect(await db.listSavedListingIds(bystanderId)).toContain(bystanderListing.id);
  });
});
