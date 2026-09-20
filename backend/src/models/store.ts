// Postgres-backed data access layer (see db/database.ts). Every method was
// already async before this was Postgres — callers already await
// everything and never touch the storage shape directly, so the earlier
// SQLite→Postgres swap only ever needed to touch this file and database.ts.
import { randomUUID } from "node:crypto";
import { pool, withTransaction } from "../db/database.js";
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
    await pool.query(`INSERT INTO users (id, email, password_hash, role, created_at) VALUES ($1, $2, $3, $4, $5)`, [
      input.id,
      input.email,
      input.passwordHash,
      input.role,
      createdAt,
    ]);
    return { ...input, createdAt };
  },

  async getUserByEmail(email: string): Promise<StoredUser | null> {
    const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    return rows[0] ? userFromRow(rows[0]) : null;
  },

  async getUserById(id: string): Promise<StoredUser | null> {
    const { rows } = await pool.query(`SELECT * FROM users WHERE id = $1`, [id]);
    return rows[0] ? userFromRow(rows[0]) : null;
  },

  // --- applicants ---

  async getApplicant(id: string): Promise<Applicant | null> {
    const { rows } = await pool.query(`SELECT * FROM applicants WHERE id = $1`, [id]);
    return rows[0] ? applicantFromRow(rows[0]) : null;
  },

  async saveApplicant(
    id: string,
    patch: Omit<Applicant, "id" | "education" | "workExperience" | "projects" | "certifications" | "documents">
  ): Promise<Applicant> {
    await pool.query(
      `INSERT INTO applicants (
        id, name, email, phone, portfolio_url, citizenship, second_citizenship, place_of_birth, residence,
        available_from, preferred_length, work_arrangement_preference, preferred_locations,
        languages, skills, interests, qualifications, summary, cover_letter_prompts, profile_complete, discoverable
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      ON CONFLICT (id) DO UPDATE SET
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
        profile_complete = excluded.profile_complete, discoverable = excluded.discoverable`,
      [
        id,
        patch.name,
        patch.email,
        patch.phone,
        patch.portfolioUrl,
        patch.citizenship,
        patch.secondCitizenship,
        patch.placeOfBirth,
        patch.residence,
        patch.availableFrom,
        patch.preferredLength,
        JSON.stringify(patch.workArrangementPreference),
        JSON.stringify(patch.preferredLocations),
        JSON.stringify(patch.languages),
        JSON.stringify(patch.skills),
        JSON.stringify(patch.interests),
        JSON.stringify(patch.qualifications),
        patch.summary,
        JSON.stringify(patch.coverLetterPrompts),
        patch.profileComplete ? 1 : 0,
        patch.discoverable ? 1 : 0,
      ]
    );
    return (await db.getApplicant(id))!;
  },

  async listDiscoverableApplicants(): Promise<Applicant[]> {
    const { rows } = await pool.query(`SELECT * FROM applicants WHERE discoverable = 1`);
    return rows.map(applicantFromRow);
  },

  async setEducation(applicantId: string, entries: Omit<EducationEntry, "id" | "applicantId">[]): Promise<EducationEntry[]> {
    const withIds: EducationEntry[] = entries.map((e) => ({ ...e, id: randomUUID(), applicantId }));
    await pool.query(`UPDATE applicants SET education = $1 WHERE id = $2`, [JSON.stringify(withIds), applicantId]);
    return withIds;
  },

  async setWorkExperience(
    applicantId: string,
    entries: Omit<WorkExperienceEntry, "id" | "applicantId">[]
  ): Promise<WorkExperienceEntry[]> {
    const withIds: WorkExperienceEntry[] = entries.map((e) => ({ ...e, id: randomUUID(), applicantId }));
    await pool.query(`UPDATE applicants SET work_experience = $1 WHERE id = $2`, [JSON.stringify(withIds), applicantId]);
    return withIds;
  },

  async setProjects(applicantId: string, entries: Omit<ProjectEntry, "id" | "applicantId">[]): Promise<ProjectEntry[]> {
    const withIds: ProjectEntry[] = entries.map((e) => ({ ...e, id: randomUUID(), applicantId }));
    await pool.query(`UPDATE applicants SET projects = $1 WHERE id = $2`, [JSON.stringify(withIds), applicantId]);
    return withIds;
  },

  async setCertifications(
    applicantId: string,
    entries: Omit<CertificationEntry, "id" | "applicantId">[]
  ): Promise<CertificationEntry[]> {
    const withIds: CertificationEntry[] = entries.map((e) => ({ ...e, id: randomUUID(), applicantId }));
    await pool.query(`UPDATE applicants SET certifications = $1 WHERE id = $2`, [JSON.stringify(withIds), applicantId]);
    return withIds;
  },

  async setDocuments(applicantId: string, entries: Omit<DocumentFile, "id" | "applicantId">[]): Promise<DocumentFile[]> {
    const withIds: DocumentFile[] = entries.map((e) => ({ ...e, id: randomUUID(), applicantId }));
    await pool.query(`UPDATE applicants SET documents = $1 WHERE id = $2`, [JSON.stringify(withIds), applicantId]);
    return withIds;
  },

  // --- listings ---

  async listListings(): Promise<Listing[]> {
    const { rows } = await pool.query(`SELECT * FROM listings`);
    return rows.map(listingFromRow);
  },

  async getListing(id: string): Promise<Listing | null> {
    const { rows } = await pool.query(`SELECT * FROM listings WHERE id = $1`, [id]);
    return rows[0] ? listingFromRow(rows[0]) : null;
  },

  async listListingsByCompany(companyId: string): Promise<Listing[]> {
    const { rows } = await pool.query(`SELECT * FROM listings WHERE company_id = $1 ORDER BY id DESC`, [companyId]);
    return rows.map(listingFromRow);
  },

  async createListing(companyId: string, input: Omit<Listing, "id" | "companyId" | "createdAt">): Promise<Listing> {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    await pool.query(
      `INSERT INTO listings (
        id, company_id, created_at, title, location, country, origin, department, work_arrangement,
        required_education_level, duration, start_date, start_label, end_label, compensation,
        application_deadline, description, requirements, skills, target_fields, required_languages,
        industries, preferred_qualifications, eligibility, extra_questions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)`,
      listingParams(id, companyId, createdAt, input)
    );
    return (await db.getListing(id))!;
  },

  async updateListing(
    id: string,
    companyId: string,
    patch: Omit<Listing, "id" | "companyId" | "createdAt">
  ): Promise<Listing | null> {
    const existing = await db.getListing(id);
    if (!existing || existing.companyId !== companyId) return null;
    await pool.query(
      `UPDATE listings SET
        title=$4, location=$5, country=$6, origin=$7, department=$8,
        work_arrangement=$9, required_education_level=$10, duration=$11,
        start_date=$12, start_label=$13, end_label=$14, compensation=$15,
        application_deadline=$16, description=$17, requirements=$18,
        skills=$19, target_fields=$20, required_languages=$21,
        industries=$22, preferred_qualifications=$23, eligibility=$24,
        extra_questions=$25
      WHERE id=$1`,
      listingParams(id, companyId, existing.createdAt, patch)
    );
    return await db.getListing(id);
  },

  async deleteListing(id: string, companyId: string): Promise<boolean> {
    const result = await pool.query(`DELETE FROM listings WHERE id = $1 AND company_id = $2`, [id, companyId]);
    return (result.rowCount ?? 0) > 0;
  },

  // --- companies ---

  async getCompany(id: string): Promise<Company | null> {
    const { rows } = await pool.query(`SELECT * FROM companies WHERE id = $1`, [id]);
    return rows[0] ? companyFromRow(rows[0]) : null;
  },

  async saveCompany(id: string, patch: Omit<Company, "id">): Promise<Company> {
    await pool.query(
      `INSERT INTO companies (id, name, verified, logo_url, description, website, headquarters, company_size)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         name=excluded.name, verified=excluded.verified, logo_url=excluded.logo_url,
         description=excluded.description, website=excluded.website, headquarters=excluded.headquarters,
         company_size=excluded.company_size`,
      [
        id,
        patch.name,
        patch.verified ? 1 : 0,
        patch.logoUrl,
        patch.description,
        patch.website,
        patch.headquarters,
        patch.companySize,
      ]
    );
    return (await db.getCompany(id))!;
  },

  // --- applications ---

  async listApplicationsForCompany(companyId: string): Promise<Application[]> {
    const { rows } = await pool.query(
      `SELECT a.* FROM applications a
       JOIN listings l ON l.id = a.listing_id
       WHERE l.company_id = $1
       ORDER BY a.submitted_at DESC`,
      [companyId]
    );
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
    const { rows: owns } = await pool.query(
      `SELECT 1 FROM applications a
       JOIN listings l ON l.id = a.listing_id
       WHERE a.id = $1 AND l.company_id = $2 AND a.status != 'withdrawn'`,
      [applicationId, companyId]
    );
    if (owns.length === 0) return null;

    await pool.query(`UPDATE applications SET status = $1 WHERE id = $2`, [status, applicationId]);
    const { rows } = await pool.query(`SELECT * FROM applications WHERE id = $1`, [applicationId]);
    return rows[0] ? applicationFromRow(rows[0]) : null;
  },

  async withdrawApplication(applicationId: string, applicantId: string): Promise<Application | null> {
    const result = await pool.query(
      `UPDATE applications SET status = 'withdrawn' WHERE id = $1 AND applicant_id = $2`,
      [applicationId, applicantId]
    );
    if ((result.rowCount ?? 0) === 0) return null;
    const { rows } = await pool.query(`SELECT * FROM applications WHERE id = $1`, [applicationId]);
    return rows[0] ? applicationFromRow(rows[0]) : null;
  },

  async listApplications(applicantId: string): Promise<Application[]> {
    const { rows } = await pool.query(`SELECT * FROM applications WHERE applicant_id = $1 ORDER BY submitted_at DESC`, [
      applicantId,
    ]);
    return rows.map(applicationFromRow);
  },

  async hasApplied(applicantId: string, listingId: string): Promise<boolean> {
    const { rows } = await pool.query(`SELECT 1 FROM applications WHERE applicant_id = $1 AND listing_id = $2`, [
      applicantId,
      listingId,
    ]);
    return rows.length > 0;
  },

  async hasApplicantAppliedToCompany(applicantId: string, companyId: string): Promise<boolean> {
    const { rows } = await pool.query(
      `SELECT 1 FROM applications a
       JOIN listings l ON l.id = a.listing_id
       WHERE a.applicant_id = $1 AND l.company_id = $2`,
      [applicantId, companyId]
    );
    return rows.length > 0;
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

    await pool.query(
      `INSERT INTO applications (id, applicant_id, listing_id, submitted_at, overridden, extra_answers, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        application.id,
        application.applicantId,
        application.listingId,
        application.submittedAt,
        application.overridden ? 1 : 0,
        JSON.stringify(application.extraAnswers),
        application.status,
      ]
    );

    if (extraAnswers.length > 0) {
      for (const a of extraAnswers) {
        await pool.query(
          `INSERT INTO reuse_answers (applicant_id, key, answer) VALUES ($1, $2, $3)
           ON CONFLICT (applicant_id, key) DO UPDATE SET answer = excluded.answer`,
          [input.applicantId, a.key, a.answer]
        );
      }
    }

    return application;
  },

  async getReusedAnswer(applicantId: string, key: string): Promise<string | null> {
    const { rows } = await pool.query(`SELECT answer FROM reuse_answers WHERE applicant_id = $1 AND key = $2`, [
      applicantId,
      key,
    ]);
    return rows[0]?.answer ?? null;
  },

  async getReusedAnswers(applicantId: string, keys: string[]): Promise<Record<string, string>> {
    if (keys.length === 0) return {};
    const { rows } = await pool.query(
      `SELECT key, answer FROM reuse_answers WHERE applicant_id = $1 AND key = ANY($2::text[])`,
      [applicantId, keys]
    );
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
    await pool.query(`DELETE FROM extension_tokens WHERE applicant_id = $1`, [applicantId]);
    await pool.query(`INSERT INTO extension_tokens (token, applicant_id, created_at) VALUES ($1, $2, $3)`, [
      token,
      applicantId,
      new Date().toISOString(),
    ]);
    return token;
  },

  async getApplicantIdByExtensionToken(token: string): Promise<string | null> {
    const { rows } = await pool.query(`SELECT applicant_id FROM extension_tokens WHERE token = $1`, [token]);
    return rows[0]?.applicant_id ?? null;
  },

  async hasExtensionToken(applicantId: string): Promise<boolean> {
    const { rows } = await pool.query(`SELECT 1 FROM extension_tokens WHERE applicant_id = $1`, [applicantId]);
    return rows.length > 0;
  },

  async revokeExtensionToken(applicantId: string): Promise<void> {
    await pool.query(`DELETE FROM extension_tokens WHERE applicant_id = $1`, [applicantId]);
  },

  // --- voluntary self-identification (GDPR-sensitive, opt-in) ---
  // No row at all is the common case (never filled in) — treated the same
  // as an explicit "everything blank, no consent" record rather than null,
  // so callers don't need a separate null check before reading fields.

  async getVoluntaryDisclosures(applicantId: string): Promise<VoluntaryDisclosures> {
    const { rows } = await pool.query(`SELECT * FROM voluntary_disclosures WHERE applicant_id = $1`, [applicantId]);
    const row = rows[0] as
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
    await pool.query(
      `INSERT INTO voluntary_disclosures
        (applicant_id, gender_identity, race_ethnicity, veteran_status, disability_status, consent_autofill, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (applicant_id) DO UPDATE SET
         gender_identity = excluded.gender_identity,
         race_ethnicity = excluded.race_ethnicity,
         veteran_status = excluded.veteran_status,
         disability_status = excluded.disability_status,
         consent_autofill = excluded.consent_autofill,
         updated_at = excluded.updated_at`,
      [
        applicantId,
        patch.genderIdentity,
        patch.raceEthnicity,
        patch.veteranStatus,
        patch.disabilityStatus,
        patch.consentToAutofill ? 1 : 0,
        new Date().toISOString(),
      ]
    );
    return db.getVoluntaryDisclosures(applicantId);
  },

  // --- saved listings ---

  async saveListing(applicantId: string, listingId: string): Promise<void> {
    await pool.query(
      `INSERT INTO saved_listings (applicant_id, listing_id) VALUES ($1, $2) ON CONFLICT (applicant_id, listing_id) DO NOTHING`,
      [applicantId, listingId]
    );
  },

  async unsaveListing(applicantId: string, listingId: string): Promise<void> {
    await pool.query(`DELETE FROM saved_listings WHERE applicant_id = $1 AND listing_id = $2`, [applicantId, listingId]);
  },

  async isListingSaved(applicantId: string, listingId: string): Promise<boolean> {
    const { rows } = await pool.query(`SELECT 1 FROM saved_listings WHERE applicant_id = $1 AND listing_id = $2`, [
      applicantId,
      listingId,
    ]);
    return rows.length > 0;
  },

  async listSavedListingIds(applicantId: string): Promise<string[]> {
    const { rows } = await pool.query(`SELECT listing_id FROM saved_listings WHERE applicant_id = $1`, [applicantId]);
    return rows.map((r) => r.listing_id);
  },

  // --- shortlisted candidates (company-side mirror of saved listings) ---

  async shortlistCandidate(companyId: string, applicantId: string): Promise<void> {
    await pool.query(
      `INSERT INTO shortlisted_candidates (company_id, applicant_id, created_at) VALUES ($1, $2, $3)
       ON CONFLICT (company_id, applicant_id) DO NOTHING`,
      [companyId, applicantId, new Date().toISOString()]
    );
  },

  async unshortlistCandidate(companyId: string, applicantId: string): Promise<void> {
    await pool.query(`DELETE FROM shortlisted_candidates WHERE company_id = $1 AND applicant_id = $2`, [
      companyId,
      applicantId,
    ]);
  },

  async listShortlistedApplicantIds(companyId: string): Promise<string[]> {
    const { rows } = await pool.query(
      `SELECT applicant_id FROM shortlisted_candidates WHERE company_id = $1 ORDER BY created_at DESC`,
      [companyId]
    );
    return rows.map((r) => r.applicant_id);
  },

  // --- saved searches ---

  async createSavedSearch(input: { applicantId: string; name: string; filters: SavedSearchFilters }): Promise<SavedSearch> {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    await pool.query(`INSERT INTO saved_searches (id, applicant_id, name, filters, created_at) VALUES ($1, $2, $3, $4, $5)`, [
      id,
      input.applicantId,
      input.name,
      JSON.stringify(input.filters),
      createdAt,
    ]);
    return { id, applicantId: input.applicantId, name: input.name, filters: input.filters, createdAt };
  },

  async listSavedSearches(applicantId: string): Promise<SavedSearch[]> {
    const { rows } = await pool.query(`SELECT * FROM saved_searches WHERE applicant_id = $1 ORDER BY created_at DESC`, [
      applicantId,
    ]);
    return rows.map((row) => ({
      id: row.id,
      applicantId: row.applicant_id,
      name: row.name,
      filters: JSON.parse(row.filters),
      createdAt: row.created_at,
    }));
  },

  async deleteSavedSearch(id: string, applicantId: string): Promise<boolean> {
    const result = await pool.query(`DELETE FROM saved_searches WHERE id = $1 AND applicant_id = $2`, [id, applicantId]);
    return (result.rowCount ?? 0) > 0;
  },

  async listAllSavedSearches(): Promise<SavedSearch[]> {
    const { rows } = await pool.query(`SELECT * FROM saved_searches`);
    return rows.map((row) => ({
      id: row.id,
      applicantId: row.applicant_id,
      name: row.name,
      filters: JSON.parse(row.filters),
      createdAt: row.created_at,
    }));
  },

  // --- messaging ---

  async getOrCreateConversation(applicantId: string, companyId: string): Promise<Conversation> {
    const { rows: existingRows } = await pool.query(
      `SELECT * FROM conversations WHERE applicant_id = $1 AND company_id = $2`,
      [applicantId, companyId]
    );
    if (existingRows[0]) return conversationFromRow(existingRows[0]);

    const id = randomUUID();
    const now = new Date().toISOString();
    await pool.query(
      `INSERT INTO conversations (id, applicant_id, company_id, created_at, last_message_at) VALUES ($1, $2, $3, $4, $5)`,
      [id, applicantId, companyId, now, now]
    );
    return { id, applicantId, companyId, createdAt: now, lastMessageAt: now };
  },

  async getConversationById(id: string): Promise<Conversation | null> {
    const { rows } = await pool.query(`SELECT * FROM conversations WHERE id = $1`, [id]);
    return rows[0] ? conversationFromRow(rows[0]) : null;
  },

  async isConversationParticipant(conversationId: string, userId: string, role: UserRole): Promise<boolean> {
    const column = role === "applicant" ? "applicant_id" : "company_id";
    const { rows } = await pool.query(`SELECT 1 FROM conversations WHERE id = $1 AND ${column} = $2`, [
      conversationId,
      userId,
    ]);
    return rows.length > 0;
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

    const { rows: lastRows } = await pool.query(
      `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [conversation.id]
    );
    const { rows: unreadRows } = await pool.query(
      `SELECT COUNT(*) AS n FROM messages WHERE conversation_id = $1 AND sender_role = $2 AND read_at IS NULL`,
      [conversation.id, otherRole]
    );
    const lastRow = lastRows[0];

    return {
      ...conversation,
      otherParty: { id: otherPartyId, name: otherName, logoUrl: otherLogoUrl },
      lastMessage: lastRow
        ? { body: lastRow.body, senderRole: lastRow.sender_role, createdAt: lastRow.created_at }
        : null,
      unreadCount: Number(unreadRows[0].n),
    };
  },

  async listConversations(userId: string, role: UserRole): Promise<ConversationSummary[]> {
    const column = role === "applicant" ? "applicant_id" : "company_id";
    const { rows } = await pool.query(`SELECT * FROM conversations WHERE ${column} = $1 ORDER BY last_message_at DESC`, [
      userId,
    ]);

    const summaries: ConversationSummary[] = [];
    for (const row of rows) {
      const summary = await db.summarizeConversation(conversationFromRow(row), role);
      if (summary) summaries.push(summary);
    }
    return summaries;
  },

  async listMessages(conversationId: string): Promise<Message[]> {
    const { rows } = await pool.query(`SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`, [
      conversationId,
    ]);
    return rows.map(messageFromRow);
  },

  async sendMessage(conversationId: string, senderRole: UserRole, body: string): Promise<Message> {
    const id = randomUUID();
    const now = new Date().toISOString();
    await pool.query(`INSERT INTO messages (id, conversation_id, sender_role, body, created_at) VALUES ($1, $2, $3, $4, $5)`, [
      id,
      conversationId,
      senderRole,
      body,
      now,
    ]);
    await pool.query(`UPDATE conversations SET last_message_at = $1 WHERE id = $2`, [now, conversationId]);
    return { id, conversationId, senderRole, body, createdAt: now, readAt: null };
  },

  async markMessagesRead(conversationId: string, readerRole: UserRole): Promise<void> {
    const now = new Date().toISOString();
    await pool.query(
      `UPDATE messages SET read_at = $1 WHERE conversation_id = $2 AND sender_role != $3 AND read_at IS NULL`,
      [now, conversationId, readerRole]
    );
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
    await pool.query(
      `INSERT INTO notifications (id, user_id, role, type, title, body, link, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, input.userId, input.role, input.type, input.title, input.body, input.link ?? null, createdAt]
    );
    return { id, userId: input.userId, role: input.role, type: input.type, title: input.title, body: input.body, link: input.link ?? null, createdAt, readAt: null };
  },

  async listNotifications(userId: string, role: UserRole, limit = 30): Promise<Notification[]> {
    const { rows } = await pool.query(
      `SELECT * FROM notifications WHERE user_id = $1 AND role = $2 ORDER BY created_at DESC LIMIT $3`,
      [userId, role, limit]
    );
    return rows.map(notificationFromRow);
  },

  async countUnreadNotifications(userId: string, role: UserRole): Promise<number> {
    const { rows } = await pool.query(
      `SELECT COUNT(*) AS n FROM notifications WHERE user_id = $1 AND role = $2 AND read_at IS NULL`,
      [userId, role]
    );
    return Number(rows[0].n);
  },

  async markAllNotificationsRead(userId: string, role: UserRole): Promise<void> {
    const now = new Date().toISOString();
    await pool.query(`UPDATE notifications SET read_at = $1 WHERE user_id = $2 AND role = $3 AND read_at IS NULL`, [
      now,
      userId,
      role,
    ]);
  },

  async markNotificationRead(id: string, userId: string, role: UserRole): Promise<void> {
    const now = new Date().toISOString();
    await pool.query(
      `UPDATE notifications SET read_at = $1 WHERE id = $2 AND user_id = $3 AND role = $4 AND read_at IS NULL`,
      [now, id, userId, role]
    );
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
    await pool.query(
      `INSERT INTO interview_proposals
        (id, conversation_id, proposed_by, scheduled_at, duration_minutes, location, note, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)`,
      [id, input.conversationId, input.proposedBy, input.scheduledAt, input.durationMinutes, input.location, input.note, createdAt]
    );
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
    const { rows } = await pool.query(
      `SELECT * FROM interview_proposals WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [conversationId]
    );
    return rows.map(interviewProposalFromRow);
  },

  async getInterviewProposal(id: string): Promise<InterviewProposal | null> {
    const { rows } = await pool.query(`SELECT * FROM interview_proposals WHERE id = $1`, [id]);
    return rows[0] ? interviewProposalFromRow(rows[0]) : null;
  },

  async respondToInterviewProposal(
    id: string,
    status: Extract<InterviewProposalStatus, "accepted" | "declined" | "cancelled">
  ): Promise<InterviewProposal | null> {
    const now = new Date().toISOString();
    const result = await pool.query(
      `UPDATE interview_proposals SET status = $1, responded_at = $2 WHERE id = $3 AND status = 'pending'`,
      [status, now, id]
    );
    if ((result.rowCount ?? 0) === 0) return null;
    return db.getInterviewProposal(id);
  },

  // --- company analytics ---
  // Aggregates over this company's own listings/applications only — no
  // cross-company data. Kept as plain counts/grouping (no external chart
  // library, no status-change history table) so it's cheap to compute from
  // data the app already has.

  async getCompanyAnalytics(companyId: string) {
    const { rows: totalListingsRows } = await pool.query(`SELECT COUNT(*) AS n FROM listings WHERE company_id = $1`, [
      companyId,
    ]);
    const totalListings = Number(totalListingsRows[0].n);

    const { rows: statusRows } = await pool.query(
      `SELECT a.status AS status, COUNT(*) AS n
       FROM applications a JOIN listings l ON l.id = a.listing_id
       WHERE l.company_id = $1
       GROUP BY a.status`,
      [companyId]
    );
    const byStatus: Record<string, number> = {};
    let totalApplications = 0;
    for (const row of statusRows) {
      const n = Number(row.n);
      byStatus[row.status as ApplicationStatus] = n;
      totalApplications += n;
    }

    const { rows: perListingRows } = await pool.query(
      `SELECT l.id AS "listingId", l.title AS title, COUNT(a.id) AS "applicationCount"
       FROM listings l LEFT JOIN applications a ON a.listing_id = l.id
       WHERE l.company_id = $1
       GROUP BY l.id
       ORDER BY "applicationCount" DESC`,
      [companyId]
    );
    const perListing = perListingRows.map((r) => ({
      listingId: r.listingId,
      title: r.title,
      applicationCount: Number(r.applicationCount),
    }));

    const { rows: dailyRows } = await pool.query(
      `SELECT LEFT(a.submitted_at, 10) AS day, COUNT(*) AS n
       FROM applications a JOIN listings l ON l.id = a.listing_id
       WHERE l.company_id = $1 AND a.submitted_at >= $2
       GROUP BY day
       ORDER BY day ASC`,
      [companyId, new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString()]
    );
    const dailyApplications = dailyRows.map((r) => ({ day: r.day, n: Number(r.n) }));

    return { totalListings, totalApplications, byStatus, perListing, dailyApplications };
  },

  // --- upcoming interviews (across every conversation at once) ---

  async listUpcomingInterviews(userId: string, role: UserRole): Promise<UpcomingInterview[]> {
    const column = role === "applicant" ? "applicant_id" : "company_id";
    const { rows } = await pool.query(
      `SELECT ip.*, c.applicant_id AS conv_applicant_id, c.company_id AS conv_company_id
       FROM interview_proposals ip
       JOIN conversations c ON c.id = ip.conversation_id
       WHERE c.${column} = $1 AND ip.status = 'accepted' AND ip.scheduled_at >= $2
       ORDER BY ip.scheduled_at ASC`,
      [userId, new Date().toISOString()]
    );

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
    await withTransaction(async (client) => {
      const { rows: conversations } = await client.query(`SELECT id FROM conversations WHERE applicant_id = $1`, [
        applicantId,
      ]);
      for (const { id } of conversations) {
        await client.query(`DELETE FROM interview_proposals WHERE conversation_id = $1`, [id]);
        await client.query(`DELETE FROM messages WHERE conversation_id = $1`, [id]);
      }
      await client.query(`DELETE FROM conversations WHERE applicant_id = $1`, [applicantId]);
      await client.query(`DELETE FROM shortlisted_candidates WHERE applicant_id = $1`, [applicantId]);
      await client.query(`DELETE FROM saved_searches WHERE applicant_id = $1`, [applicantId]);
      await client.query(`DELETE FROM saved_listings WHERE applicant_id = $1`, [applicantId]);
      await client.query(`DELETE FROM reuse_answers WHERE applicant_id = $1`, [applicantId]);
      await client.query(`DELETE FROM extension_tokens WHERE applicant_id = $1`, [applicantId]);
      await client.query(`DELETE FROM voluntary_disclosures WHERE applicant_id = $1`, [applicantId]);
      await client.query(`DELETE FROM applications WHERE applicant_id = $1`, [applicantId]);
      await client.query(`DELETE FROM notifications WHERE user_id = $1 AND role = 'applicant'`, [applicantId]);
      await client.query(`DELETE FROM applicants WHERE id = $1`, [applicantId]);
      await client.query(`DELETE FROM users WHERE id = $1`, [applicantId]);
    });
  },

  async deleteCompanyAccount(companyId: string): Promise<void> {
    await withTransaction(async (client) => {
      const { rows: conversations } = await client.query(`SELECT id FROM conversations WHERE company_id = $1`, [
        companyId,
      ]);
      for (const { id } of conversations) {
        await client.query(`DELETE FROM interview_proposals WHERE conversation_id = $1`, [id]);
        await client.query(`DELETE FROM messages WHERE conversation_id = $1`, [id]);
      }
      await client.query(`DELETE FROM conversations WHERE company_id = $1`, [companyId]);
      await client.query(`DELETE FROM shortlisted_candidates WHERE company_id = $1`, [companyId]);

      const { rows: listings } = await client.query(`SELECT id FROM listings WHERE company_id = $1`, [companyId]);
      for (const { id } of listings) {
        await client.query(`DELETE FROM applications WHERE listing_id = $1`, [id]);
        await client.query(`DELETE FROM saved_listings WHERE listing_id = $1`, [id]);
      }
      await client.query(`DELETE FROM listings WHERE company_id = $1`, [companyId]);

      await client.query(`DELETE FROM notifications WHERE user_id = $1 AND role = 'company'`, [companyId]);
      await client.query(`DELETE FROM companies WHERE id = $1`, [companyId]);
      await client.query(`DELETE FROM users WHERE id = $1`, [companyId]);
    });
  },
};

function listingParams(id: string, companyId: string, createdAt: string, input: Omit<Listing, "id" | "companyId" | "createdAt">) {
  return [
    id,
    companyId,
    createdAt,
    input.title,
    input.location,
    input.country,
    input.origin,
    input.department,
    input.workArrangement,
    input.requiredEducationLevel,
    input.duration,
    input.startDate,
    input.startLabel,
    input.endLabel,
    input.compensation,
    input.applicationDeadline,
    input.description,
    JSON.stringify(input.requirements),
    JSON.stringify(input.skills),
    JSON.stringify(input.targetFields),
    JSON.stringify(input.requiredLanguages),
    JSON.stringify(input.industries),
    JSON.stringify(input.preferredQualifications),
    JSON.stringify(input.eligibility),
    JSON.stringify(input.extraQuestions),
  ];
}
