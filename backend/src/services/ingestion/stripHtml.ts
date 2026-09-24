// ATS job descriptions come back as HTML (the same content the company's
// hosted job page renders) — real examples have <p> paragraphs, <h2>
// section titles, <br> line breaks, and <ul><li> lists, not flat text.
// Listing.description
// is shown as plain text (see ListingDetail.tsx, rendered with
// white-space: pre-wrap — never dangerouslySetInnerHTML, so this is
// display cleanup, not an XSS concern either way), so that structure has
// to survive as real line breaks or the result reads as one giant
// unbroken paragraph. Regex-based rather than a real HTML parser: good
// enough for job-posting markup.
import { decodeHTMLStrict } from "entities";

// Every HTML entity, named or numeric. Real Active Jobs DB descriptions
// encode most non-ASCII characters numerically ("&#xe9;" for "é" appeared
// 777 times across the first 162 listings), which a hand-written list of
// the usual named entities never covered. Strict mode only decodes
// entities that end in ";", so text like "R&D" or "AT&T" stays as written.
// Run twice: some sources HTML-escape text that was already escaped, so a
// literal "é" arrives as "&amp;#xe9;" — the first pass only gets it to
// "&#xe9;". A second pass is a no-op on singly-encoded text.
export function decodeEntities(text: string): string {
  return decodeHTMLStrict(decodeHTMLStrict(text));
}

// Characters that render as nothing (soft hyphen, zero-width space, byte
// order mark) are dropped; the no-break and fixed-width spaces become
// ordinary spaces so the whitespace collapse below catches them.
const INVISIBLE = /[\u00ad\u200b\ufeff]/g;
const SPACE_VARIANTS = /[\u00a0\u2000-\u200a\u202f\u205f\u3000]/g;

// Postings often fake a bullet list with a symbol at the start of each
// line instead of <ul><li>. Converted to the "- " marker Description.tsx
// renders as a real list (including a list item that repeats the symbol,
// "- • text"). An en dash only counts when a space follows, so a line
// starting with a range like "–20%" is left alone.
const LINE_BULLET = /^(?:-\s*)?(?:[•◦▪●■□➢➤►▸✓✔·○]\s*|–\s+)/;

// Recruiters' LinkedIn tracking codes ("#LI-DNI", "#LI-Hybrid", "#LI-KH1")
// that career sites leave in the posting text. Other hashtags are the
// employer's own wording ("#EarlyTalent") and stay.
const LINKEDIN_TAG = /#LI-[A-Za-z0-9]+/g;

