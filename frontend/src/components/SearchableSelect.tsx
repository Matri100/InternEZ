import { useEffect, useId, useRef, useState } from "react";

interface Props {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  disabledHint?: string;
}

/**
 * Single-value type-to-filter combobox. Unlike a plain text input, the value
 * can only ever be one of `options` — typing filters the list, but blurring
 * without a selection reverts to whatever was last chosen. Used where free
 * text isn't allowed (e.g. picking a university from a fixed list).
 */
export function SearchableSelect({ options, value, onChange, placeholder, disabled, disabledHint }: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const filtered = options.filter((o) => o.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 50);

  function commit(opt: string) {
    onChange(opt);
    setQuery(opt);
    setOpen(false);
  }

  function handleBlur() {
    window.setTimeout(() => {
      setOpen(false);
      // Revert to the last committed value if the typed text isn't an exact option.
      if (!options.includes(query)) setQuery(value);
    }, 120);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlight]) commit(filtered[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery(value);
    }
  }

  if (disabled) {
    return (
      <input className="input" value="" disabled placeholder={disabledHint ?? placeholder} />
    );
  }

  return (
    <div className="searchable-select" ref={containerRef}>
      <div className="searchable-select-input-wrap">
        <input
          className="input"
          value={query}
          placeholder={placeholder ?? "Search…"}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={listboxId}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
        {open && filtered.length > 0 && (
          <div className="searchable-select-dropdown" role="listbox" id={listboxId}>
            {filtered.map((opt, idx) => (
              <button
                type="button"
                key={opt}
                role="option"
                aria-selected={idx === highlight}
                className={`searchable-select-option ${idx === highlight ? "highlighted" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commit(opt)}
                onMouseEnter={() => setHighlight(idx)}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
        {open && filtered.length === 0 && (
          <div className="searchable-select-dropdown">
            <div className="searchable-select-empty">No matches</div>
          </div>
        )}
      </div>
    </div>
  );
}
