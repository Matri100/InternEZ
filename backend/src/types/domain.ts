// Shared domain types. Mirrored on the frontend in /frontend/src/types.

// InternEZ covers the EU/EEA only (the 27 EU member states, plus Iceland,
// Liechtenstein and Norway under the EEA, plus Switzerland by the same
// convention this app has used since v1 — bilateral agreements, not an EEA
// member, but grouped with EU/EEA for eligibility and free-movement
// purposes). No other region is in scope.
export type CountryCode =
  | "AT" | "BE" | "BG" | "HR" | "CY" | "CZ" | "DK" | "EE" | "FI" | "FR" | "DE" | "GR" | "HU" | "IE" | "IT"
  | "LV" | "LT" | "LU" | "MT" | "NL" | "PL" | "PT" | "RO" | "SK" | "SI" | "ES" | "SE"
  | "IS" | "LI" | "NO" | "CH";

export type RegionCode = "EU";

export type EducationLevel =
  | "High School"
  | "Vocational / Professional"
  | "Associate Degree"
  | "Bachelor"
  | "Master"
  | "PhD";

// Open string type — the canonical option list lives in data/reference.ts so it
// can grow without widening a literal union everywhere it's used.
export type FieldOfStudy = string;

export type InternshipLength = "3 months" | "6 months" | "12 months" | "Flexible";

export type WorkArrangement = "On-site" | "Hybrid" | "Remote";

// Applicant-side preference — a superset of WorkArrangement with "Flexible".
export type WorkArrangementPreference = WorkArrangement | "Flexible";

export type LanguageLevel = "Basic" | "Conversational" | "Fluent" | "Native";

export interface LanguageProficiency {
  language: string;
  level: LanguageLevel;
}

export interface RequiredLanguage {
  language: string;
  minLevel: LanguageLevel;
}

export interface EducationEntry {
  id: string;
  applicantId: string;
  level: EducationLevel;
  institution: string;
  country: CountryCode | "";
  field: FieldOfStudy;
  startYear: string;
  endYear: string;
}

export interface WorkExperienceEntry {
  id: string;
  applicantId: string;
  title: string;
  organization: string;
  field: FieldOfStudy;
  startDate: string; // "YYYY-MM"
  endDate: string; // "YYYY-MM" or "Present"
  skills: string[];
}

export interface ProjectEntry {
  id: string;
  applicantId: string;
  title: string;
  description: string;
  link: string;
  skills: string[];
}

export interface CertificationEntry {
  id: string;
  applicantId: string;
  name: string;
  issuer: string;
  year: string;
}

export type DocumentKind = "ID Photo" | "Resume / CV" | "Transcript" | "Certificate" | "Other";

export interface DocumentFile {
  id: string;
  applicantId: string;
  kind: DocumentKind;
  fileName: string;
  mimeType: string;
  size: number;
  dataUrl: string;
}

// A fixed, small set of free-text prompts an applicant answers once, so
// there's real source material — in their own words, not inferred — for
// anything that needs to write on their behalf later (a cover letter, a
// listing's open-ended extra question). Answering these does NOT itself
// generate anything; it's the deterministic autofill's raw material for a
// future generation feature, not a feature in its own right yet.
export interface CoverLetterPrompts {
  whyThisField: string;
  provenStrength: string;
  workingStyle: string;
  careerGoals: string;
}

export interface Applicant {
  id: string;
  name: string;
  email: string;
  phone: string;
  portfolioUrl: string;
  citizenship: CountryCode | null;
  // Optional dual citizenship — a second, independent citizenship that
  // should count on equal footing with the first for eligibility (see
  // computeEligibility in services/eligibility.ts), not a fallback used
  // only when the first doesn't match.
  secondCitizenship: CountryCode | null;
  placeOfBirth: CountryCode | null;
  residence: CountryCode | null;
  education: EducationEntry[];
  workExperience: WorkExperienceEntry[];
  projects: ProjectEntry[];
  certifications: CertificationEntry[];
  documents: DocumentFile[];
  availableFrom: string; // "YYYY-MM"
  preferredLength: InternshipLength | null;
  workArrangementPreference: WorkArrangementPreference[];
  preferredLocations: CountryCode[];
  languages: LanguageProficiency[];
  skills: string[];
  interests: string[];
  qualifications: string[];
  summary: string;
  coverLetterPrompts: CoverLetterPrompts;
  profileComplete: boolean;
  // Opt-in only — off by default. When true, the profile appears in
  // companies' talent search even for roles the applicant never applied to.
  discoverable: boolean;
}

export interface Company {
  id: string;
  name: string;
  verified: boolean;
  logoUrl: string | null;
  description: string;
  website: string;
  headquarters: CountryCode | null;
  companySize: CompanySize | null;
}

export type CompanySize = "1-10" | "11-50" | "51-200" | "201-1000" | "1000+";

export type ListingOrigin = "direct" | "sourced";

export interface ListingEligibility {
  allowedRegions?: RegionCode[];
  citizenOnly?: CountryCode;
  clearance?: boolean;
}

