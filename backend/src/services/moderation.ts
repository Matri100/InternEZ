// Rules and helpers behind the moderation page (routes/moderation.ts) and
// the report button on a listing.
import { db, type ListingVisibility } from "../models/store.js";
import { adminUserIds } from "./admins.js";
import { sendEmail } from "./email.js";
import type { ReportReason } from "../types/domain.js";

export const REPORT_REASONS: readonly ReportReason[] = ["scam", "discriminatory", "inaccurate", "closed", "other"];

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  scam: "Looks like a scam or fake listing",
  discriminatory: "Discriminatory or offensive",
  inaccurate: "Wrong or misleading information",
  closed: "No longer available",
  other: "Something else",
};

// Whether an applicant may open or apply to a listing: not removed by the
// moderators, and either sourced from an employer's own careers site or
// posted by a company InternEZ has verified. Expiry is separate — an
// expired listing stays viewable for people who saved or applied to it.
export function isOpenToApplicants(visibility: ListingVisibility | null): boolean {
  if (!visibility || visibility.removedAt) return false;
  return visibility.origin === "sourced" || visibility.companyVerified;
}

// Free email providers: a company signing up with one of these isn't
// suspicious by itself (small companies often do), but it's worth a look.
const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "hotmail.co.uk",
  "live.com",
  "msn.com",
  "yahoo.com",
  "yahoo.co.uk",
  "icloud.com",
  "me.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "mail.com",
  "gmx.de",
  "gmx.net",
  "gmx.com",
  "web.de",
  "t-online.de",
  "orange.fr",
  "free.fr",
  "laposte.net",
  "wanadoo.fr",
  "libero.it",
  "virgilio.it",
  "wp.pl",
  "o2.pl",
  "onet.pl",
  "interia.pl",
  "op.pl",
  "seznam.cz",
  "yandex.com",
]);

function emailDomain(email: string): string {
  return email.split("@")[1]?.trim().toLowerCase() ?? "";
}

function websiteHost(website: string): string | null {
  const trimmed = website.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

// Hints for whoever reviews a company, never a decision on their own:
// anyone can register a domain, and a mismatch has innocent explanations.
export function reviewHints(email: string, website: string): { personalEmail: boolean; emailMatchesWebsite: boolean } {
  const domain = emailDomain(email);
  const host = websiteHost(website);
  const emailMatchesWebsite = Boolean(
    domain && host && (host === domain || host.endsWith(`.${domain}`) || domain.endsWith(`.${host}`))
  );
  return { personalEmail: PERSONAL_EMAIL_DOMAINS.has(domain), emailMatchesWebsite };
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const APP_URL = process.env.APP_URL ?? "http://localhost:5173";

// Emails every moderator, in the background: a slow or failing email
// provider must never hold up (or fail) the request that triggered it.
export function notifyModerators(subject: string, paragraphs: string[]): void {
  const html = [...paragraphs.map((p) => `<p>${p}</p>`), `<p><a href="${APP_URL}/admin">Open the moderation page</a></p>`].join(
    "\n"
  );
  // Company names and listing titles end up in the subject line, so no
  // line breaks and a sane length, whatever someone typed.
  const cleanSubject = subject.replace(/\s+/g, " ").trim().slice(0, 200);
  void (async () => {
    const emails = await db.getUserEmails(adminUserIds());
    for (const to of emails) await sendEmail(to, cleanSubject, html);
  })().catch((err) => console.error("[moderation] emailing moderators failed:", err));
}
