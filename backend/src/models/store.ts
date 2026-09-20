// SQLite-backed data access layer (see db/database.ts). Every method stays
// async even though better-sqlite3 itself is synchronous — callers already
// await everything and never touch the storage shape directly, so swapping
// in a real async driver (Postgres, etc.) later is still a drop-in change.
import { randomUUID } from "node:crypto";
import { sqlite } from "../db/database.js";
import type {
  Applicant,
  Application,
  ApplicationStatus,
  CertificationEntry,
  Company,
  Conversation,
  ConversationSummary,
  CoverLetterPrompts,
  DocumentFile,
  EducationEntry,
  ExtraAnswer,
  InterviewProposal,
  InterviewProposalStatus,
  Listing,
  Message,
  Notification,
  NotificationType,
  ProjectEntry,
  SavedSearch,
  SavedSearchFilters,
  UpcomingInterview,
  UserRole,
  VoluntaryDisclosures,
  WorkExperienceEntry,
} from "../types/domain.js";

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: string;
}

export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
}

function userFromRow(row: UserRow): StoredUser {
  return { id: row.id, email: row.email, passwordHash: row.password_hash, role: row.role, createdAt: row.created_at };
}

const EMPTY_COVER_LETTER_PROMPTS: CoverLetterPrompts = {
  whyThisField: "",
  provenStrength: "",
  workingStyle: "",
  careerGoals: "",
};

// Merged over the stored JSON rather than trusted as-is — a row written
// before a prompt existed (or a partial client payload) would otherwise
// come back missing keys the rest of the app assumes are always present.
function coverLetterPromptsFromJson(raw: string): CoverLetterPrompts {
  return { ...EMPTY_COVER_LETTER_PROMPTS, ...JSON.parse(raw) };
}

function applicantFromRow(row: any): Applicant {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    portfolioUrl: row.portfolio_url,
    citizenship: row.citizenship,
    secondCitizenship: row.second_citizenship,
    placeOfBirth: row.place_of_birth,
    residence: row.residence,
    education: JSON.parse(row.education),
    workExperience: JSON.parse(row.work_experience),
    projects: JSON.parse(row.projects),
    certifications: JSON.parse(row.certifications),
    documents: JSON.parse(row.documents),
    availableFrom: row.available_from,
    preferredLength: row.preferred_length,
    workArrangementPreference: JSON.parse(row.work_arrangement_preference),
    preferredLocations: JSON.parse(row.preferred_locations),
    languages: JSON.parse(row.languages),
    skills: JSON.parse(row.skills),
    interests: JSON.parse(row.interests),
    qualifications: JSON.parse(row.qualifications),
    summary: row.summary,
    coverLetterPrompts: coverLetterPromptsFromJson(row.cover_letter_prompts),
    profileComplete: Boolean(row.profile_complete),
    discoverable: Boolean(row.discoverable),
  };
}

function companyFromRow(row: any): Company {
  return {
    id: row.id,
    name: row.name,
    verified: Boolean(row.verified),
    logoUrl: row.logo_url,
    description: row.description,
    website: row.website,
    headquarters: row.headquarters,
    companySize: row.company_size,
  };
}

function listingFromRow(row: any): Listing {
  return {
    id: row.id,
    companyId: row.company_id,
    createdAt: row.created_at,
    title: row.title,
    location: row.location,
    country: row.country,
    origin: row.origin,
    department: row.department,
    workArrangement: row.work_arrangement,
    requiredEducationLevel: row.required_education_level,
    duration: row.duration,
    startDate: row.start_date,
    startLabel: row.start_label,
    endLabel: row.end_label,
    compensation: row.compensation,
    applicationDeadline: row.application_deadline,
    description: row.description,
    requirements: JSON.parse(row.requirements),
    skills: JSON.parse(row.skills),
    targetFields: JSON.parse(row.target_fields),
    requiredLanguages: JSON.parse(row.required_languages),
    industries: JSON.parse(row.industries),
    preferredQualifications: JSON.parse(row.preferred_qualifications),
    eligibility: JSON.parse(row.eligibility),
    extraQuestions: JSON.parse(row.extra_questions),
  };
}

function applicationFromRow(row: any): Application {
  return {
    id: row.id,
    applicantId: row.applicant_id,
    listingId: row.listing_id,
    submittedAt: row.submitted_at,
    overridden: Boolean(row.overridden),
    extraAnswers: JSON.parse(row.extra_answers),
    status: row.status,
  };
}

function conversationFromRow(row: any): Conversation {
  return {
    id: row.id,
    applicantId: row.applicant_id,
    companyId: row.company_id,
    createdAt: row.created_at,
    lastMessageAt: row.last_message_at,
  };
}

function messageFromRow(row: any): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderRole: row.sender_role,
    body: row.body,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

function notificationFromRow(row: any): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    role: row.role,
    type: row.type,
    title: row.title,
    body: row.body,
    link: row.link,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

function interviewProposalFromRow(row: any): InterviewProposal {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    proposedBy: row.proposed_by,
    scheduledAt: row.scheduled_at,
    durationMinutes: row.duration_minutes,
    location: row.location,
    note: row.note,
    status: row.status,
    createdAt: row.created_at,
    respondedAt: row.responded_at,
  };
}

