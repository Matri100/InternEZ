// Display rules for listing fields that are often missing. Sourced
// listings (the ingestion feed) rarely state a deadline, start date, pay or
// length, so every place that shows one of these goes through here: a
// label is either hidden (on compact cards) or reads "Not specified" (on
// the detail page), never "Apply by " followed by nothing.
import type { Listing } from "../types/domain";

export const NOT_SPECIFIED = "Not specified";

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

// "2026-02-01" -> "1 Feb 2026". Anything that isn't a plain date is shown
// as stored rather than dropped.
export function formatDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? isoDate : DATE_FORMAT.format(date);
}

export function deadlineLabel(listing: Pick<Listing, "applicationDeadline">): string | null {
  return listing.applicationDeadline ? formatDate(listing.applicationDeadline) : null;
}

export function startLabel(listing: Pick<Listing, "startLabel">): string | null {
  return listing.startLabel || null;
}

// The feed has no internship length, so the ingestion normalizer fills in
// "Flexible" to satisfy the type — for a sourced listing that means
// "unknown", not a length the employer chose.
export function durationLabel(listing: Pick<Listing, "origin" | "duration">): string | null {
  if (listing.origin === "sourced" && listing.duration === "Flexible") return null;
  return listing.duration;
}
