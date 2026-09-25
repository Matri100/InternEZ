import { afterEach, describe, expect, it } from "vitest";
import { escapeHtml, isOpenToApplicants, reviewHints } from "./moderation.js";
import { isAdmin } from "./admins.js";

describe("reviewHints", () => {
  it("matches a company email to its website, with or without www or a scheme", () => {
    expect(reviewHints("jobs@acme.eu", "https://www.acme.eu/careers").emailMatchesWebsite).toBe(true);
    expect(reviewHints("jobs@acme.eu", "acme.eu").emailMatchesWebsite).toBe(true);
    expect(reviewHints("hr@de.acme.eu", "acme.eu").emailMatchesWebsite).toBe(true);
    expect(reviewHints("jobs@acme.eu", "careers.acme.eu").emailMatchesWebsite).toBe(true);
  });

  it("doesn't match a different domain, a lookalike, or a missing website", () => {
    expect(reviewHints("jobs@acme.eu", "https://other.eu").emailMatchesWebsite).toBe(false);
    expect(reviewHints("jobs@notacme.eu", "acme.eu").emailMatchesWebsite).toBe(false);
    expect(reviewHints("jobs@acme.eu", "").emailMatchesWebsite).toBe(false);
  });

  it("flags free email providers", () => {
    expect(reviewHints("someone@gmail.com", "").personalEmail).toBe(true);
    expect(reviewHints("someone@wp.pl", "").personalEmail).toBe(true);
    expect(reviewHints("jobs@acme.eu", "").personalEmail).toBe(false);
  });
});

describe("isOpenToApplicants", () => {
  const base = { companyVerified: false, removedAt: null, removedReason: null };

  it("opens sourced listings, and direct ones only from verified companies", () => {
    expect(isOpenToApplicants({ ...base, origin: "sourced" })).toBe(true);
    expect(isOpenToApplicants({ ...base, origin: "direct" })).toBe(false);
    expect(isOpenToApplicants({ ...base, origin: "direct", companyVerified: true })).toBe(true);
  });

  it("closes removed or unknown listings", () => {
    expect(isOpenToApplicants({ ...base, origin: "sourced", removedAt: "2026-09-25T00:00:00.000Z" })).toBe(false);
    expect(isOpenToApplicants(null)).toBe(false);
  });
});

describe("isAdmin", () => {
  const original = process.env.ADMIN_USER_IDS;
  afterEach(() => {
    if (original === undefined) delete process.env.ADMIN_USER_IDS;
    else process.env.ADMIN_USER_IDS = original;
  });

  it("reads the comma-separated ADMIN_USER_IDS", () => {
    process.env.ADMIN_USER_IDS = " a1 , b2 ";
    expect(isAdmin("a1")).toBe(true);
    expect(isAdmin("b2")).toBe(true);
    expect(isAdmin("c3")).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });

  it("has no moderators when unset", () => {
    delete process.env.ADMIN_USER_IDS;
    expect(isAdmin("a1")).toBe(false);
  });
});

describe("escapeHtml", () => {
  it("escapes everything that could break out of email markup", () => {
    expect(escapeHtml(`<a href="x">Tom & 'Jerry'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;");
  });
});
