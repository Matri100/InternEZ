// Display rules for listing fields that are often missing. Sourced
// listings (the ingestion feed) rarely state a deadline, start date, pay or
// length, so every place that shows one of these goes through here: a
// label is either hidden (on compact cards) or reads "Not specified" (on
// the detail page), never "Apply by " followed by nothing.
import type { InternshipLength, Listing } from "../types/domain";

// "2026-02-01" -> a Date, for formatting in the interface language. null
// for anything that isn't a plain date.
export function parseIsoDate(isoDate: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function deadlineLabel(
  listing: Pick<Listing, "applicationDeadline">,
  formatDate: (date: Date) => string
): string | null {
  if (!listing.applicationDeadline) return null;
  const date = parseIsoDate(listing.applicationDeadline);
  return date ? formatDate(date) : listing.applicationDeadline;
}

export function startLabel(listing: Pick<Listing, "startLabel">): string | null {
  return listing.startLabel || null;
}

// The feed has no internship length, so the ingestion normalizer fills in
// "Flexible" to satisfy the type — for a sourced listing that means
// "unknown", not a length the employer chose.
export function knownDuration(listing: Pick<Listing, "origin" | "duration">): InternshipLength | null {
  if (listing.origin === "sourced" && listing.duration === "Flexible") return null;
  return listing.duration;
}
