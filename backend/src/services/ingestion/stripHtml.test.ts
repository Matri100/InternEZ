import { describe, expect, it } from "vitest";
import { stripHtml } from "./stripHtml.js";

describe("stripHtml", () => {
  it("strips ordinary HTML tags", () => {
    expect(stripHtml("<p>Hello <strong>world</strong></p>")).toBe("Hello world");
  });

  it("handles Greenhouse's double-encoded content (entities that decode into tags)", () => {
    // Captured live from a real Greenhouse job (N26's Vendor Management
    // Internship) — their `content` field comes back with its HTML
    // entity-encoded, "&lt;p&gt;" rather than "<p>", not real tags. This
    // caught a real bug: stripping tags before decoding entities left the
    // decoded tags in the final output instead of removing them.
    const raw = "&lt;p&gt;&lt;strong&gt;About the opportunity&lt;/strong&gt;&lt;/p&gt;";
    expect(stripHtml(raw)).toBe("About the opportunity");
  });

  it("decodes common entities and collapses whitespace", () => {
    expect(stripHtml("<p>Tom &amp; Jerry&nbsp;&nbsp;forever</p>")).toBe("Tom & Jerry forever");
  });

  it("does not leave a literal ampersand artifact from entity decoding order", () => {
    expect(stripHtml("Ben &amp; Jerry's")).toBe("Ben & Jerry's");
  });
});
