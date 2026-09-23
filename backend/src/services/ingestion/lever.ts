// Lever's Postings API is public and unauthenticated by design — anyone
// can build a custom careers site from GET /v0/postings/{site} (Lever's own
// docs: github.com/lever/postings-api). One employer at a time, keyed by
// their site slug (there's no endpoint that lists sites).
import type { IngestedListing } from "./types.js";

interface LeverPosting {
  id: string;
  text: string;
  categories: { location?: string; team?: string };
  country?: string; // ISO 3166-1 alpha-2, when Lever has it
  workplaceType?: "remote" | "hybrid" | "onsite" | "unspecified";
  createdAt: number; // epoch ms
  hostedUrl: string;
  applyUrl: string;
  descriptionPlain?: string;
}

const WORKPLACE_TYPE: Record<string, IngestedListing["workplaceType"]> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
};

export async function fetchLeverPostings(site: string): Promise<IngestedListing[]> {
  const res = await fetch(`https://api.lever.co/v0/postings/${site}?mode=json`);
  if (!res.ok) {
    throw new Error(`Lever site "${site}" returned ${res.status}`);
  }
  const postings = (await res.json()) as LeverPosting[];

  return postings.map((posting) => {
    const location = posting.categories?.location ?? "";
    return {
      externalId: posting.id,
      title: posting.text,
      // Lever separately gives a 2-letter country code — folding it into
      // the same comma-separated string mapLocationToCountry already
      // parses for every other source, rather than special-casing Lever.
      location: posting.country ? [location, posting.country].filter(Boolean).join(", ") : location,
      description: posting.descriptionPlain ?? "",
      applyUrl: posting.applyUrl || posting.hostedUrl,
      department: posting.categories?.team ?? "",
      workplaceType: posting.workplaceType ? WORKPLACE_TYPE[posting.workplaceType] ?? null : null,
      postedAt: posting.createdAt ? new Date(posting.createdAt).toISOString() : null,
    };
  });
}
