// Greenhouse's Job Board API is public and unauthenticated by design —
// "Job Board data is publicly available, so authentication is not required
// for any GET endpoints" (docs.greenhouse.io) — this is exactly the
// intended third-party-reuse case, not scraping. One employer at a time,
// keyed by their board token (there's no endpoint that lists boards).
import { stripHtml } from "./stripHtml.js";
import type { IngestedListing } from "./types.js";

interface GreenhouseJob {
  id: number;
  title: string;
  updated_at: string;
  absolute_url: string;
  location: { name: string };
  content?: string;
  departments?: { name: string }[];
}

interface GreenhouseJobsResponse {
  jobs: GreenhouseJob[];
}

export async function fetchGreenhouseJobs(boardToken: string): Promise<IngestedListing[]> {
  const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs?content=true`);
  if (!res.ok) {
    throw new Error(`Greenhouse board "${boardToken}" returned ${res.status}`);
  }
  const body = (await res.json()) as GreenhouseJobsResponse;

  return body.jobs.map((job) => ({
    externalId: String(job.id),
    title: job.title,
    location: job.location?.name ?? "",
    description: job.content ? stripHtml(job.content) : "",
    applyUrl: job.absolute_url,
    department: job.departments?.[0]?.name ?? "",
    workplaceType: /\bremote\b/i.test(job.location?.name ?? "") ? "Remote" : null,
    postedAt: job.updated_at ?? null,
  }));
}
