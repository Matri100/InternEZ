// Postgres is the persistence layer. Nested/array-shaped fields (education,
// skills, extra questions, etc.) stay JSON text columns rather than fully
// normalized — this keeps the schema a close mirror of the domain types in
// types/domain.ts. They could become native JSONB with zero data-shape
// change if that's ever worth it; TEXT + JSON.stringify/parse (see
// store.ts) works identically either way, so there's no urgency.
import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is required (e.g. postgres://user:pass@host:5432/dbname). See .env.example."
  );
}

// Hosted Postgres (Neon, Railway, Render, Supabase, ...) requires TLS but
// typically presents a cert not in Node's default trust store — the normal,
// accepted way to connect without managing a custom CA is to skip strict
// cert validation while still encrypting the connection. Local/CI Postgres
// (e.g. a GitHub Actions service container) has no TLS configured at all,
// so DATABASE_SSL=disable turns this off entirely for those.
const useSsl = process.env.DATABASE_SSL !== "disable";

export const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});

// Runs `fn` inside a single transaction on one dedicated client, so a
// mid-cascade failure (e.g. account deletion) can't leave the database
// half-changed. Only needed where multiple statements must succeed or fail
// together — every other store.ts method is a single statement and just
// uses the shared pool directly.
export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

await pool.query(`
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
  -- expires_at is a millisecond epoch timestamp (Date.now() + maxAge) — it
  -- needs BIGINT, not INTEGER: Postgres's INTEGER is a strict 4-byte type
  -- (max ~2.1 billion) that a 13-digit millisecond timestamp overflows,
  -- unlike SQLite's untyped INTEGER affinity, which never enforced a width.
  CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    expires_at BIGINT NOT NULL
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
