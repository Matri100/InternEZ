import { useEffect, useRef, useState } from "react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function formatMonthYear(value: string): string {
  if (!value) return "";
  const [y, m] = value.split("-");
  const idx = Number(m) - 1;
  if (!y || Number.isNaN(idx) || idx < 0 || idx > 11) return value;
  return `${MONTHS[idx]} ${y}`;
}

interface Props {
  value: string; // "YYYY-MM" or ""
  onChange: (value: string) => void;
  placeholder?: string;
  minYear?: number;
  maxYear?: number;
}

/**
 * A month+year popover picker — friendlier and more consistent across
 * browsers than the native <input type="month">, which renders very
 * differently (and sometimes awkwardly) depending on OS/browser.
 */
export function MonthYearPicker({ value, onChange, placeholder, minYear = 2015, maxYear = 2032 }: Props) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState<number>(() => {
    const y = value ? Number(value.split("-")[0]) : new Date().getFullYear();
    return Number.isFinite(y) ? y : new Date().getFullYear();
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const selectedYear = value ? Number(value.split("-")[0]) : null;
  const selectedMonth = value ? Number(value.split("-")[1]) : null;

  function pickMonth(monthIndex: number) {
    const mm = String(monthIndex + 1).padStart(2, "0");
    onChange(`${viewYear}-${mm}`);
    setOpen(false);
  }

  return (
    <div className="month-picker" ref={containerRef}>
      <button
        type="button"
        className="input month-picker-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {value ? formatMonthYear(value) : <span className="month-picker-placeholder">{placeholder ?? "Select month"}</span>}
      </button>
      {open && (
        <div className="month-picker-popover" role="dialog">
          <div className="month-picker-year-nav">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setViewYear((y) => Math.max(minYear, y - 1))}
              disabled={viewYear <= minYear}
              aria-label="Previous year"
            >
              ‹
            </button>
            <span>{viewYear}</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setViewYear((y) => Math.min(maxYear, y + 1))}
              disabled={viewYear >= maxYear}
              aria-label="Next year"
            >
              ›
            </button>
          </div>
          <div className="month-picker-grid">
            {MONTHS.map((m, i) => (
              <button
                type="button"
                key={m}
                className={`month-picker-cell ${selectedYear === viewYear && selectedMonth === i + 1 ? "selected" : ""}`}
                onClick={() => pickMonth(i)}
              >
                {m.slice(0, 3)}
              </button>
            ))}
          </div>
          {value && (
            <button type="button" className="btn btn-ghost btn-sm month-picker-clear" onClick={() => { onChange(""); setOpen(false); }}>
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
