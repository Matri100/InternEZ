import type { ReactNode } from "react";

/**
 * Renders a row of metadata fragments separated by a thin vertical rule
 * instead of "·"-joined text — a deliberate choice, not a stylistic default:
 * dot-joined metadata strings are one of the more recognizable tells of
 * generic AI-generated UI, so this app uses divider rules everywhere instead.
 */
export function MetaRow({ items, className }: { items: ReactNode[]; className?: string }) {
  const visible = items.filter((item) => item !== null && item !== undefined && item !== "" && item !== false);
  return (
    <span className={`meta-row ${className ?? ""}`}>
      {visible.map((item, i) => (
        <span className="meta-row-item" key={i}>
          {item}
        </span>
      ))}
    </span>
  );
}
