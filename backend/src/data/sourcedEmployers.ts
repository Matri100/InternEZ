// Employers InternEZ ingests internship listings from (see
// services/ingestion/sync.ts). This list is meant to grow — add an entry,
// run the sync, done. `key` becomes part of every one of that employer's
// listing ids (see sync.ts), so once an employer has been synced for real,
// treat its `key` as permanent — changing it orphans the old rows instead
// of updating them.
//
// Finding a token:
// - Greenhouse: the company's careers page is usually
//   boards.greenhouse.io/{token}, or check the network tab for a request
//   to boards-api.greenhouse.io/v1/boards/{token}/jobs.
// - Lever: the company's careers page is usually jobs.lever.co/{site}.
// Either way, verify it live before adding it here —
// GET https://boards-api.greenhouse.io/v1/boards/{token}/jobs or
// GET https://api.lever.co/v0/postings/{site}?mode=json should return
// real data, not a 404, before it's worth including.
import type { SourcedEmployer } from "../services/ingestion/types.js";

export const SOURCED_EMPLOYERS: SourcedEmployer[] = [
  {
    key: "gh:gitlab",
    name: "GitLab",
    website: "https://about.gitlab.com",
    ats: "greenhouse",
    token: "gitlab",
  },
  {
    key: "gh:n26",
    name: "N26",
    website: "https://n26.com",
    ats: "greenhouse",
    token: "n26",
  },
  {
    key: "gh:wise",
    name: "Wise",
    website: "https://wise.com",
    ats: "greenhouse",
    token: "wise",
  },
  // No Lever employers yet — couldn't find a real EU internship-posting
  // company on Lever to verify live while building this. Add one here
  // once you've confirmed a real token per the instructions above:
  // { key: "lever:example", name: "Example Co", website: "https://example.com", ats: "lever", token: "example" },
];
