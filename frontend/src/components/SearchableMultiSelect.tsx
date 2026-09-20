import { useMemo, useState } from "react";

export interface Option {
  value: string;
  label: string;
}

export interface OptionGroup {
  category: string;
  options: (Option | string)[];
}

interface Props {
  groups?: OptionGroup[];
  options?: (Option | string)[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  maxResults?: number;
}

function toOption(o: Option | string): Option {
  return typeof o === "string" ? { value: o, label: o } : o;
}

/**
 * Type-to-filter multi-select over a predefined option list. Selected values
 * render as removable tags; the dropdown never accepts free text as a value —
 * only listed options can be added, which is the whole point versus a plain
 * text field. Options may be plain strings or {value,label} pairs (e.g. a
 * country code paired with its display name).
 */
export function SearchableMultiSelect({ groups, options, selected, onChange, placeholder, maxResults = 40 }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const flatGroups: { category: string; options: Option[] }[] = useMemo(() => {
    const source = groups ?? [{ category: "", options: options ?? [] }];
    return source.map((g) => ({ category: g.category, options: g.options.map(toOption) }));
  }, [groups, options]);

  const labelFor = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of flatGroups) for (const o of g.options) map.set(o.value, o.label);
    return (value: string) => map.get(value) ?? value;
  }, [flatGroups]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let remaining = maxResults;
    const result: { category: string; options: Option[] }[] = [];
    for (const g of flatGroups) {
      if (remaining <= 0) break;
      const matches = g.options.filter(
        (o) => !selected.includes(o.value) && (q === "" || o.label.toLowerCase().includes(q))
      );
      if (matches.length === 0) continue;
      const slice = matches.slice(0, remaining);
      remaining -= slice.length;
      result.push({ category: g.category, options: slice });
    }
    return result;
  }, [flatGroups, query, selected, maxResults]);

  const flatVisible = filtered.flatMap((g) => g.options);

  function addOption(opt: Option) {
    onChange([...selected, opt.value]);
    setQuery("");
    setHighlight(0);
  }

  function removeOption(value: string) {
    onChange(selected.filter((s) => s !== value));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, flatVisible.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = flatVisible[highlight];
      if (opt) addOption(opt);
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Backspace" && query === "" && selected.length > 0) {
      removeOption(selected[selected.length - 1]);
    }
  }

  return (
    <div className="searchable-select">
      {selected.length > 0 && (
        <div className="chip-group" style={{ marginBottom: 8 }}>
          {selected.map((s) => (
            <button type="button" key={s} className="chip selected" onClick={() => removeOption(s)}>
              {labelFor(s)} <span aria-hidden>×</span>
            </button>
          ))}
        </div>
      )}
      <div className="searchable-select-input-wrap">
        <input
          className="input"
          value={query}
          placeholder={placeholder ?? "Type to search…"}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={handleKeyDown}
        />
        {open && flatVisible.length > 0 && (
          <div className="searchable-select-dropdown">
            {filtered.map((g) => (
              <div key={g.category || "_"}>
                {g.category && <div className="searchable-select-category">{g.category}</div>}
                {g.options.map((opt) => {
                  const idx = flatVisible.indexOf(opt);
                  return (
                    <button
                      type="button"
                      key={opt.value}
                      className={`searchable-select-option ${idx === highlight ? "highlighted" : ""}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => addOption(opt)}
                      onMouseEnter={() => setHighlight(idx)}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
        {open && flatVisible.length === 0 && (
          <div className="searchable-select-dropdown">
            <div className="searchable-select-empty">No matches</div>
          </div>
        )}
      </div>
    </div>
  );
}
