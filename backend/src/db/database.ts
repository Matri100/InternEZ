// SQLite is the persistence layer: a single file on disk, no service to run
// or pay for. Nested/array-shaped fields (education, skills, extra
// questions, etc.) are stored as JSON text columns rather than fully
// normalized — this keeps the schema a close mirror of the domain types
// in types/domain.ts, and JSON columns map just as directly onto Postgres
// JSONB if this ever needs to move there.
import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "..", "..", "data");
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

// Overridable so tests can point at an isolated in-memory database instead
// of the real dev data file (set before this module is first imported).
const dbPath = process.env.INTERNEZ_DB_PATH ?? join(dataDir, "internez.sqlite");
export const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('applicant', 'company')),
    created_at TEXT NOT NULL
  );

  -- applicants/companies are not FK'd to users: every real account has a
  -- matching row (same id, created together at signup), but seeded company
  -- profiles exist without login access, so the relationship isn't enforced.
  CREATE TABLE IF NOT EXISTS applicants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    portfolio_url TEXT NOT NULL DEFAULT '',
    citizenship TEXT,
    second_citizenship TEXT,
    place_of_birth TEXT,
    residence TEXT,
    available_from TEXT NOT NULL DEFAULT '',
    preferred_length TEXT,
    work_arrangement_preference TEXT NOT NULL DEFAULT '[]',
    preferred_locations TEXT NOT NULL DEFAULT '[]',
    languages TEXT NOT NULL DEFAULT '[]',
    skills TEXT NOT NULL DEFAULT '[]',
    interests TEXT NOT NULL DEFAULT '[]',
    qualifications TEXT NOT NULL DEFAULT '[]',
    summary TEXT NOT NULL DEFAULT '',
    cover_letter_prompts TEXT NOT NULL DEFAULT '{}',
    profile_complete INTEGER NOT NULL DEFAULT 0,
    discoverable INTEGER NOT NULL DEFAULT 0,
    education TEXT NOT NULL DEFAULT '[]',
    work_experience TEXT NOT NULL DEFAULT '[]',
    projects TEXT NOT NULL DEFAULT '[]',
    certifications TEXT NOT NULL DEFAULT '[]',
    documents TEXT NOT NULL DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    verified INTEGER NOT NULL DEFAULT 0,
    logo_url TEXT,
    description TEXT NOT NULL DEFAULT '',
    website TEXT NOT NULL DEFAULT '',
    headquarters TEXT,
    company_size TEXT
  );

  CREATE TABLE IF NOT EXISTS listings (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    created_at TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    country TEXT,
    origin TEXT NOT NULL DEFAULT 'direct',
    department TEXT NOT NULL DEFAULT '',
    work_arrangement TEXT NOT NULL,
    required_education_level TEXT NOT NULL,
    duration TEXT NOT NULL,
    start_date TEXT NOT NULL DEFAULT 'flexible',
    start_label TEXT NOT NULL DEFAULT '',
    end_label TEXT NOT NULL DEFAULT '',
    compensation TEXT NOT NULL DEFAULT '',
    application_deadline TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    requirements TEXT NOT NULL DEFAULT '[]',
    skills TEXT NOT NULL DEFAULT '[]',
    target_fields TEXT NOT NULL DEFAULT '[]',
    required_languages TEXT NOT NULL DEFAULT '[]',
    industries TEXT NOT NULL DEFAULT '[]',
    preferred_qualifications TEXT NOT NULL DEFAULT '[]',
    eligibility TEXT NOT NULL DEFAULT '{}',
    extra_questions TEXT NOT NULL DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    applicant_id TEXT NOT NULL REFERENCES applicants(id),
    listing_id TEXT NOT NULL REFERENCES listings(id),
    submitted_at TEXT NOT NULL,
    overridden INTEGER NOT NULL DEFAULT 0,
    extra_answers TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'applied'
  );

  CREATE TABLE IF NOT EXISTS saved_listings (
    applicant_id TEXT NOT NULL REFERENCES applicants(id),
    listing_id TEXT NOT NULL REFERENCES listings(id),
    PRIMARY KEY (applicant_id, listing_id)
  );

  -- Company-side mirror of saved_listings — a company "shortlisting" an
  -- applicant they found via talent search, for later, without messaging
  -- or poking them yet.
  CREATE TABLE IF NOT EXISTS shortlisted_candidates (
    company_id TEXT NOT NULL REFERENCES companies(id),
    applicant_id TEXT NOT NULL REFERENCES applicants(id),
    created_at TEXT NOT NULL,
    PRIMARY KEY (company_id, applicant_id)
  );

  -- A named filter an applicant wants to keep watching. filters is a JSON
  -- blob mirroring Browse's own filter state — new listings are checked
  -- against every saved search at creation time (see company.ts) and
  -- produce a notification on a match, rather than a polling job.
  CREATE TABLE IF NOT EXISTS saved_searches (
    id TEXT PRIMARY KEY,
    applicant_id TEXT NOT NULL REFERENCES applicants(id),
    name TEXT NOT NULL,
    filters TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
  );

  -- Authenticates the companion browser extension. It can't use the normal
  -- session cookie — it runs in the context of whatever external site the
  -- applicant is applying on, not internez's own origin — so it holds this
  -- long-lived token instead, pasted in once from the Profile page.
  CREATE TABLE IF NOT EXISTS extension_tokens (
    token TEXT PRIMARY KEY,
    applicant_id TEXT NOT NULL REFERENCES applicants(id),
    created_at TEXT NOT NULL
  );

  -- Voluntary, GDPR Article-9-sensitive self-identification answers (gender
  -- identity, race/ethnicity, veteran status, disability status) — kept in
  -- its own table, never joined into the main applicants row, so it's never
  -- accidentally pulled in by a query that just wants the regular profile.
  -- consent_autofill gates whether this data is ever handed to the browser
  -- extension; filling the fields in does not by itself imply that consent.
  CREATE TABLE IF NOT EXISTS voluntary_disclosures (
    applicant_id TEXT PRIMARY KEY REFERENCES applicants(id),
    gender_identity TEXT NOT NULL DEFAULT '',
    race_ethnicity TEXT NOT NULL DEFAULT '',
    veteran_status TEXT NOT NULL DEFAULT '',
    disability_status TEXT NOT NULL DEFAULT '',
    consent_autofill INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reuse_answers (
    applicant_id TEXT NOT NULL REFERENCES applicants(id),
    key TEXT NOT NULL,
    answer TEXT NOT NULL,
    PRIMARY KEY (applicant_id, key)
  );

  -- express-session storage, so logins survive a server restart instead of
  -- resetting along with everything else an in-memory store would lose.
  CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );

  -- One thread per (applicant, company) pair. A "poke" is just a
  -- conversation started with a canned opening message, so it reuses this
  -- same model instead of a separate notification system.
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    applicant_id TEXT NOT NULL REFERENCES applicants(id),
    company_id TEXT NOT NULL REFERENCES companies(id),
    created_at TEXT NOT NULL,
    last_message_at TEXT NOT NULL,
    UNIQUE (applicant_id, company_id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id),
    sender_role TEXT NOT NULL CHECK (sender_role IN ('applicant', 'company')),
    body TEXT NOT NULL,
    created_at TEXT NOT NULL,
    read_at TEXT
  );

  -- In-app only — no email/push behind this. userId + role together identify
  -- the recipient the same way conversations key on applicant_id/company_id.
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('applicant', 'company')),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    link TEXT,
    created_at TEXT NOT NULL,
    read_at TEXT
  );

  -- One proposal at a time lives inline in a conversation's timeline —
  -- either party can propose, only the other party can accept/decline.
  CREATE TABLE IF NOT EXISTS interview_proposals (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id),
    proposed_by TEXT NOT NULL CHECK (proposed_by IN ('applicant', 'company')),
    scheduled_at TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    location TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
    created_at TEXT NOT NULL,
    responded_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_listings_company ON listings(company_id);
  CREATE INDEX IF NOT EXISTS idx_applications_applicant ON applications(applicant_id);
  CREATE INDEX IF NOT EXISTS idx_applications_listing ON applications(listing_id);
  CREATE INDEX IF NOT EXISTS idx_conversations_applicant ON conversations(applicant_id);
  CREATE INDEX IF NOT EXISTS idx_conversations_company ON conversations(company_id);
  CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, role);
  CREATE INDEX IF NOT EXISTS idx_interviews_conversation ON interview_proposals(conversation_id);
  CREATE INDEX IF NOT EXISTS idx_shortlist_company ON shortlisted_candidates(company_id);
  CREATE INDEX IF NOT EXISTS idx_saved_searches_applicant ON saved_searches(applicant_id);
  CREATE INDEX IF NOT EXISTS idx_extension_tokens_applicant ON extension_tokens(applicant_id);
`);

// CREATE TABLE IF NOT EXISTS only applies to brand-new tables, so a column
// added after a database file already exists needs its own migration step.
const applicationColumns = sqlite.prepare(`PRAGMA table_info(applications)`).all() as { name: string }[];
if (!applicationColumns.some((c) => c.name === "status")) {
  sqlite.exec(`ALTER TABLE applications ADD COLUMN status TEXT NOT NULL DEFAULT 'applied'`);
}

const applicantColumns = sqlite.prepare(`PRAGMA table_info(applicants)`).all() as { name: string }[];
if (!applicantColumns.some((c) => c.name === "discoverable")) {
  sqlite.exec(`ALTER TABLE applicants ADD COLUMN discoverable INTEGER NOT NULL DEFAULT 0`);
}
if (!applicantColumns.some((c) => c.name === "second_citizenship")) {
  sqlite.exec(`ALTER TABLE applicants ADD COLUMN second_citizenship TEXT`);
}
if (!applicantColumns.some((c) => c.name === "cover_letter_prompts")) {
  sqlite.exec(`ALTER TABLE applicants ADD COLUMN cover_letter_prompts TEXT NOT NULL DEFAULT '{}'`);
}
