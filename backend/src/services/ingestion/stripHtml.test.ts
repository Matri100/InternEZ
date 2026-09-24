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
    // (That same whole-paragraph <strong> is also a section heading — see
    // the heading tests below — hence the ** markers.)
    const raw = "&lt;p&gt;&lt;strong&gt;About the opportunity&lt;/strong&gt;&lt;/p&gt;";
    expect(stripHtml(raw)).toBe("**About the opportunity**");
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

  it("marks a <p> that's entirely one <strong> as a heading, not an ordinary paragraph", () => {
    // This is how real job postings actually mark section headers — there's
    // no <h1-6> involved. Captured live: N26's real content has
    // "<p><strong>Background:</strong></p>" as its own standalone
    // paragraph. Marked with a **markdown-style** wrapper so the frontend
    // can render it as a real heading instead of body text.
    expect(stripHtml("<p><strong>Background:</strong></p><p>Some body text.</p>")).toBe(
      "**Background:**\n\nSome body text."
    );
  });

  it("marks real <h1>-<h6> headings the same way, flattened to one line", () => {
    // Real feed markup (a SmartRecruiters posting via Active Jobs DB).
    const html = "<h2 class=\"title\">Descrizione\n  dell&apos;azienda</h2><p>Testo.</p>";
    expect(stripHtml(html)).toBe("**Descrizione dell'azienda**\n\nTesto.");
  });

  it("drops empty bold spacer paragraphs instead of leaving a stray '****'", () => {
    expect(stripHtml("<p>One.</p><p><strong> </strong></p><p>Two.</p>")).toBe("One.\n\nTwo.");
  });

  it("does not merge a bold lead-in paragraph into the next bold heading", () => {
    // A lazy match starting at the first <p><b> used to run on to the next
    // "</b></p>" and turn both paragraphs into one bogus heading.
    const html = "<p><b>Note:</b> apply by Friday.</p><p><b>Benefits</b></p>";
    expect(stripHtml(html)).toBe("Note: apply by Friday.\n\n**Benefits**");
  });

  it("does not mistake a <br> for a <b> tag", () => {
    expect(stripHtml("<p><br>Line after a break.</p>")).toBe("Line after a break.");
  });

  it("does not treat a <strong> that shares its paragraph with other text as a heading", () => {
    expect(stripHtml("<p>Hello <strong>world</strong>, how are you?</p>")).toBe(
      "Hello world, how are you?"
    );
  });
});
