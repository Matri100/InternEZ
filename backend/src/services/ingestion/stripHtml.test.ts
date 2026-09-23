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

  it("decodes double-encoded entities (a literal & in the source text)", () => {
    // Captured live from the same real N26 listing — "Risk & Compliance"
    // in the original text comes through Greenhouse's API as
    // "Risk &amp;amp; Compliance", not "Risk &amp; Compliance". One
    // decode pass only gets to "&amp;", leaving a visible artifact.
    expect(stripHtml("Risk &amp;amp; Compliance")).toBe("Risk & Compliance");
  });

  it("turns paragraphs into blank-line-separated blocks, not one run-on paragraph", () => {
    expect(stripHtml("<p>First paragraph.</p><p>Second paragraph.</p>")).toBe(
      "First paragraph.\n\nSecond paragraph."
    );
  });

  it("turns a list into one bullet per line, not comma-free run-on text", () => {
    const html = "<p>Intro.</p><ul><li>Item one</li><li>Item two</li></ul><p>Outro.</p>";
    expect(stripHtml(html)).toBe("Intro.\n\n- Item one\n- Item two\n\nOutro.");
  });

  it("turns <br><br> into a paragraph break within otherwise-flowing text", () => {
    expect(stripHtml("<p>Line one.<br><br>Line two.</p>")).toBe("Line one.\n\nLine two.");
  });
});