export const db = {
  // --- users / auth ---

  async createUser(input: { id: string; email: string; passwordHash: string; role: UserRole }): Promise<StoredUser> {
    const createdAt = new Date().toISOString();
    sqlite
      .prepare(`INSERT INTO users (id, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)`)
      .run(input.id, input.email, input.passwordHash, input.role, createdAt);
    return { ...input, createdAt };
  },

  async getUserByEmail(email: string): Promise<StoredUser | null> {
    const row = sqlite.prepare(`SELECT * FROM users WHERE email = ?`).get(email) as UserRow | undefined;
    return row ? userFromRow(row) : null;
  },

  async getUserById(id: string): Promise<StoredUser | null> {
    const row = sqlite.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as UserRow | undefined;
    return row ? userFromRow(row) : null;
  },

  // --- applicants ---

  async getApplicant(id: string): Promise<Applicant | null> {
    const row = sqlite.prepare(`SELECT * FROM applicants WHERE id = ?`).get(id);
    return row ? applicantFromRow(row) : null;
  },

  async saveApplicant(
    id: string,
    patch: Omit<Applicant, "id" | "education" | "workExperience" | "projects" | "certifications" | "documents">
  ): Promise<Applicant> {
    sqlite
      .prepare(
        `INSERT INTO applicants (
          id, name, email, phone, portfolio_url, citizenship, second_citizenship, place_of_birth, residence,
          available_from, preferred_length, work_arrangement_preference, preferred_locations,
          languages, skills, interests, qualifications, summary, cover_letter_prompts, profile_complete, discoverable
        ) VALUES (@id, @name, @email, @phone, @portfolioUrl, @citizenship, @secondCitizenship, @placeOfBirth, @residence,
          @availableFrom, @preferredLength, @workArrangementPreference, @preferredLocations,
          @languages, @skills, @interests, @qualifications, @summary, @coverLetterPrompts, @profileComplete, @discoverable)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name, email = excluded.email, phone = excluded.phone,
          portfolio_url = excluded.portfolio_url, citizenship = excluded.citizenship,
          second_citizenship = excluded.second_citizenship,
          place_of_birth = excluded.place_of_birth, residence = excluded.residence,
          available_from = excluded.available_from, preferred_length = excluded.preferred_length,
          work_arrangement_preference = excluded.work_arrangement_preference,
          preferred_locations = excluded.preferred_locations, languages = excluded.languages,
          skills = excluded.skills, interests = excluded.interests,
          qualifications = excluded.qualifications, summary = excluded.summary,
          cover_letter_prompts = excluded.cover_letter_prompts,
          profile_complete = excluded.profile_complete, discoverable = excluded.discoverable`
      )
      .run({
        id,
        name: patch.name,
        email: patch.email,
        phone: patch.phone,
        portfolioUrl: patch.portfolioUrl,
        citizenship: patch.citizenship,
        secondCitizenship: patch.secondCitizenship,
        placeOfBirth: patch.placeOfBirth,
        residence: patch.residence,
        availableFrom: patch.availableFrom,
        preferredLength: patch.preferredLength,
        workArrangementPreference: JSON.stringify(patch.workArrangementPreference),
        preferredLocations: JSON.stringify(patch.preferredLocations),
        languages: JSON.stringify(patch.languages),
        skills: JSON.stringify(patch.skills),
        interests: JSON.stringify(patch.interests),
        qualifications: JSON.stringify(patch.qualifications),
        summary: patch.summary,
        coverLetterPrompts: JSON.stringify(patch.coverLetterPrompts),
        profileComplete: patch.profileComplete ? 1 : 0,
        discoverable: patch.discoverable ? 1 : 0,
      });
    return (await db.getApplicant(id))!;
  },

  async listDiscoverableApplicants(): Promise<Applicant[]> {
    return (sqlite.prepare(`SELECT * FROM applicants WHERE discoverable = 1`).all() as any[]).map(applicantFromRow);
  },

  async setEducation(applicantId: string, entries: Omit<EducationEntry, "id" | "applicantId">[]): Promise<EducationEntry[]> {
    const withIds: EducationEntry[] = entries.map((e) => ({ ...e, id: randomUUID(), applicantId }));
    sqlite.prepare(`UPDATE applicants SET education = ? WHERE id = ?`).run(JSON.stringify(withIds), applicantId);
    return withIds;
  },

  async setWorkExperience(
    applicantId: string,
    entries: Omit<WorkExperienceEntry, "id" | "applicantId">[]
  ): Promise<WorkExperienceEntry[]> {
    const withIds: WorkExperienceEntry[] = entries.map((e) => ({ ...e, id: randomUUID(), applicantId }));
    sqlite.prepare(`UPDATE applicants SET work_experience = ? WHERE id = ?`).run(JSON.stringify(withIds), applicantId);
    return withIds;
  },

  async setProjects(applicantId: string, entries: Omit<ProjectEntry, "id" | "applicantId">[]): Promise<ProjectEntry[]> {
    const withIds: ProjectEntry[] = entries.map((e) => ({ ...e, id: randomUUID(), applicantId }));
    sqlite.prepare(`UPDATE applicants SET projects = ? WHERE id = ?`).run(JSON.stringify(withIds), applicantId);
    return withIds;
  },

  async setCertifications(
    applicantId: string,
    entries: Omit<CertificationEntry, "id" | "applicantId">[]
  ): Promise<CertificationEntry[]> {
    const withIds: CertificationEntry[] = entries.map((e) => ({ ...e, id: randomUUID(), applicantId }));
    sqlite.prepare(`UPDATE applicants SET certifications = ? WHERE id = ?`).run(JSON.stringify(withIds), applicantId);
    return withIds;
  },

  async setDocuments(applicantId: string, entries: Omit<DocumentFile, "id" | "applicantId">[]): Promise<DocumentFile[]> {
    const withIds: DocumentFile[] = entries.map((e) => ({ ...e, id: randomUUID(), applicantId }));
    sqlite.prepare(`UPDATE applicants SET documents = ? WHERE id = ?`).run(JSON.stringify(withIds), applicantId);
    return withIds;
  },

  // --- listings ---

  async listListings(): Promise<Listing[]> {
    return (sqlite.prepare(`SELECT * FROM listings`).all() as any[]).map(listingFromRow);
  },

  async getListing(id: string): Promise<Listing | null> {
    const row = sqlite.prepare(`SELECT * FROM listings WHERE id = ?`).get(id);
    return row ? listingFromRow(row) : null;
  },

  async listListingsByCompany(companyId: string): Promise<Listing[]> {
    return (
      sqlite.prepare(`SELECT * FROM listings WHERE company_id = ? ORDER BY id DESC`).all(companyId) as any[]
    ).map(listingFromRow);
  },

  async createListing(companyId: string, input: Omit<Listing, "id" | "companyId" | "createdAt">): Promise<Listing> {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    sqlite
      .prepare(
        `INSERT INTO listings (
          id, company_id, created_at, title, location, country, origin, department, work_arrangement,
          required_education_level, duration, start_date, start_label, end_label, compensation,
          application_deadline, description, requirements, skills, target_fields, required_languages,
          industries, preferred_qualifications, eligibility, extra_questions
        ) VALUES (@id, @companyId, @createdAt, @title, @location, @country, @origin, @department, @workArrangement,
          @requiredEducationLevel, @duration, @startDate, @startLabel, @endLabel, @compensation,
          @applicationDeadline, @description, @requirements, @skills, @targetFields, @requiredLanguages,
          @industries, @preferredQualifications, @eligibility, @extraQuestions)`
      )
      .run(listingParams(id, companyId, createdAt, input));
    return (await db.getListing(id))!;
  },

  async updateListing(
    id: string,
    companyId: string,
    patch: Omit<Listing, "id" | "companyId" | "createdAt">
  ): Promise<Listing | null> {
    const existing = await db.getListing(id);
    if (!existing || existing.companyId !== companyId) return null;
    sqlite
      .prepare(
        `UPDATE listings SET
          title=@title, location=@location, country=@country, origin=@origin, department=@department,
          work_arrangement=@workArrangement, required_education_level=@requiredEducationLevel, duration=@duration,
          start_date=@startDate, start_label=@startLabel, end_label=@endLabel, compensation=@compensation,
          application_deadline=@applicationDeadline, description=@description, requirements=@requirements,
          skills=@skills, target_fields=@targetFields, required_languages=@requiredLanguages,
          industries=@industries, preferred_qualifications=@preferredQualifications, eligibility=@eligibility,
          extra_questions=@extraQuestions
        WHERE id=@id`
      )
      .run(listingParams(id, companyId, existing.createdAt, patch));
    return await db.getListing(id);
  },

  async deleteListing(id: string, companyId: string): Promise<boolean> {
    const result = sqlite.prepare(`DELETE FROM listings WHERE id = ? AND company_id = ?`).run(id, companyId);
    return result.changes > 0;
  },

  // --- companies ---

  async getCompany(id: string): Promise<Company | null> {
    const row = sqlite.prepare(`SELECT * FROM companies WHERE id = ?`).get(id);
    return row ? companyFromRow(row) : null;
  },

  async saveCompany(id: string, patch: Omit<Company, "id">): Promise<Company> {
    sqlite
      .prepare(
        `INSERT INTO companies (id, name, verified, logo_url, description, website, headquarters, company_size)
         VALUES (@id, @name, @verified, @logoUrl, @description, @website, @headquarters, @companySize)
         ON CONFLICT(id) DO UPDATE SET
           name=excluded.name, verified=excluded.verified, logo_url=excluded.logo_url,
           description=excluded.description, website=excluded.website, headquarters=excluded.headquarters,
           company_size=excluded.company_size`
      )
      .run({
        id,
        name: patch.name,
        verified: patch.verified ? 1 : 0,
        logoUrl: patch.logoUrl,
        description: patch.description,
        website: patch.website,
        headquarters: patch.headquarters,
        companySize: patch.companySize,
      });
    return (await db.getCompany(id))!;
  },

  // --- applications ---

  async listApplicationsForCompany(companyId: string): Promise<Application[]> {
    const rows = sqlite
      .prepare(
        `SELECT a.* FROM applications a
         JOIN listings l ON l.id = a.listing_id
         WHERE l.company_id = ?
         ORDER BY a.submitted_at DESC`
      )
      .all(companyId) as any[];
    return rows.map(applicationFromRow);
  },

  async updateApplicationStatus(
    applicationId: string,
    companyId: string,
    status: ApplicationStatus
  ): Promise<Application | null> {
    // A company can only move the status of applications to its own
    // listings — the JOIN both looks the row up and enforces that in one
    // query, rather than trusting an applicationId alone. A withdrawn
    // application is a decision only the applicant can make or reverse, so
    // it's excluded from what this query even finds, not just filtered in
    // the UI.
    const owns = sqlite
      .prepare(
        `SELECT 1 FROM applications a
         JOIN listings l ON l.id = a.listing_id
         WHERE a.id = ? AND l.company_id = ? AND a.status != 'withdrawn'`
      )
      .get(applicationId, companyId);
    if (!owns) return null;

    sqlite.prepare(`UPDATE applications SET status = ? WHERE id = ?`).run(status, applicationId);
    const row = sqlite.prepare(`SELECT * FROM applications WHERE id = ?`).get(applicationId);
    return row ? applicationFromRow(row) : null;
  },

  async withdrawApplication(applicationId: string, applicantId: string): Promise<Application | null> {
    const result = sqlite
      .prepare(`UPDATE applications SET status = 'withdrawn' WHERE id = ? AND applicant_id = ?`)
      .run(applicationId, applicantId);
    if (result.changes === 0) return null;
    const row = sqlite.prepare(`SELECT * FROM applications WHERE id = ?`).get(applicationId);
    return row ? applicationFromRow(row) : null;
  },

  async listApplications(applicantId: string): Promise<Application[]> {
    const rows = sqlite
      .prepare(`SELECT * FROM applications WHERE applicant_id = ? ORDER BY submitted_at DESC`)
      .all(applicantId) as any[];
    return rows.map(applicationFromRow);
  },

  async hasApplied(applicantId: string, listingId: string): Promise<boolean> {
    const row = sqlite
      .prepare(`SELECT 1 FROM applications WHERE applicant_id = ? AND listing_id = ?`)
      .get(applicantId, listingId);
    return Boolean(row);
  },

  async hasApplicantAppliedToCompany(applicantId: string, companyId: string): Promise<boolean> {
    const row = sqlite
      .prepare(
        `SELECT 1 FROM applications a
         JOIN listings l ON l.id = a.listing_id
         WHERE a.applicant_id = ? AND l.company_id = ?`
      )
      .get(applicantId, companyId);
    return Boolean(row);
  },

  async createApplication(input: {
    applicantId: string;
    listingId: string;
    overridden: boolean;
    answers: { key: string; answer: string }[];
  }): Promise<Application> {
    // Prompts are looked up from the listing's own question definitions
    // rather than trusted from the client, so a stored ExtraAnswer always
    // reflects what was actually asked, and answers to keys the listing
    // doesn't recognize are silently dropped.
    const listing = await db.getListing(input.listingId);
    const extraAnswers: ExtraAnswer[] = [];
    if (listing) {
      for (const q of listing.extraQuestions) {
        const answer = input.answers.find((a) => a.key === q.key)?.answer.trim();
        if (answer) extraAnswers.push({ key: q.key, prompt: q.prompt, answer });
      }
    }

    const application: Application = {
      id: randomUUID(),
      applicantId: input.applicantId,
      listingId: input.listingId,
      submittedAt: new Date().toISOString(),
      overridden: input.overridden,
      extraAnswers,
      // A "direct" listing's pipeline lives on InternEZ, so the normal
      // applicant→company status flow applies. Anything else (sourced from
      // elsewhere) means the actual hiring process happens off-platform —
      // see the ApplicationStatus comment in types/domain.ts.
      status: listing?.origin === "direct" ? "applied" : "appliedExternally",
    };

    sqlite
      .prepare(
        `INSERT INTO applications (id, applicant_id, listing_id, submitted_at, overridden, extra_answers, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        application.id,
        application.applicantId,
        application.listingId,
        application.submittedAt,
        application.overridden ? 1 : 0,
        JSON.stringify(application.extraAnswers),
        application.status
      );

    if (extraAnswers.length > 0) {
      const upsert = sqlite.prepare(
        `INSERT INTO reuse_answers (applicant_id, key, answer) VALUES (?, ?, ?)
         ON CONFLICT(applicant_id, key) DO UPDATE SET answer = excluded.answer`
      );
      for (const a of extraAnswers) upsert.run(input.applicantId, a.key, a.answer);
    }

    return application;
  },

  async getReusedAnswer(applicantId: string, key: string): Promise<string | null> {
    const row = sqlite
      .prepare(`SELECT answer FROM reuse_answers WHERE applicant_id = ? AND key = ?`)
      .get(applicantId, key) as { answer: string } | undefined;
    return row?.answer ?? null;
  },

  async getReusedAnswers(applicantId: string, keys: string[]): Promise<Record<string, string>> {
    if (keys.length === 0) return {};
    const placeholders = keys.map(() => "?").join(",");
    const rows = sqlite
      .prepare(`SELECT key, answer FROM reuse_answers WHERE applicant_id = ? AND key IN (${placeholders})`)
      .all(applicantId, ...keys) as { key: string; answer: string }[];
    const result: Record<string, string> = {};
    for (const row of rows) result[row.key] = row.answer;
    return result;
  },

  // --- browser extension tokens ---
  // One active token per applicant — generating a new one implicitly
  // revokes any previous one, so "regenerate" doubles as "revoke leaked
  // token" without needing a separate revoke action.

  async createExtensionToken(applicantId: string): Promise<string> {
    const token = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
    sqlite.prepare(`DELETE FROM extension_tokens WHERE applicant_id = ?`).run(applicantId);
    sqlite
      .prepare(`INSERT INTO extension_tokens (token, applicant_id, created_at) VALUES (?, ?, ?)`)
      .run(token, applicantId, new Date().toISOString());
    return token;
  },

  async getApplicantIdByExtensionToken(token: string): Promise<string | null> {
    const row = sqlite.prepare(`SELECT applicant_id FROM extension_tokens WHERE token = ?`).get(token) as
      | { applicant_id: string }
      | undefined;
    return row?.applicant_id ?? null;
  },

  async hasExtensionToken(applicantId: string): Promise<boolean> {
    const row = sqlite.prepare(`SELECT 1 FROM extension_tokens WHERE applicant_id = ?`).get(applicantId);
    return Boolean(row);
  },

  async revokeExtensionToken(applicantId: string): Promise<void> {
    sqlite.prepare(`DELETE FROM extension_tokens WHERE applicant_id = ?`).run(applicantId);
  },

  // --- voluntary self-identification (GDPR-sensitive, opt-in) ---
  // No row at all is the common case (never filled in) — treated the same
  // as an explicit "everything blank, no consent" record rather than null,
  // so callers don't need a separate null check before reading fields.

  async getVoluntaryDisclosures(applicantId: string): Promise<VoluntaryDisclosures> {
    const row = sqlite.prepare(`SELECT * FROM voluntary_disclosures WHERE applicant_id = ?`).get(applicantId) as
      | {
          gender_identity: string;
          race_ethnicity: string;
          veteran_status: string;
          disability_status: string;
          consent_autofill: number;
        }
      | undefined;
    if (!row) {
      return { genderIdentity: "", raceEthnicity: "", veteranStatus: "", disabilityStatus: "", consentToAutofill: false };
    }
    return {
      genderIdentity: row.gender_identity,
      raceEthnicity: row.race_ethnicity,
      veteranStatus: row.veteran_status,
      disabilityStatus: row.disability_status,
      consentToAutofill: Boolean(row.consent_autofill),
    };
  },

  async saveVoluntaryDisclosures(applicantId: string, patch: VoluntaryDisclosures): Promise<VoluntaryDisclosures> {
    sqlite
      .prepare(
        `INSERT INTO voluntary_disclosures
          (applicant_id, gender_identity, race_ethnicity, veteran_status, disability_status, consent_autofill, updated_at)
         VALUES (@applicantId, @genderIdentity, @raceEthnicity, @veteranStatus, @disabilityStatus, @consentToAutofill, @updatedAt)
         ON CONFLICT(applicant_id) DO UPDATE SET
           gender_identity = excluded.gender_identity,
           race_ethnicity = excluded.race_ethnicity,
           veteran_status = excluded.veteran_status,
           disability_status = excluded.disability_status,
           consent_autofill = excluded.consent_autofill,
           updated_at = excluded.updated_at`
      )
      .run({
        applicantId,
        genderIdentity: patch.genderIdentity,
        raceEthnicity: patch.raceEthnicity,
        veteranStatus: patch.veteranStatus,
        disabilityStatus: patch.disabilityStatus,
        consentToAutofill: patch.consentToAutofill ? 1 : 0,
        updatedAt: new Date().toISOString(),
      });
    return db.getVoluntaryDisclosures(applicantId);
  },

  // --- saved listings ---

  async saveListing(applicantId: string, listingId: string): Promise<void> {
    sqlite
      .prepare(`INSERT OR IGNORE INTO saved_listings (applicant_id, listing_id) VALUES (?, ?)`)
      .run(applicantId, listingId);
  },

  async unsaveListing(applicantId: string, listingId: string): Promise<void> {
    sqlite.prepare(`DELETE FROM saved_listings WHERE applicant_id = ? AND listing_id = ?`).run(applicantId, listingId);
  },

  async isListingSaved(applicantId: string, listingId: string): Promise<boolean> {
    const row = sqlite
      .prepare(`SELECT 1 FROM saved_listings WHERE applicant_id = ? AND listing_id = ?`)
      .get(applicantId, listingId);
    return Boolean(row);
  },

  async listSavedListingIds(applicantId: string): Promise<string[]> {
    const rows = sqlite
      .prepare(`SELECT listing_id FROM saved_listings WHERE applicant_id = ?`)
      .all(applicantId) as { listing_id: string }[];
    return rows.map((r) => r.listing_id);
  },

  // --- shortlisted candidates (company-side mirror of saved listings) ---

  async shortlistCandidate(companyId: string, applicantId: string): Promise<void> {
    sqlite
      .prepare(
        `INSERT OR IGNORE INTO shortlisted_candidates (company_id, applicant_id, created_at) VALUES (?, ?, ?)`
      )
      .run(companyId, applicantId, new Date().toISOString());
  },

  async unshortlistCandidate(companyId: string, applicantId: string): Promise<void> {
    sqlite
      .prepare(`DELETE FROM shortlisted_candidates WHERE company_id = ? AND applicant_id = ?`)
      .run(companyId, applicantId);
  },

  async listShortlistedApplicantIds(companyId: string): Promise<string[]> {
    const rows = sqlite
      .prepare(`SELECT applicant_id FROM shortlisted_candidates WHERE company_id = ? ORDER BY created_at DESC`)
      .all(companyId) as { applicant_id: string }[];
    return rows.map((r) => r.applicant_id);
  },

  // --- saved searches ---

  async createSavedSearch(input: { applicantId: string; name: string; filters: SavedSearchFilters }): Promise<SavedSearch> {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    sqlite
      .prepare(`INSERT INTO saved_searches (id, applicant_id, name, filters, created_at) VALUES (?, ?, ?, ?, ?)`)
      .run(id, input.applicantId, input.name, JSON.stringify(input.filters), createdAt);
    return { id, applicantId: input.applicantId, name: input.name, filters: input.filters, createdAt };
  },

  async listSavedSearches(applicantId: string): Promise<SavedSearch[]> {
    return (
      sqlite
        .prepare(`SELECT * FROM saved_searches WHERE applicant_id = ? ORDER BY created_at DESC`)
        .all(applicantId) as any[]
    ).map((row) => ({
      id: row.id,
      applicantId: row.applicant_id,
      name: row.name,
      filters: JSON.parse(row.filters),
      createdAt: row.created_at,
    }));
  },

  async deleteSavedSearch(id: string, applicantId: string): Promise<boolean> {
    const result = sqlite
      .prepare(`DELETE FROM saved_searches WHERE id = ? AND applicant_id = ?`)
      .run(id, applicantId);
    return result.changes > 0;
  },

  async listAllSavedSearches(): Promise<SavedSearch[]> {
    return (sqlite.prepare(`SELECT * FROM saved_searches`).all() as any[]).map((row) => ({
      id: row.id,
      applicantId: row.applicant_id,
      name: row.name,
      filters: JSON.parse(row.filters),
      createdAt: row.created_at,
    }));
  },

  // --- messaging ---

  async getOrCreateConversation(applicantId: string, companyId: string): Promise<Conversation> {
    const existing = sqlite
      .prepare(`SELECT * FROM conversations WHERE applicant_id = ? AND company_id = ?`)
      .get(applicantId, companyId);
    if (existing) return conversationFromRow(existing);

    const id = randomUUID();
    const now = new Date().toISOString();
    sqlite
      .prepare(`INSERT INTO conversations (id, applicant_id, company_id, created_at, last_message_at) VALUES (?, ?, ?, ?, ?)`)
      .run(id, applicantId, companyId, now, now);
    return { id, applicantId, companyId, createdAt: now, lastMessageAt: now };
  },

  async getConversationById(id: string): Promise<Conversation | null> {
    const row = sqlite.prepare(`SELECT * FROM conversations WHERE id = ?`).get(id);
    return row ? conversationFromRow(row) : null;
  },

  async isConversationParticipant(conversationId: string, userId: string, role: UserRole): Promise<boolean> {
    const column = role === "applicant" ? "applicant_id" : "company_id";
    const row = sqlite.prepare(`SELECT 1 FROM conversations WHERE id = ? AND ${column} = ?`).get(conversationId, userId);
    return Boolean(row);
  },

  async summarizeConversation(conversation: Conversation, viewerRole: UserRole): Promise<ConversationSummary | null> {
    const otherRole: UserRole = viewerRole === "applicant" ? "company" : "applicant";
    const otherPartyId = viewerRole === "applicant" ? conversation.companyId : conversation.applicantId;

    let otherName: string;
    let otherLogoUrl: string | null = null;
    if (viewerRole === "applicant") {
      const company = await db.getCompany(otherPartyId);
      if (!company) return null;
      otherName = company.name || "(unnamed company)";
      otherLogoUrl = company.logoUrl;
    } else {
      const applicant = await db.getApplicant(otherPartyId);
      if (!applicant) return null;
      otherName = applicant.name || "(no name provided)";
    }

    const lastRow = sqlite
      .prepare(`SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1`)
      .get(conversation.id) as any;
    const unreadRow = sqlite
      .prepare(`SELECT COUNT(*) AS n FROM messages WHERE conversation_id = ? AND sender_role = ? AND read_at IS NULL`)
      .get(conversation.id, otherRole) as { n: number };

    return {
      ...conversation,
      otherParty: { id: otherPartyId, name: otherName, logoUrl: otherLogoUrl },
      lastMessage: lastRow
        ? { body: lastRow.body, senderRole: lastRow.sender_role, createdAt: lastRow.created_at }
        : null,
      unreadCount: unreadRow.n,
    };
  },

  async listConversations(userId: string, role: UserRole): Promise<ConversationSummary[]> {
    const column = role === "applicant" ? "applicant_id" : "company_id";
    const rows = sqlite
      .prepare(`SELECT * FROM conversations WHERE ${column} = ? ORDER BY last_message_at DESC`)
      .all(userId) as any[];

    const summaries: ConversationSummary[] = [];
    for (const row of rows) {
      const summary = await db.summarizeConversation(conversationFromRow(row), role);
      if (summary) summaries.push(summary);
    }
    return summaries;
  },

  async listMessages(conversationId: string): Promise<Message[]> {
    return (
      sqlite.prepare(`SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`).all(conversationId) as any[]
    ).map(messageFromRow);
  },

  async sendMessage(conversationId: string, senderRole: UserRole, body: string): Promise<Message> {
    const id = randomUUID();
    const now = new Date().toISOString();
    sqlite
      .prepare(`INSERT INTO messages (id, conversation_id, sender_role, body, created_at) VALUES (?, ?, ?, ?, ?)`)
      .run(id, conversationId, senderRole, body, now);
    sqlite.prepare(`UPDATE conversations SET last_message_at = ? WHERE id = ?`).run(now, conversationId);
    return { id, conversationId, senderRole, body, createdAt: now, readAt: null };
  },

  async markMessagesRead(conversationId: string, readerRole: UserRole): Promise<void> {
    const now = new Date().toISOString();
    sqlite
      .prepare(
        `UPDATE messages SET read_at = ? WHERE conversation_id = ? AND sender_role != ? AND read_at IS NULL`
      )
      .run(now, conversationId, readerRole);
  },

  // --- notifications ---

  async createNotification(input: {
    userId: string;
    role: UserRole;
    type: NotificationType;
    title: string;
    body: string;
    link?: string | null;
  }): Promise<Notification> {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    sqlite
      .prepare(
        `INSERT INTO notifications (id, user_id, role, type, title, body, link, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, input.userId, input.role, input.type, input.title, input.body, input.link ?? null, createdAt);
    return { id, userId: input.userId, role: input.role, type: input.type, title: input.title, body: input.body, link: input.link ?? null, createdAt, readAt: null };
  },

  async listNotifications(userId: string, role: UserRole, limit = 30): Promise<Notification[]> {
    return (
      sqlite
        .prepare(`SELECT * FROM notifications WHERE user_id = ? AND role = ? ORDER BY created_at DESC LIMIT ?`)
        .all(userId, role, limit) as any[]
    ).map(notificationFromRow);
  },

  async countUnreadNotifications(userId: string, role: UserRole): Promise<number> {
    const row = sqlite
      .prepare(`SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND role = ? AND read_at IS NULL`)
      .get(userId, role) as { n: number };
    return row.n;
  },

  async markAllNotificationsRead(userId: string, role: UserRole): Promise<void> {
    const now = new Date().toISOString();
    sqlite
      .prepare(`UPDATE notifications SET read_at = ? WHERE user_id = ? AND role = ? AND read_at IS NULL`)
      .run(now, userId, role);
  },

  async markNotificationRead(id: string, userId: string, role: UserRole): Promise<void> {
    const now = new Date().toISOString();
    sqlite
      .prepare(`UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ? AND role = ? AND read_at IS NULL`)
      .run(now, id, userId, role);
  },

  // --- interview proposals ---
  // Live inside a conversation's timeline; only the other participant may
  // respond, enforced by the route layer checking proposedBy != responder.

  async createInterviewProposal(input: {
    conversationId: string;
    proposedBy: UserRole;
    scheduledAt: string;
    durationMinutes: number;
    location: string;
    note: string;
  }): Promise<InterviewProposal> {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    sqlite
      .prepare(
        `INSERT INTO interview_proposals
          (id, conversation_id, proposed_by, scheduled_at, duration_minutes, location, note, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
      )
      .run(id, input.conversationId, input.proposedBy, input.scheduledAt, input.durationMinutes, input.location, input.note, createdAt);
    return {
      id,
      conversationId: input.conversationId,
      proposedBy: input.proposedBy,
      scheduledAt: input.scheduledAt,
      durationMinutes: input.durationMinutes,
      location: input.location,
      note: input.note,
      status: "pending",
      createdAt,
      respondedAt: null,
    };
  },

  async listInterviewProposals(conversationId: string): Promise<InterviewProposal[]> {
    return (
      sqlite
        .prepare(`SELECT * FROM interview_proposals WHERE conversation_id = ? ORDER BY created_at ASC`)
        .all(conversationId) as any[]
    ).map(interviewProposalFromRow);
  },

  async getInterviewProposal(id: string): Promise<InterviewProposal | null> {
    const row = sqlite.prepare(`SELECT * FROM interview_proposals WHERE id = ?`).get(id);
    return row ? interviewProposalFromRow(row) : null;
  },

  async respondToInterviewProposal(
    id: string,
    status: Extract<InterviewProposalStatus, "accepted" | "declined" | "cancelled">
  ): Promise<InterviewProposal | null> {
    const now = new Date().toISOString();
    const result = sqlite
      .prepare(`UPDATE interview_proposals SET status = ?, responded_at = ? WHERE id = ? AND status = 'pending'`)
      .run(status, now, id);
    if (result.changes === 0) return null;
    return db.getInterviewProposal(id);
  },

  // --- company analytics ---
  // Aggregates over this company's own listings/applications only — no
  // cross-company data. Kept as plain counts/grouping (no external chart
  // library, no status-change history table) so it's cheap to compute from
  // data the app already has.

  async getCompanyAnalytics(companyId: string) {
    const totalListings = (
      sqlite.prepare(`SELECT COUNT(*) AS n FROM listings WHERE company_id = ?`).get(companyId) as { n: number }
    ).n;

    const statusRows = sqlite
      .prepare(
        `SELECT a.status AS status, COUNT(*) AS n
         FROM applications a JOIN listings l ON l.id = a.listing_id
         WHERE l.company_id = ?
         GROUP BY a.status`
      )
      .all(companyId) as { status: ApplicationStatus; n: number }[];
    const byStatus: Record<string, number> = {};
    for (const row of statusRows) byStatus[row.status] = row.n;
    const totalApplications = statusRows.reduce((sum, r) => sum + r.n, 0);

    const perListingRows = sqlite
      .prepare(
        `SELECT l.id AS listingId, l.title AS title, COUNT(a.id) AS applicationCount
         FROM listings l LEFT JOIN applications a ON a.listing_id = l.id
         WHERE l.company_id = ?
         GROUP BY l.id
         ORDER BY applicationCount DESC`
      )
      .all(companyId) as { listingId: string; title: string; applicationCount: number }[];

    const dailyRows = sqlite
      .prepare(
        `SELECT substr(a.submitted_at, 1, 10) AS day, COUNT(*) AS n
         FROM applications a JOIN listings l ON l.id = a.listing_id
         WHERE l.company_id = ? AND a.submitted_at >= ?
         GROUP BY day
         ORDER BY day ASC`
      )
      .all(companyId, new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString()) as { day: string; n: number }[];

    return { totalListings, totalApplications, byStatus, perListing: perListingRows, dailyApplications: dailyRows };
  },

  // --- upcoming interviews (across every conversation at once) ---

  async listUpcomingInterviews(userId: string, role: UserRole): Promise<UpcomingInterview[]> {
    const column = role === "applicant" ? "applicant_id" : "company_id";
    const rows = sqlite
      .prepare(
        `SELECT ip.*, c.applicant_id AS conv_applicant_id, c.company_id AS conv_company_id
         FROM interview_proposals ip
         JOIN conversations c ON c.id = ip.conversation_id
         WHERE c.${column} = ? AND ip.status = 'accepted' AND ip.scheduled_at >= ?
         ORDER BY ip.scheduled_at ASC`
      )
      .all(userId, new Date().toISOString()) as any[];

    const results: UpcomingInterview[] = [];
    for (const row of rows) {
      const otherId = role === "applicant" ? row.conv_company_id : row.conv_applicant_id;
      const otherName =
        role === "applicant" ? (await db.getCompany(otherId))?.name : (await db.getApplicant(otherId))?.name;
      if (!otherName) continue;
      results.push({ ...interviewProposalFromRow(row), otherPartyName: otherName });
    }
    return results;
  },

  // --- account data export (GDPR-style "download my data") ---
  // Assembles a plain JSON snapshot from data this store already knows how
  // to fetch — deliberately not a new parallel query surface.

  async getApplicantExportData(applicantId: string) {
    const [applicant, applications, savedListingIds, savedSearches, conversations] = await Promise.all([
      db.getApplicant(applicantId),
      db.listApplications(applicantId),
      db.listSavedListingIds(applicantId),
      db.listSavedSearches(applicantId),
      db.listConversations(applicantId, "applicant"),
    ]);

    const conversationsWithMessages = await Promise.all(
      conversations.map(async (c) => ({ ...c, messages: await db.listMessages(c.id) }))
    );

    return {
      exportedAt: new Date().toISOString(),
      profile: applicant,
      applications,
      savedListingIds,
      savedSearches,
      conversations: conversationsWithMessages,
      notifications: await db.listNotifications(applicantId, "applicant", 10_000),
    };
  },

  async getCompanyExportData(companyId: string) {
    const [company, listings, applications, shortlistedApplicantIds, conversations] = await Promise.all([
      db.getCompany(companyId),
      db.listListingsByCompany(companyId),
      db.listApplicationsForCompany(companyId),
      db.listShortlistedApplicantIds(companyId),
      db.listConversations(companyId, "company"),
    ]);

    const conversationsWithMessages = await Promise.all(
      conversations.map(async (c) => ({ ...c, messages: await db.listMessages(c.id) }))
    );

    return {
      exportedAt: new Date().toISOString(),
      profile: company,
      listings,
      applications,
      shortlistedApplicantIds,
      conversations: conversationsWithMessages,
      notifications: await db.listNotifications(companyId, "company", 10_000),
    };
  },

  // --- account deletion ---
  // Each is one transaction so a mid-cascade failure can't leave the
  // account half-deleted. Deletes everything reachable from this account,
  // including rows that are technically "about" the other party (e.g. a
  // company's deleted listing takes its applications with it) — leaving
  // those dangling would just accumulate orphaned rows pointing at nothing.

  async deleteApplicantAccount(applicantId: string): Promise<void> {
    const run = sqlite.transaction(() => {
      const conversationIds = (
        sqlite.prepare(`SELECT id FROM conversations WHERE applicant_id = ?`).all(applicantId) as { id: string }[]
      ).map((r) => r.id);
      for (const id of conversationIds) {
        sqlite.prepare(`DELETE FROM interview_proposals WHERE conversation_id = ?`).run(id);
        sqlite.prepare(`DELETE FROM messages WHERE conversation_id = ?`).run(id);
      }
      sqlite.prepare(`DELETE FROM conversations WHERE applicant_id = ?`).run(applicantId);
      sqlite.prepare(`DELETE FROM shortlisted_candidates WHERE applicant_id = ?`).run(applicantId);
      sqlite.prepare(`DELETE FROM saved_searches WHERE applicant_id = ?`).run(applicantId);
      sqlite.prepare(`DELETE FROM saved_listings WHERE applicant_id = ?`).run(applicantId);
      sqlite.prepare(`DELETE FROM reuse_answers WHERE applicant_id = ?`).run(applicantId);
      sqlite.prepare(`DELETE FROM extension_tokens WHERE applicant_id = ?`).run(applicantId);
      sqlite.prepare(`DELETE FROM voluntary_disclosures WHERE applicant_id = ?`).run(applicantId);
      sqlite.prepare(`DELETE FROM applications WHERE applicant_id = ?`).run(applicantId);
      sqlite.prepare(`DELETE FROM notifications WHERE user_id = ? AND role = 'applicant'`).run(applicantId);
      sqlite.prepare(`DELETE FROM applicants WHERE id = ?`).run(applicantId);
      sqlite.prepare(`DELETE FROM users WHERE id = ?`).run(applicantId);
    });
    run();
  },

  async deleteCompanyAccount(companyId: string): Promise<void> {
    const run = sqlite.transaction(() => {
      const conversationIds = (
        sqlite.prepare(`SELECT id FROM conversations WHERE company_id = ?`).all(companyId) as { id: string }[]
      ).map((r) => r.id);
      for (const id of conversationIds) {
        sqlite.prepare(`DELETE FROM interview_proposals WHERE conversation_id = ?`).run(id);
        sqlite.prepare(`DELETE FROM messages WHERE conversation_id = ?`).run(id);
      }
      sqlite.prepare(`DELETE FROM conversations WHERE company_id = ?`).run(companyId);
      sqlite.prepare(`DELETE FROM shortlisted_candidates WHERE company_id = ?`).run(companyId);

      const listingIds = (
        sqlite.prepare(`SELECT id FROM listings WHERE company_id = ?`).all(companyId) as { id: string }[]
      ).map((r) => r.id);
      for (const id of listingIds) {
        sqlite.prepare(`DELETE FROM applications WHERE listing_id = ?`).run(id);
        sqlite.prepare(`DELETE FROM saved_listings WHERE listing_id = ?`).run(id);
      }
      sqlite.prepare(`DELETE FROM listings WHERE company_id = ?`).run(companyId);

      sqlite.prepare(`DELETE FROM notifications WHERE user_id = ? AND role = 'company'`).run(companyId);
      sqlite.prepare(`DELETE FROM companies WHERE id = ?`).run(companyId);
      sqlite.prepare(`DELETE FROM users WHERE id = ?`).run(companyId);
    });
    run();
  },
};

function listingParams(id: string, companyId: string, createdAt: string, input: Omit<Listing, "id" | "companyId" | "createdAt">) {
  return {
    id,
    companyId,
    createdAt,
    title: input.title,
    location: input.location,
    country: input.country,
    origin: input.origin,
    department: input.department,
    workArrangement: input.workArrangement,
    requiredEducationLevel: input.requiredEducationLevel,
    duration: input.duration,
    startDate: input.startDate,
    startLabel: input.startLabel,
    endLabel: input.endLabel,
    compensation: input.compensation,
    applicationDeadline: input.applicationDeadline,
    description: input.description,
    requirements: JSON.stringify(input.requirements),
    skills: JSON.stringify(input.skills),
    targetFields: JSON.stringify(input.targetFields),
    requiredLanguages: JSON.stringify(input.requiredLanguages),
    industries: JSON.stringify(input.industries),
    preferredQualifications: JSON.stringify(input.preferredQualifications),
    eligibility: JSON.stringify(input.eligibility),
    extraQuestions: JSON.stringify(input.extraQuestions),
  };
}
