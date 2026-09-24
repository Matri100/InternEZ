// Turns one Active Jobs DB record into the company + listing rows this app
// stores. Pure (no I/O), so it's tested directly against real captured
// records (normalize.test.ts).
import { EDUCATION_LEVEL_RANK, INTERESTS, SKILLS } from "../../data/reference.js";
import { detectListingLanguage } from "../language.js";
import { isInternshipTitle } from "./filter.js";
import { mapLocationToCountry } from "./mapCountry.js";
import { cleanInline, stripHtml } from "./stripHtml.js";
import type { ActiveJobsDbJob } from "./activeJobsDb.js";
import type { Company, CountryCode, EducationLevel, Listing, WorkArrangement } from "../../types/domain.js";

// How long a listing stays visible when the source gives no
// date_valid_through (most don't). Internship postings typically close
// within a month or two; a job still open past this gets re-ingested on
// the next sync that sees it re-posted.
const DEFAULT_LIFETIME_DAYS = 45;
const MAX_SKILLS = 10;

// Hosts that belong to the ATS, not the employer — a record whose domain
// or URL points here says nothing about who the company is.
const ATS_HOSTS = [
  "smartrecruiters.com", "myworkdayjobs.com", "workday.com", "oraclecloud.com", "personio.de",
  "personio.com", "greenhouse.io", "lever.co", "join.com", "successfactors.com", "successfactors.eu",
  "teamtailor.com", "recruitee.com", "workable.com", "bamboohr.com", "icims.com", "taleo.net",
  "jobvite.com", "ashbyhq.com", "breezy.hr",
];

export interface NormalizedJob {
  listingId: string;
  companyId: string;
  company: Omit<Company, "id">;
  listing: Omit<Listing, "id" | "companyId" | "createdAt">;
  expiresAt: string;
}

export type SkipReason = "notInternship" | "wrongCountry" | "noEmployer";

const SKILL_BY_LOWER = new Map(SKILLS.map((s) => [s.toLowerCase(), s]));
const INTEREST_BY_LOWER = new Map(INTERESTS.map((i) => [i.toLowerCase(), i]));

function isAtsHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return ATS_HOSTS.some((ats) => host === ats || host.endsWith(`.${ats}`));
}

function employerDomain(job: ActiveJobsDbJob): string | null {
  const domain = job.domain_derived?.trim().toLowerCase();
  return domain && !isAtsHost(domain) ? domain : null;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Google's favicon service — free, no account or key. Only a fallback: the
// feed's own organization_logo (taken from the employer's career site) is
// used whenever it's present.
function faviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

function toWorkArrangement(value: string | null): WorkArrangement {
  if (value && /hybrid/i.test(value)) return "Hybrid";
  if (value && /remote/i.test(value)) return "Remote";
  return "On-site";
}

// ai_education is free text like ["bachelor degree"] or ["high school"].
// Patterns are ordered lowest level first, and the lowest level mentioned
// is the minimum requirement. With nothing stated, "Bachelor" is the
// common-case default for an internship, not a detected fact.
const EDUCATION_PATTERNS: [RegExp, EducationLevel][] = [
  [/high school|secondary/i, "High School"],
  [/vocational|apprentice/i, "Vocational / Professional"],
  [/associate/i, "Associate Degree"],
  [/bachelor|undergraduate|university|college/i, "Bachelor"],
  [/master|mba|graduate/i, "Master"],
  [/phd|doctor/i, "PhD"],
];

function toEducationLevel(values: string[] | null): EducationLevel {
  const levels = (values ?? [])
    .map((v) => EDUCATION_PATTERNS.find(([pattern]) => pattern.test(v))?.[1])
    .filter((l): l is EducationLevel => Boolean(l));
  if (levels.length === 0) return "Bachelor";
  return levels.reduce((min, l) => (EDUCATION_LEVEL_RANK[l] < EDUCATION_LEVEL_RANK[min] ? l : min));
}

const SALARY_UNITS: Record<string, string> = { HOUR: "hour", DAY: "day", WEEK: "week", MONTH: "month", YEAR: "year" };

function toCompensation(job: ActiveJobsDbJob): string {
  const unit = job.ai_salary_unit_text ? SALARY_UNITS[job.ai_salary_unit_text.toUpperCase()] : undefined;
  if (!job.ai_salary_currency || !unit) return "";
  const fmt = (n: number) => n.toLocaleString("en-US");
  const { ai_salary_value: value, ai_salary_min_value: min, ai_salary_max_value: max } = job;
  let amount: string;
  if (value != null) amount = fmt(value);
  else if (min != null && max != null) amount = `${fmt(min)}–${fmt(max)}`;
  else if (min != null) amount = `from ${fmt(min)}`;
  else if (max != null) amount = `up to ${fmt(max)}`;
  else return "";
  return `${amount} ${job.ai_salary_currency} / ${unit}`;
}

// ai_key_skills is the feed's own extraction from the posting text. Mapped
// onto this app's skill vocabulary where the name matches (so matching
// against applicants' skills actually lines up), kept verbatim otherwise.
function toSkills(values: string[] | null): string[] {
  const skills: string[] = [];
  const seen = new Set<string>();
  for (const raw of values ?? []) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const skill = SKILL_BY_LOWER.get(trimmed.toLowerCase()) ?? trimmed;
    if (seen.has(skill.toLowerCase())) continue;
    seen.add(skill.toLowerCase());
    skills.push(skill);
    if (skills.length === MAX_SKILLS) break;
  }
  return skills;
}

