// Mirrors backend/src/types/domain.ts

// InternEZ covers the EU/EEA only — see backend/src/types/domain.ts for the
// full rationale (EU 27 + Iceland/Liechtenstein/Norway + Switzerland).
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

export type FieldOfStudy = string;

export type InternshipLength = "3 months" | "6 months" | "12 months" | "Flexible";

export type WorkArrangement = "On-site" | "Hybrid" | "Remote";

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
  startDate: string;
  endDate: string;
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

// Mirrors backend/src/types/domain.ts — a fixed, small set of free-text
// prompts, answered once, that give a future cover-letter/extra-question
// generation feature real source material in the applicant's own words.
// Answering these doesn't generate anything by itself yet.
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
  // Optional dual citizenship — counts on equal footing with the first for
  // eligibility, not just a fallback.
  secondCitizenship: CountryCode | null;
  placeOfBirth: CountryCode | null;
  residence: CountryCode | null;
  education: EducationEntry[];
  workExperience: WorkExperienceEntry[];
  projects: ProjectEntry[];
  certifications: CertificationEntry[];
  documents: DocumentFile[];
  availableFrom: string;
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

// --- voluntary self-identification (GDPR-sensitive, entirely opt-in) ---
// Mirrors backend/src/types/domain.ts — kept out of the Applicant interface
// on purpose, with its own GET/PUT endpoints, so it's never bundled into
// the main profile save or fetched as part of it.
export interface VoluntaryDisclosures {
  genderIdentity: string;
  raceEthnicity: string;
  veteranStatus: string;
  disabilityStatus: string;
  consentToAutofill: boolean;
}

export type CompanySize = "1-10" | "11-50" | "51-200" | "201-1000" | "1000+";

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
  createdAt: string;
  title: string;
  location: string;
  country: CountryCode | null;
  origin: ListingOrigin;
  department: string;
  workArrangement: WorkArrangement;
  requiredEducationLevel: EducationLevel;
  duration: InternshipLength;
  startDate: string;
  startLabel: string;
  endLabel: string;
  compensation: string;
  applicationDeadline: string;
  description: string;
  // Detected server-side from title+description, not editable here — the
  // language the posting itself is written in, distinct from
  // requiredLanguages (a job requirement) below.
  language: string;
  // Where a "sourced" listing's real application form lives — "" for
  // origin "direct", where the in-app apply flow is the real pipeline.
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

// Mirrors backend — the reason as data, worded in the interface language
// by lib/explanations.ts. `why` is the same in English.
export interface EligibilityReason {
  code:
    | "citizenOnlyClearance"
    | "citizenOnlyOk"
    | "citizenOnlyBlocked"
    | "noRestriction"
    | "regionCitizenship"
    | "pathway"
    | "regionBlocked";
  country?: CountryCode;
  via?: "placeOfBirth" | "residence" | "education";
  institution?: string;
}

export interface EligibilityResult {
  level: EligibilityLevel;
  why: string;
  reason: EligibilityReason;
}

export interface MatchFactor {
  key: string;
  label: string;
  points: number;
  max: number;
  neutral: boolean;
}

export interface MatchResult {
  total: number;
  factors: MatchFactor[];
  explanation: string;
  // Factor keys the explanation was built from.
  strengths: string[];
  gaps: string[];
}

export interface ListingWithComputed extends Listing {
  company: Company;
  eligibilityResult: EligibilityResult;
  match: MatchResult;
  saved: boolean;
}

export interface ExtraAnswer {
  key: string;
  prompt: string;
  answer: string;
}

// The company-driven hiring pipeline a submitted application moves through.
// "applied" is the only status an applicant can produce themselves; every
// stage after that is set by the company reviewing it — except "withdrawn",
// which only the applicant can set, and which the company can't override.
// "appliedExternally" is a special case of "applied" for a non-direct
// (sourced) listing — the hiring pipeline lives on the company's own
// system, not InternEZ's, so it's never manually settable; see the fuller
// comment on this type in backend/src/types/domain.ts.
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
  listingTitle: string;
}

export type UserRole = "applicant" | "company";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface RegionDef {
  code: RegionCode;
  name: string;
  countries: { code: CountryCode; name: string }[];
}

export interface FieldGroup {
  category: string;
  fields: FieldOfStudy[];
}

export interface SkillGroup {
  category: string;
  skills: string[];
}

export interface ReferenceData {
  regions: RegionDef[];
  educationLevels: EducationLevel[];
  fieldGroups: FieldGroup[];
  fieldsOfStudy: FieldOfStudy[];
  internshipLengths: InternshipLength[];
  workArrangements: WorkArrangement[];
  workArrangementPreferences: WorkArrangementPreference[];
  languageLevels: LanguageLevel[];
  skillGroups: SkillGroup[];
  skills: string[];
  languages: string[];
  interests: string[];
  qualifications: string[];
  documentKinds: DocumentKind[];
  companySizes: CompanySize[];
  genderIdentityOptions: string[];
  raceEthnicityOptions: string[];
  veteranStatusOptions: string[];
  disabilityStatusOptions: string[];
  // Browse city value -> its name in each interface language that differs
  // from English (backend data/cities.ts).
  cityNames: Record<string, Partial<Record<string, string>>>;
}

// --- messaging ---
// One thread per (applicant, company) pair — a "poke" is just a
// conversation started with a canned opening message.

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

export interface SavedSearchFilters {
  query: string;
  countries: CountryCode[];
  cities: string[];
  languages: string[];
  workArrangements: WorkArrangement[];
  durations: InternshipLength[];
  fieldOfStudy: FieldOfStudy | "";
}

// --- browse search (server-side; see backend services/listingSearch.ts) ---

export type ListingSort = "match" | "newest" | "deadline" | "company";

export interface FacetCount {
  value: string;
  count: number;
}

export interface ListingFacets {
  countries: FacetCount[];
  cities: (FacetCount & { country: CountryCode | null })[];
  languages: FacetCount[];
  workArrangements: FacetCount[];
  durations: FacetCount[];
  fieldsOfStudy: FacetCount[];
  direct: number;
  eligible: number;
}

// A Browse result card — everything but the (long) description.
export type ListingSummary = Omit<ListingWithComputed, "description">;

export interface ListingSearchResult {
  items: ListingSummary[];
  total: number;
  page: number;
  pageSize: number;
  facets: ListingFacets;
}

export interface SavedSearch {
  id: string;
  applicantId: string;
  name: string;
  filters: SavedSearchFilters;
  createdAt: string;
}

// --- notifications ---

export type NotificationType =
  | "status_change"
  | "new_application"
  | "interview_proposed"
  | "interview_responded"
  | "saved_search_match";

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

export type InterviewProposalStatus = "pending" | "accepted" | "declined" | "cancelled";

export interface InterviewProposal {
  id: string;
  conversationId: string;
  proposedBy: UserRole;
  scheduledAt: string;
  durationMinutes: number;
  location: string;
  note: string;
  status: InterviewProposalStatus;
  createdAt: string;
  respondedAt: string | null;
}

export interface UpcomingInterview extends InterviewProposal {
  otherPartyName: string;
}

// --- company analytics ---

export interface CompanyAnalytics {
  totalListings: number;
  totalApplications: number;
  byStatus: Partial<Record<ApplicationStatus, number>>;
  perListing: { listingId: string; title: string; applicationCount: number }[];
  dailyApplications: { day: string; n: number }[];
}
