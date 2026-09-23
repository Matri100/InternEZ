// Renders a listing's description as real paragraphs/headings/bullet
// lists instead of one flat blob of text. The backend (see
// backend/src/services/ingestion/stripHtml.ts) already encodes that
// structure into the plain-text string itself — a blank line between
// blocks, "- " at the start of every line in a bullet block, and a block
// wrapped in "**...**" for what was a standalone bolded paragraph in the
// source (how real job postings mark up section headers, no <h1-6>
// involved). This just reads those conventions back into real elements —
// never dangerouslySetInnerHTML, so there's no HTML/XSS surface here even
// though the source content is third-party.
type Block = { type: "heading"; text: string } | { type: "list"; items: string[] } | { type: "paragraph"; text: string };

function parseBlocks(text: string): Block[] {
  return text
    .split(/\n{2,}/)
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((raw): Block => {
      const lines = raw
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length > 0 && lines.every((l) => l.startsWith("- "))) {
        return { type: "list", items: lines.map((l) => l.slice(2)) };
      }

      const headingMatch = raw.match(/^\*\*(.+)\*\*$/);
      if (headingMatch) {
        return { type: "heading", text: headingMatch[1] };
      }

      return { type: "paragraph", text: raw };
    });
}

export function Description({ text }: { text: string }) {
  const blocks = parseBlocks(text);

  return (
    <div className="description">
      {blocks.map((block, i) => {
        if (block.type === "heading") {
          return (
            <h4 className="description-heading" key={i}>
              {block.text}
            </h4>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={i}>
              {block.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          );
        }
        return (
          <p style={{ whiteSpace: "pre-wrap" }} key={i}>
            {block.text}
          </p>
        );
      })}
    </div>
  );
}
