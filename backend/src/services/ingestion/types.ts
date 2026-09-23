// The intermediate shape both source-specific fetchers (greenhouse.ts,
// lever.ts) normalize into, before sync.ts turns it into a real Listing.
// Deliberately thin — fields an ATS doesn't reliably give us (duration,
// required education level, skills, eligibility...) aren't guessed here;
// sync.ts fills them with honest, neutral defaults instead.
export interface IngestedListing {
  externalId: string; // stable per-posting id from the source, for dedupe/upsert
  title: string;
  location: string; // raw source text — mapCountry.ts resolves this to a CountryCode
  description: string; // plain text, HTML already stripped
  applyUrl: string;
  department: string; // "" when the source doesn't say
  workplaceType: "Remote" | "Hybrid" | "On-site" | null; // null = source gave no signal
  postedAt: string | null; // ISO timestamp, when the source provides one
}

// One employer InternEZ ingests from. `key` is a stable id used to derive
// both the auto-provisioned company row's id and every one of its
// listings' ids (see sync.ts) — changing it after the fact orphans the old
// rows rather than updating them in place, so treat it as permanent once
// a source has been synced for real.
export interface SourcedEmployer {
  key: string;
  name: string;
  website: string;
  ats: "greenhouse" | "lever";
  // Greenhouse: the board token from boards.greenhouse.io/{token}.
  // Lever: the site slug from jobs.lever.co/{site}.
  token: string;
}
