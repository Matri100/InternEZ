import type {
  Applicant,
  Application,
  ApplicationStatus,
  ApplicationWithApplicant,
  ApplicationWithListing,
  AuthUser,
  Company,
  CompanyAnalytics,
  ConversationSummary,
  ConversationThread,
  InterviewProposal,
  InterviewProposalStatus,
  Listing,
  ListingWithComputed,
  Message,
  Notification,
  ReferenceData,
  SavedSearch,
  SavedSearchFilters,
  TalentProfile,
  UpcomingInterview,
  UserRole,
  VoluntaryDisclosures,
} from "../types/domain";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...init,
  });
  // A session that's missing or expired self-heals by bouncing to the
  // login page, rather than leaving whatever page made the request stuck.
  // /auth/* routes report their own failures (e.g. wrong password) inline
  // instead, so they're excluded here.
  if (res.status === 401 && !path.startsWith("/auth/")) {
    window.location.href = "/login";
    return new Promise<T>(() => {});
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type ListingInput = Omit<Listing, "id" | "companyId" | "createdAt">;

export const api = {
  me: () => request<AuthUser | null>("/auth/me"),
  login: (input: { email: string; password: string }) =>
    request<AuthUser>("/auth/login", { method: "POST", body: JSON.stringify(input) }),
  signup: (input: { email: string; password: string; role: UserRole; name: string }) =>
    request<AuthUser>("/auth/signup", { method: "POST", body: JSON.stringify(input) }),
  logout: () => request<void>("/auth/logout", { method: "POST" }),

  getReference: () => request<ReferenceData>("/reference"),
  getUniversities: (country: string) =>
    request<{ universities: string[] }>(`/reference/universities/${country}`).then((r) => r.universities),

  getProfile: () => request<Applicant>("/profile"),
  saveProfile: (profile: Omit<Applicant, "id">) =>
    request<Applicant>("/profile", { method: "PUT", body: JSON.stringify(profile) }),
  deleteAccount: () => request<void>("/profile/account", { method: "DELETE" }),

  getExtensionStatus: () => request<{ connected: boolean }>("/profile/extension-token"),
  createExtensionToken: () => request<{ token: string }>("/profile/extension-token", { method: "POST" }),
  revokeExtensionToken: () => request<void>("/profile/extension-token", { method: "DELETE" }),

  getVoluntaryDisclosures: () => request<VoluntaryDisclosures>("/profile/voluntary-disclosures"),
  saveVoluntaryDisclosures: (input: VoluntaryDisclosures) =>
    request<VoluntaryDisclosures>("/profile/voluntary-disclosures", { method: "PUT", body: JSON.stringify(input) }),

  getListings: () => request<ListingWithComputed[]>("/listings"),
  getListing: (id: string) => request<ListingWithComputed>(`/listings/${id}`),
  getReusedAnswers: (id: string) =>
    request<{ answers: Record<string, string> }>(`/listings/${id}/reused-answers`).then((r) => r.answers),

  getSavedListings: () => request<ListingWithComputed[]>("/listings/saved"),
  saveListing: (id: string) => request<{ saved: boolean }>(`/listings/${id}/save`, { method: "POST" }),
  unsaveListing: (id: string) => request<{ saved: boolean }>(`/listings/${id}/save`, { method: "DELETE" }),

  getSavedSearches: () => request<SavedSearch[]>("/listings/saved-searches"),
  createSavedSearch: (name: string, filters: SavedSearchFilters) =>
    request<SavedSearch>("/listings/saved-searches", { method: "POST", body: JSON.stringify({ name, filters }) }),
  deleteSavedSearch: (id: string) => request<void>(`/listings/saved-searches/${id}`, { method: "DELETE" }),

  getApplications: () => request<ApplicationWithListing[]>("/applications"),
  submitApplication: (input: { listingId: string; overridden: boolean; answers: { key: string; answer: string }[] }) =>
    request<Application>("/applications", { method: "POST", body: JSON.stringify(input) }),
  withdrawApplication: (id: string) => request<Application>(`/applications/${id}/withdraw`, { method: "POST" }),

  // --- Company mode ---
  getCompany: () => request<Company>("/company"),
  saveCompany: (company: Omit<Company, "id" | "verified">) =>
    request<Company>("/company", { method: "PUT", body: JSON.stringify(company) }),
  deleteCompanyAccount: () => request<void>("/company/account", { method: "DELETE" }),

  getCompanyListings: () => request<Listing[]>("/company/listings"),
  getCompanyListing: (id: string) => request<Listing>(`/company/listings/${id}`),
  createListing: (input: ListingInput) =>
    request<Listing>("/company/listings", { method: "POST", body: JSON.stringify(input) }),
  updateListing: (id: string, input: ListingInput) =>
    request<Listing>(`/company/listings/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  deleteListing: (id: string) => request<void>(`/company/listings/${id}`, { method: "DELETE" }),

  getCompanyApplications: () => request<ApplicationWithApplicant[]>("/company/applications"),
  updateApplicationStatus: (id: string, status: ApplicationStatus) =>
    request<Application>(`/company/applications/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),

  getTalent: () => request<TalentProfile[]>("/company/talent"),
  pokeTalent: (applicantId: string) =>
    request<ConversationSummary>(`/company/talent/${applicantId}/poke`, { method: "POST" }),
  shortlistTalent: (applicantId: string) =>
    request<{ shortlisted: boolean }>(`/company/talent/${applicantId}/shortlist`, { method: "POST" }),
  unshortlistTalent: (applicantId: string) =>
    request<{ shortlisted: boolean }>(`/company/talent/${applicantId}/shortlist`, { method: "DELETE" }),

  getCompanyAnalytics: () => request<CompanyAnalytics>("/company/analytics"),

  // --- Messaging (shared by both roles) ---
  getConversations: () => request<ConversationSummary[]>("/messages/conversations"),
  startConversation: (otherPartyId: string) =>
    request<ConversationSummary>("/messages/conversations", { method: "POST", body: JSON.stringify({ otherPartyId }) }),
  getConversationThread: (id: string) => request<ConversationThread>(`/messages/conversations/${id}/messages`),
  sendMessage: (conversationId: string, body: string) =>
    request<Message>(`/messages/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),

  proposeInterview: (
    conversationId: string,
    input: { scheduledAt: string; durationMinutes: number; location: string; note: string }
  ) =>
    request<InterviewProposal>(`/messages/conversations/${conversationId}/interviews`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  respondToInterview: (conversationId: string, proposalId: string, response: InterviewProposalStatus) =>
    request<InterviewProposal>(`/messages/conversations/${conversationId}/interviews/${proposalId}/respond`, {
      method: "POST",
      body: JSON.stringify({ response }),
    }),
  getUpcomingInterviews: () => request<UpcomingInterview[]>("/messages/interviews/upcoming"),

  // --- Notifications (shared by both roles) ---
  getNotifications: () => request<Notification[]>("/notifications"),
  getUnreadNotificationCount: () => request<{ count: number }>("/notifications/unread-count").then((r) => r.count),
  markAllNotificationsRead: () => request<void>("/notifications/mark-read", { method: "POST" }),
  markNotificationRead: (id: string) => request<void>(`/notifications/${id}/mark-read`, { method: "POST" }),
};
