// Orchestrates one sync run across every configured SourcedEmployer:
// fetch -> filter to internship-shaped titles -> resolve to an EU/EEA
// country -> upsert. Per-employer errors (a dead board token, a network
// blip) are caught and reported rather than aborting the whole run, since
// one bad source shouldn't block every other employer's listings from
// updating.
import { db } from "../../models/store.js";
import { detectListingLanguage } from "../language.js";
import { fetchGreenhouseJobs } from "./greenhouse.js";
import { fetchLeverPostings } from "./lever.js";
import { isInternshipTitle } from "./filter.js";
import { mapLocationToCountry } from "./mapCountry.js";
import type { IngestedListing, SourcedEmployer } from "./types.js";
import type { Listing } from "../../types/domain.js";

export interface EmployerSyncResult {
  employer: string;
  fetched: number;
  internshipShaped: number;
  saved: number;
  skippedNonEuLocation: number;
  error?: string;
}

async function fetchFor(employer: SourcedEmployer): Promise<IngestedListing[]> {
  if (employer.ats === "greenhouse") return fetchGreenhouseJobs(employer.token);
  return fetchLeverPostings(employer.token);
}

function toListingInput(
  ingested: IngestedListing,
  country: NonNullable<ReturnType<typeof mapLocationToCountry>>
): Omit<Listing, "id" | "companyId" | "createdAt"> {
  return {
    title: ingested.title,
    location: ingested.location,
    country,
    origin: "sourced",
    department: ingested.department,
    // No reliable remote/hybrid/onsite signal from every source (e.g.
    // Greenhouse) — "On-site" is the neutral default when the source gave
    // no workplaceType and the location text didn't say "remote" either.
    workArrangement: ingested.workplaceType ?? "On-site",
    // Neither ATS reliably states a required degree level for an
    // internship listing — "Bachelor" is the common-case default, not a
    // detected fact.
    requiredEducationLevel: "Bachelor",
    duration: "Flexible",
    startDate: "flexible",
    startLabel: "Flexible",
    endLabel: "",
    compensation: "",
    applicationDeadline: "",
    description: ingested.description,
    language: detectListingLanguage(ingested.title, ingested.description),
    applyUrl: ingested.applyUrl,
    // Structured fields (skills, target fields, required languages,
    // industries, eligibility, extra questions) aren't guessed from free
    // text — left empty/neutral rather than fabricated. Matching still
    // works for a sourced listing, just with those factors scoring
    // neutral instead of a real signal either way.
    requirements: [],
    skills: [],
    targetFields: [],
    requiredLanguages: [],
    industries: [],
    preferredQualifications: [],
    eligibility: {},
    extraQuestions: [],
  };
}

export async function syncEmployer(employer: SourcedEmployer): Promise<EmployerSyncResult> {
  const result: EmployerSyncResult = {
    employer: employer.name,
    fetched: 0,
    internshipShaped: 0,
    saved: 0,
    skippedNonEuLocation: 0,
  };

  let ingested: IngestedListing[];
  try {
    ingested = await fetchFor(employer);
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
    return result;
  }
  result.fetched = ingested.length;

  const internships = ingested.filter((job) => isInternshipTitle(job.title));
  result.internshipShaped = internships.length;
  if (internships.length === 0) return result;

  await db.saveCompany(employer.key, {
    name: employer.name,
    verified: false, // sourced companies never self-declared this — see ListingOrigin
    logoUrl: null,
    description: "",
    website: employer.website,
    headquarters: null,
    companySize: null,
  });

  for (const job of internships) {
    const country = mapLocationToCountry(job.location);
    if (!country) {
      result.skippedNonEuLocation++;
      continue;
    }
    const listingId = `${employer.key}:${job.externalId}`;
    await db.upsertSourcedListing(listingId, employer.key, toListingInput(job, country));
    result.saved++;
  }

  return result;
}

export async function syncAll(employers: SourcedEmployer[]): Promise<EmployerSyncResult[]> {
  const results: EmployerSyncResult[] = [];
  for (const employer of employers) {
    results.push(await syncEmployer(employer));
  }
  return results;
}
