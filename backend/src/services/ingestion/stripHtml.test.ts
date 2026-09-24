import { describe, expect, it } from "vitest";
import { cleanInline, cleanText, decodeEntities, removeLeakedCss, stripHtml } from "./stripHtml.js";

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

  it("decodes numeric entities, including double-encoded ones", () => {
    // Real Active Jobs DB text: "Stefan&#xa0;Wolf" showed up verbatim on a
    // live listing, and accented letters arrive as "&#xe9;" etc.
    expect(stripHtml("<p>Stefan&#xa0;Wolf (Functional Department)</p>")).toBe("Stefan Wolf (Functional Department)");
    expect(stripHtml("<p>Exp&#xe9;rience &#x2013; M&#xfc;nchen &#8217;24</p>")).toBe("Expérience – München ’24");
    expect(stripHtml("<p>Caf&amp;#xe9;</p>")).toBe("Café");
  });

  it("decodes named entities beyond the basic five", () => {
    expect(stripHtml("<p>Don&rsquo;t &ndash; na&iuml;ve &euro;500</p>")).toBe("Don’t – naïve €500");
  });

  it("leaves a bare ampersand that is not an entity alone", () => {
    expect(stripHtml("<p>R&D at AT&T, P&G</p>")).toBe("R&D at AT&T, P&G");
  });

  it("drops invisible characters and normalizes odd spaces", () => {
    expect(stripHtml("<p>Soft&#xad;ware&#x200b; team&#x202f;!</p>")).toBe("Software team !");
  });

  it("turns symbol-bulleted lines into list lines", () => {
    const html = "<p>We offer:<br>• Mentoring<br>➢ A laptop<br>– Lunch</p>";
    expect(stripHtml(html)).toBe("We offer:\n- Mentoring\n- A laptop\n- Lunch");
  });

  it("does not double up a list item that repeats the bullet symbol", () => {
    expect(stripHtml("<ul><li>• Mentoring</li></ul>")).toBe("- Mentoring");
  });

  it("drops a heading that is only a no-break space", () => {
    expect(stripHtml("<p>One.</p><p><strong>&#xa0;</strong></p><p>Two.</p>")).toBe("One.\n\nTwo.");
  });
});

describe("stripHtml code blocks and tracking tags", () => {
  it("drops <style> and <script> blocks instead of keeping their code as text", () => {
    const html = "<style>#careerSite h2{ color: #030F40; }</style><script>track()</script><p>QUI SOMMES-NOUS</p>";
    expect(stripHtml(html)).toBe("QUI SOMMES-NOUS");
  });

  it("drops HTML comments", () => {
    expect(stripHtml("<p>One<!-- <b>hidden</b> --></p>")).toBe("One");
  });

  it("removes LinkedIn tracking tags but keeps the employer's own hashtags", () => {
    expect(stripHtml("<p>Apply now!</p><p>#LI-DNI</p><p>#LI-Onsite #EarlyTalent</p>")).toBe(
      "Apply now!\n\n#EarlyTalent"
    );
  });
});

describe("removeLeakedCss", () => {
  it("removes CSS rules and @media blocks stored as plain text", () => {
    // Shape of two real stored Suez descriptions, shortened.
    const stored =
      "#careerSite.container{\nfont-family: Arial;\n}\n#careerSite .backToLink{\ncolor: #030F40;\nfont-weight: bold;\n}\n\n" +
      "@media screen and (min-width: 200px) and (max-width: 840px) {\n#careerSite .contractType{\ndisplay: flex;\n" +
      "padding: 5px;\n}\n#careerSite .encartTxt {\npadding-top:70px\n}\n}\n\n" +
      "#careerSite .contractType .contractTypeText p {\npadding: 0!important;\n}\n\n\n\nType de contrat\n\nInternship";
    expect(cleanText(removeLeakedCss(stored))).toBe("Type de contrat\n\nInternship");
  });

  it("keeps the line of text right above a rule", () => {
    expect(cleanText(removeLeakedCss("Intro text\n#x h2{\ncolor: red;\n}\nMore"))).toBe("Intro text\n\nMore");
  });

  it("leaves ordinary text with braces alone", () => {
    const text = "Skills {required}: Python, SQL.";
    expect(removeLeakedCss(text)).toBe(text);
  });
});

describe("cleanText", () => {
  it("repairs already-stored text without disturbing its structure markers", () => {
    const stored = "**Your tasks**\n\n- Support the team\n• Analyse data\n\nMore text.";
    expect(cleanText(decodeEntities(stored))).toBe("**Your tasks**\n\n- Support the team\n- Analyse data\n\nMore text.");
  });

  it("does not turn an en dash range at the start of a line into a bullet", () => {
    expect(cleanText("–20% discount")).toBe("–20% discount");
  });
});

describe("cleanInline", () => {
  it("decodes and flattens a one-line field", () => {
    expect(cleanInline("  Stagiaire Contr&#xf4;le de Gestion  ")).toBe("Stagiaire Contrôle de Gestion");
  });
});