// Only exact matches against the app's interest list — industries feed the
// match score's career-interest factor, which compares against that list.
function toIndustries(values: string[] | null): string[] {
  const matches = (values ?? []).map((v) => INTEREST_BY_LOWER.get(v.trim().toLowerCase()));
  return [...new Set(matches.filter((m): m is string => Boolean(m)))];
}

function validDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function normalizeActiveJob(
  job: ActiveJobsDbJob,
  country: CountryCode,
  now: Date = new Date()
): NormalizedJob | { skipped: SkipReason } {
  const title = cleanInline(job.title);
  const isInternship = isInternshipTitle(title) || (job.ai_employment_type ?? []).includes("INTERN");
  if (!isInternship) return { skipped: "notInternship" };

  // The API's location filter is a text search, so a multi-city posting can
  // match one country while listing another first — pick the location
  // that's actually in the country being synced.
  const location = (job.locations_derived ?? []).map(cleanInline).find((l) => mapLocationToCountry(l) === country);
  if (!location) return { skipped: "wrongCountry" };

  const organization = job.organization ? cleanInline(job.organization) : "";
  if (!organization) return { skipped: "noEmployer" };

  const domain = employerDomain(job);
  const description = stripHtml(job.description_html ?? "");
  const validThrough = validDate(job.date_valid_through);
  const posted = validDate(job.date_posted) ?? now;
  const expiresAt = validThrough ?? new Date(posted.getTime() + DEFAULT_LIFETIME_DAYS * 24 * 60 * 60 * 1000);

  return {
    listingId: `ajdb:${job.id}`,
    companyId: `ajdb:${domain ?? slugify(organization)}`,
    company: {
      name: organization,
      verified: false, // sourced companies never self-declared anything — see ListingOrigin
      logoUrl: job.organization_logo ?? (domain ? faviconUrl(domain) : null),
      description: "",
      website: domain ? `https://${domain}` : "",
      headquarters: null,
      companySize: null,
    },
    listing: {
      title,
      location,
      country,
      origin: "sourced",
      department: "",
      workArrangement: toWorkArrangement(job.ai_work_arrangement),
      requiredEducationLevel: toEducationLevel(job.ai_education),
      // The feed has no structured start date or length. "Flexible" is what
      // the type and the match score need; startLabel stays empty so the UI
      // says "Not specified" instead of claiming the start is flexible.
      duration: "Flexible",
      startDate: "flexible",
      startLabel: "",
      endLabel: "",
      compensation: toCompensation(job),
      applicationDeadline: validThrough ? validThrough.toISOString().slice(0, 10) : "",
      description,
      language: detectListingLanguage(title, description),
      applyUrl: job.url,
      requirements: [],
      skills: toSkills(job.ai_key_skills),
      targetFields: [],
      requiredLanguages: [],
      industries: toIndustries(job.ai_taxonomies_a),
      preferredQualifications: [],
      eligibility: {},
      extraQuestions: [],
    },
    expiresAt: expiresAt.toISOString(),
  };
}