// For text that no longer contains tags — the tail end of stripHtml, and
// descriptions already stored before a cleanup rule existed (see
// db/repairs.ts). Keeps the structure markers stripHtml produces: blank
// lines between blocks, "- " list lines and "**heading**" lines.
export function cleanText(text: string): string {
  return (
    text
      .replace(LINKEDIN_TAG, "")
      .replace(INVISIBLE, "")
      .replace(SPACE_VARIANTS, " ")
      // Collapse horizontal whitespace (not newlines — those carry the
      // structure) and cap blank-line runs at one.
      .replace(/[^\S\n]+/g, " ")
      .split("\n")
      .map((line) => line.trim().replace(LINE_BULLET, "- "))
      // A heading or bullet whose text turned out to be only whitespace
      // once decoded (or only a removed LinkedIn tag).
      .filter((line) => !/^\*\*\s*\*\*$/.test(line) && line !== "-")
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

// For one-line fields: titles, company names, locations.
export function cleanInline(text: string): string {
  return decodeEntities(text).replace(INVISIBLE, "").replace(SPACE_VARIANTS, " ").replace(/\s+/g, " ").trim();
}

// Wraps a heading's text in **markers** for Description.tsx, flattened to
// one line (the frontend only recognizes a single-line **...** block) —
// or drops it entirely when it has no visible text, since real feeds
// contain empty "<p><strong></strong></p>" spacers that would otherwise
// render as a stray "****".
function headingMarker(_match: string, _tag: string, inner: string): string {
  const text = inner.replace(/<[^>]*>/g, "").replace(INVISIBLE, "").replace(/\s+/g, " ").trim();
  return text ? `<p>**${text}**</p>` : "";
}

// Stylesheet text in plain text. Only needed for descriptions stored
// before stripHtml dropped <style> blocks — two real Suez postings began
// with ~60 lines of their career site's CSS ("#careerSite .contractType{
// display: flex; ... }"). A rule only counts when everything inside its
// braces is lowercase "property: value" declarations and the text before
// them looks like a selector, so ordinary text with braces is left alone.
// @media blocks wrap such rules one level deep.
// One line only, so a line of prose just above a rule is never taken for
// part of its selector.
const CSS_SELECTOR = String.raw`[#.a-zA-Z][#.\w \t>:,()*\[\]="-]*`;
const CSS_DECLARATIONS = String.raw`\{\s*(?:[a-z-]+\s*:[^{};]*;?\s*)+\}`;
const CSS_MEDIA_BLOCK = new RegExp(
  String.raw`(?:^|\n)@media[^{\n]*\{(?:\s*${CSS_SELECTOR}${CSS_DECLARATIONS})*\s*\}`,
  "g"
);
const CSS_RULE = new RegExp(String.raw`(?:^|\n)${CSS_SELECTOR}${CSS_DECLARATIONS}`, "g");

export function removeLeakedCss(text: string): string {
  return text.replace(CSS_MEDIA_BLOCK, "\n").replace(CSS_RULE, "\n");
}

export function stripHtml(html: string): string {
  return cleanText(
    decodeEntities(html)
      // Greenhouse's job `content` comes back with its HTML
      // entity-encoded ("&lt;p&gt;..." rather than "<p>...") — confirmed
      // against real Greenhouse API responses, and matches their own
      // docs' example — so entities are decoded before tags are stripped,
      // not after.

      // Blocks whose content is code, not text: without this the tag
      // strip below removes only the <style> tags and keeps the CSS.
      .replace(/<(style|script)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")

      // A <p> whose entire content is one <strong>/<b> wrapping nothing
      // else is how job postings actually mark up a section header (e.g.
      // "<p><strong>Background:</strong></p>", confirmed against real
      // N26 content) — there's no <h1-6> involved at all. Tag that text
      // with a **markdown-style** marker before the generic tag-strip
      // below erases the distinction, so the frontend (Description.tsx)
      // can render it as a real heading instead of an ordinary paragraph.
      .replace(/<h([1-6])(?:\s[^>]*)?>([\s\S]*?)<\/h\1>/gi, headingMarker)
      // The inner text may not contain a <p> boundary — otherwise a lazy
      // match starting at "<p><b>Note:</b> text</p>" would run on to the
      // next bold paragraph's "</b></p>" and merge both into one bogus
      // heading. "(?:\s[^>]*)?" after the tag name keeps "<b" from also
      // matching "<br>".
      .replace(
        /<p(?:\s[^>]*)?>\s*<(strong|b)(?:\s[^>]*)?>((?:(?!<\/?p[\s>])[\s\S])*?)<\/\1>\s*<\/p>/gi,
        headingMarker
      )
      // Convert structure to line breaks before stripping tags, so a
      // paragraph/list becomes readable plain text instead of one run-on
      // sentence once the tags themselves are gone. Order matters: a list
      // item's own open/close first (so items land one per line, not
      // separated by a blank line like paragraphs are), then the general
      // block boundaries.
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<(ul|ol)[^>]*>/gi, "\n\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<\/li>/gi, "\n")
      .replace(/<\/(p|ul|ol|div|h[1-6]|tr)>/gi, "\n\n")
      .replace(/<[^>]*>/g, "")
  );
}
