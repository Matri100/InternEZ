import type { ApplicationStatus } from "../types/domain";

// What a company can set via the status dropdown — "withdrawn" is excluded
// since only the applicant can produce or reverse that state, and
// "appliedExternally" is excluded because it's assigned automatically at
// submission time (see backend/src/models/store.ts createApplication) —
// there's no company-side pipeline for a non-direct listing to move it
// through.
export const COMPANY_SETTABLE_STATUSES: ApplicationStatus[] = [
  "applied",
  "reviewing",
  "interview",
  "offer",
  "rejected",
];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied: "Applied",
  appliedExternally: "Applied — 3rd party",
  reviewing: "Under review",
  interview: "Interview",
  offer: "Offer",
  rejected: "Not selected",
  withdrawn: "Withdrawn",
};
