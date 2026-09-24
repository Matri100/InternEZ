// Client for Fantastic.jobs' "Active Jobs DB" on RapidAPI — jobs indexed
// hourly from 200k+ employers' own career sites across ~55 ATSs
// (Greenhouse, Lever, Personio, Workday, SmartRecruiters, ...), no job
// boards or LinkedIn. Billing is per job *returned*, so every filter that
// can be applied server-side (title, location, time window, limit) is.
// Docs: https://rapidapi.com/fantastic-jobs-fantastic-jobs-default/api/active-jobs-db

const BASE_URL = "https://active-jobs-db.p.rapidapi.com";
const HOST = "active-jobs-db.p.rapidapi.com";
const MAX_PER_REQUEST = 1000; // the API's own per-call ceiling

// Google-style title search, one term list for every country (a French
// title can still say "Intern"). Same vocabulary as filter.ts, which
// re-checks each result because the API's full-text search stems words.
export const INTERNSHIP_TITLE_QUERY = [
  "intern", "internship", "trainee", '"working student"', "werkstudent", "praktikum", "praktikant",
  "stagiaire", "stage", "stagiair", "stagista", "tirocinio", "prácticas", "practicas", "becario",
  "praktyka", "praktykant", "stażysta", "staż",
].join(" OR ");

// Only the fields this app reads. The org_linkedin_* enrichment the API
// can also return is deliberately not used: checked against real records,
// it's sometimes matched to the wrong company entirely (a Pandora Italy
// listing came back enriched with a Florida franchisee's LinkedIn page).
export interface ActiveJobsDbJob {
  id: number;
  title: string;
  organization: string | null;
  organization_url: string | null;
  organization_logo: string | null;
  domain_derived: string | null;
  url: string;
  date_posted: string;
  date_valid_through: string | null;
  locations_derived: string[] | null;
  description_html: string | null;
  ai_employment_type: string[] | null;
  ai_work_arrangement: string | null;
  ai_education: string[] | null;
  ai_key_skills: string[] | null;
  ai_taxonomies_a: string[] | null;
  ai_salary_currency: string | null;
  ai_salary_value: number | null;
  ai_salary_min_value: number | null;
  ai_salary_max_value: number | null;
  ai_salary_unit_text: string | null;
}

export async function fetchActiveJobsDb(options: {
  apiKey: string;
  countryName: string; // full English name — the API matches location text, not ISO codes
  timeFrame: "24h" | "7d";
  limit: number;
}): Promise<ActiveJobsDbJob[]> {
  const jobs: ActiveJobsDbJob[] = [];
  let offset = 0;

  while (jobs.length < options.limit) {
    const pageSize = Math.min(MAX_PER_REQUEST, options.limit - jobs.length);
    const params = new URLSearchParams({
      time_frame: options.timeFrame,
      limit: String(pageSize),
      offset: String(offset),
      title: INTERNSHIP_TITLE_QUERY,
      location: options.countryName,
      description_format: "html",
    });

    const res = await fetch(`${BASE_URL}/active-ats?${params}`, {
      headers: { "x-rapidapi-host": HOST, "x-rapidapi-key": options.apiKey },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Active Jobs DB returned ${res.status} for ${options.countryName}: ${body.slice(0, 200)}`);
    }

    const page = (await res.json()) as ActiveJobsDbJob[];
    jobs.push(...page);
    if (page.length < pageSize) break; // no more results in this window
    offset += page.length;
  }

  return jobs;
}
