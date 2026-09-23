// Greenhouse job descriptions come back as HTML (the same content the
// company's hosted job page renders) — real examples have <p> paragraphs,
// <br> line breaks, and <ul><li> lists, not flat text. Listing.description
// is shown as plain text (see ListingDetail.tsx, rendered with
// white-space: pre-wrap — never dangerouslySetInnerHTML, so this is
// display cleanup, not an XSS concern either way), so that structure has
// to survive as real line breaks or the result reads as one giant
// unbroken paragraph. Regex-based rather than a real HTML parser: good
// enough for job-posting markup, one dependency lighter.
function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&"); // must come last — the others' replacements can produce literal "&"
}

export function stripHtml(html: string): string {
  return (
    decodeEntities(decodeEntities(html))
      // Greenhouse's job `content` comes back with its HTML
      // entity-encoded ("&lt;p&gt;..." rather than "<p>...") — confirmed
      // against real Greenhouse API responses, and matches their own
      // docs' example. Decoded twice: real listings have turned up a
      // literal "&" inside the text (e.g. "Risk & Compliance") that was
      // itself HTML-escaped before Greenhouse's own encoding wrapped the
      // whole blob, so it arrives as "&amp;amp;" — one decode pass only
      // gets to "&amp;", not "&". A second pass is a no-op on text that
      // was only single-encoded, so this is safe either way.

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
      // Collapse horizontal whitespace (not newlines — those carry the
      // structure just introduced) and cap blank-line runs at one.
      .replace(/[^\S\n]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .split("\n")
      .map((line) => line.trim())
      .join("\n")
      .trim()
  );
}
