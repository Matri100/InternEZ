// Tells applicants about a listing that matches one of their saved
// searches, at the moment it becomes visible to them: straight away when a
// verified company posts it, or when the moderators verify the company
// that posted it earlier. Event-driven instead of a polling job — one
// listing checked against every saved search, rather than all listings
// periodically re-scanned against all searches.
import { db } from "../models/store.js";
import { matchesSavedSearch } from "./savedSearch.js";
import type { Company, Listing } from "../types/domain.js";

export async function notifySavedSearchMatches(listing: Listing, company: Company): Promise<void> {
  const savedSearches = await db.listAllSavedSearches();
  for (const search of savedSearches) {
    if (!matchesSavedSearch(listing, company, search.filters)) continue;
    await db.createNotification({
      userId: search.applicantId,
      role: "applicant",
      type: "saved_search_match",
      title: "New listing matches your saved search",
      body: `"${listing.title}" matches your saved search "${search.name}".`,
      params: { listingTitle: listing.title, searchName: search.name },
      link: `/listings/${listing.id}`,
    });
  }
}
