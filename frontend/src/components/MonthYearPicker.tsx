import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// English on purpose: PostListing stores this text as a listing's
// start/end label. The picker itself shows months in the interface
// language (see below).
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
  const { t, formatDate } = useI18n();
  const monthName = (index: number, style: "long" | "short") =>
    formatDate(new Date(2000, index, 1), { month: style });
  const displayValue = (v: string) => {
    const [y, m] = v.split("-").map(Number);
    return y && m ? formatDate(new Date(y, m - 1, 1), { month: "long", year: "numeric" }) : v;
  };

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
        {value ? (
          displayValue(value)
        ) : (
          <span className="month-picker-placeholder">{placeholder ?? t("picker.selectMonth")}</span>
        )}
      </button>
      {open && (
        <div className="month-picker-popover" role="dialog">
          <div className="month-picker-year-nav">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setViewYear((y) => Math.max(minYear, y - 1))}
              disabled={viewYear <= minYear}
              aria-label={t("picker.previousYear")}
            >
              ‹
            </button>
            <span>{viewYear}</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setViewYear((y) => Math.min(maxYear, y + 1))}
              disabled={viewYear >= maxYear}
              aria-label={t("picker.nextYear")}
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
                aria-label={monthName(i, "long")}
              >
                {monthName(i, "short")}
              </button>
            ))}
          </div>
          {value && (
            <button type="button" className="btn btn-ghost btn-sm month-picker-clear" onClick={() => { onChange(""); setOpen(false); }}>
              {t("picker.clear")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
