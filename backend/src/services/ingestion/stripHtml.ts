// Greenhouse job descriptions come back as HTML (the same content the
// company's hosted job page renders). Listing.description is shown as
// plain text in a single <p> (see ListingDetail.tsx) — never
// dangerouslySetInnerHTML — so this is display cleanup, not an XSS
// concern either way. Regex-based rather than a real HTML parser: good
// enough for stripping tags and common entities out of job-posting
// markup, and one dependency lighter.
export function stripHtml(html: string): string {
  return html
    // Greenhouse's job `content` comes back with its HTML entity-encoded
    // ("&lt;p&gt;..." rather than "<p>...") — confirmed against real
    // Greenhouse API responses, and matches their own docs' example.
    // Entities must be decoded before tags are stripped, or the decode
    // step re-introduces literal tags into the "stripped" output.
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&") // must come last — the others' replacements can produce literal "&"
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