export type ExtraQuestionType = "short_text" | "long_text" | "yes_no";

export interface ExtraQuestion {
  key: string;
  prompt: string;
  type: ExtraQuestionType;
  required: boolean;
}

export interface Listing {
  id: string;
  companyId: string;
  createdAt: string; // ISO timestamp, set server-side on creation — powers "Newest" sort
  title: string;
  location: string;
  country: CountryCode | null; // null = fully remote / no fixed base
  origin: ListingOrigin;
  department: string;
  workArrangement: WorkArrangement;
  requiredEducationLevel: EducationLevel;
  duration: InternshipLength;
  startDate: string; // "YYYY-MM" or "flexible"
  startLabel: string;
  endLabel: string;
  compensation: string;
  applicationDeadline: string;
  description: string;
  // Detected from title+description at write time (see services/language.ts),
  // never client-supplied — one of LANGUAGES in data/reference.ts, or
  // "English" as the safe default when the text's too short to call
  // confidently. Distinct from requiredLanguages below: this is what
  // language the posting itself is written in, not a job requirement.
  language: string;
  // Where a "sourced" listing's real application form lives (see
  // services/ingestion/) — InternEZ has no write access to the employer's
  // own ATS, so applying here means linking out, not submitting through
  // our own form (see ApplyModal). Always "" for origin "direct", where
  // the in-app apply flow is the real pipeline.
  applyUrl: string;
  requirements: string[];
  skills: string[];
  targetFields: FieldOfStudy[];
  requiredLanguages: RequiredLanguage[];
  industries: string[];
  preferredQualifications: string[];
  eligibility: ListingEligibility;
  extraQuestions: ExtraQuestion[];
}

export type EligibilityLevel = "ok" | "review" | "blocked";

export interface EligibilityResult {
  level: EligibilityLevel;
  why: string;
}

export interface MatchFactor {
  key: string;
  label: string;
  points: number;
  max: number;
  neutral: boolean; // true when this factor fell back to a default (e.g. no preference set)
}

export interface MatchResult {
  total: number;
  factors: MatchFactor[];
  explanation: string;
}

export interface ListingWithComputed extends Listing {
  company: Company;
  eligibilityResult: EligibilityResult;
  match: MatchResult;
  saved: boolean;
}

export interface ExtraAnswer {
  key: string;
  prompt: string; // denormalized from the listing's question at submit time
  answer: string; // "Yes" / "No" for yes_no questions, free text otherwise
}

// The company-driven hiring pipeline a submitted application moves through.
// "applied" is the only status an applicant can produce themselves; every
// stage after that is set by the company reviewing it — except "withdrawn",
// which only the applicant can set, and which the company can't override.
//
// "appliedExternally" is a special case of "applied", assigned automatically
// (never manually settable — see APPLICATION_STATUSES in routes/company.ts)
// when the listing's origin isn't "direct": the applicant genuinely applied,
// but the hiring pipeline lives on the company's own system, not InternEZ's,
// so there's no one here to move it through reviewing/interview/offer. It
// exists so the applicant sees an honest "this went through, but we can't
// track what happens next" instead of a status that implies InternEZ is
// watching a pipeline nobody on our end actually has visibility into.
export type ApplicationStatus =
  | "applied"
  | "appliedExternally"
  | "reviewing"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn";

export interface Application {
  id: string;
  applicantId: string;
  listingId: string;
  submittedAt: string;
  overridden: boolean;
  extraAnswers: ExtraAnswer[];
  status: ApplicationStatus;
}

export interface ApplicationWithListing extends Application {
  listing: Listing;
  company: Company;
  eligibilityResult: EligibilityResult;
}

// What a company sees when reviewing who applied to one of their listings —
// a slim applicant summary, not the full profile (no eligibility background
// details a company doesn't need to see directly).
export interface ApplicantSummary {
  id: string;
  name: string;
  email: string;
  phone: string;
  portfolioUrl: string;
  summary: string;
  primaryEducation: { level: EducationLevel; institution: string; field: FieldOfStudy } | null;
  skills: string[];
  resume: DocumentFile | null;
}

export interface ApplicationWithApplicant extends Application {
  applicant: ApplicantSummary;
}

export type UserRole = "applicant" | "company";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

// --- messaging ---
// One thread per (applicant, company) pair — simple and matches how these
// conversations actually work (not per-listing), so a "poke" and a later
// real conversation land in the same place instead of fragmenting.

export interface Message {
  id: string;
  conversationId: string;
  senderRole: UserRole;
  body: string;
  createdAt: string;
  readAt: string | null;
}

export interface Conversation {
  id: string;
  applicantId: string;
  companyId: string;
  createdAt: string;
  lastMessageAt: string;
}

// What the inbox list shows — the conversation plus who's on the other end
// and how many of their messages this viewer hasn't read yet.
export interface ConversationSummary extends Conversation {
  otherParty: { id: string; name: string; logoUrl: string | null };
  lastMessage: { body: string; senderRole: UserRole; createdAt: string } | null;
  unreadCount: number;
}

export interface ConversationThread extends ConversationSummary {
  messages: Message[];
  interviewProposals: InterviewProposal[];
}

// --- talent discovery (opt-in) ---

// A resume/CV surfaced to companies is just the most recently uploaded
// document of that kind from the applicant's own profile documents — there's
// no separate upload path, so this is always a subset of what the applicant
// already controls in Profile > Documents.
export interface TalentProfile {
  id: string;
  name: string;
  summary: string;
  primaryEducation: { level: EducationLevel; institution: string; field: FieldOfStudy } | null;
  skills: string[];
  interests: string[];
  preferredLocations: CountryCode[];
  workArrangementPreference: WorkArrangementPreference[];
  portfolioUrl: string;
  resume: DocumentFile | null;
  shortlisted: boolean;
}

// --- saved searches ---
// A named filter watched for newly posted listings — matched against every
// new listing at creation time (see routes/company.ts), not by a polling
// job. The filter shape is a subset of Browse's own client-side filters:
// only the structural fields a listing can be checked against without an
// applicant profile (eligibility/match still need one, so those stay out).

export interface SavedSearchFilters {
  query: string;
  workArrangements: WorkArrangement[];
  durations: InternshipLength[];
  fieldOfStudy: FieldOfStudy | "";
  country: CountryCode | "";
}

export interface SavedSearch {
  id: string;
  applicantId: string;
  name: string;
  filters: SavedSearchFilters;
  createdAt: string;
}

// --- notifications ---
// A lightweight, in-app-only notification feed — no email/push. Covers
// events neither side would otherwise see without polling a list page:
// a status change on an application (applicant-facing), a new application
// received or an interview proposed/responded to (either side).

export type NotificationType =
  | "status_change"
  | "new_application"
  | "saved_search_match"
  | "interview_proposed"
  | "interview_responded";

export interface Notification {
  id: string;
  userId: string;
  role: UserRole;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  createdAt: string;
  readAt: string | null;
}

// --- interview scheduling ---
// Proposals live inside a conversation's timeline (interleaved with
// messages in the UI) rather than as a separate calendar system — either
// side can propose a time, and only the other side can accept/decline.

export type InterviewProposalStatus = "pending" | "accepted" | "declined" | "cancelled";

export interface InterviewProposal {
  id: string;
  conversationId: string;
  proposedBy: UserRole;
  scheduledAt: string; // ISO datetime
  durationMinutes: number;
  location: string;
  note: string;
  status: InterviewProposalStatus;
  createdAt: string;
  respondedAt: string | null;
}

// An accepted proposal, surfaced across every conversation at once instead
// of only inside the one thread it lives in — see GET /messages/interviews/upcoming.
export interface UpcomingInterview extends InterviewProposal {
  otherPartyName: string;
}

// --- browser extension autofill ---
// A flattened, human-readable view of the profile, shaped for dropping
// straight into a third-party application form's text fields — not the
// full Applicant record (nested entries, raw country codes, etc.). File
// uploads (resume) can't be autofilled this way — browsers block scripts
// from setting a file input's value for the user, by design.

export interface AutofillProfile {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  linkedinOrPortfolio: string;
  citizenship: string;
  residenceCountry: string;
  university: string;
  educationLevel: string;
  fieldOfStudy: string;
  graduationYear: string;
  currentOrLatestJobTitle: string;
  currentOrLatestEmployer: string;
  skills: string;
  summary: string;
  availableFrom: string;
  // Only present when the applicant both filled these in AND separately
  // consented to their use in autofill (see VoluntaryDisclosures below) —
  // absent, not empty-string, when consent wasn't given, so the extension's
  // "no value to fill" and "not allowed to use this value" cases behave the
  // same way (leave the field for the applicant, or auto-decline on their
  // behalf where the form offers that option).
  genderIdentity?: string;
  raceEthnicity?: string;
  veteranStatus?: string;
  disabilityStatus?: string;
}

// --- voluntary self-identification (EEO-style questions) ---
// Some application forms — almost always US-headquartered companies using
// Greenhouse/Workday/Lever — ask voluntary demographic questions (gender
// identity, race/ethnicity, veteran status, disability status) for their own
// equal-opportunity reporting. Several of these categories are GDPR "special
// category" data (Article 9: racial/ethnic origin, health/disability), so
// this is modeled as its own explicitly opt-in record, never bundled into
// the main Applicant profile or required to use the rest of the app.
//
// Two independent layers of consent, not one:
//   1. Filling this out at all (every field can simply be left "").
//   2. consentToAutofill — separately agreeing this data may be handed to
//      the browser extension to answer these questions on external forms.
// Filling the fields in without consentToAutofill keeps the data in
// InternEZ only; it's never included in an AutofillProfile.
export interface VoluntaryDisclosures {
  genderIdentity: string;
  raceEthnicity: string;
  veteranStatus: string;
  disabilityStatus: string;
  consentToAutofill: boolean;
}
