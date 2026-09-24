import { useMemo, useState } from "react";
import type { FacetCount } from "../../types/domain";
import { useI18n } from "../../i18n";

const COLLAPSED_SIZE = 6;

// One filter group in Browse's sidebar: a checkbox per option with how
// many results it would leave, given every other active filter (the
// server's facet counts). Options that would leave nothing are hidden
// unless selected; long lists collapse behind "Show all" and can be
// searched.
export function FacetList({
  title,
  options,
  selected,
  onToggle,
  label = (value) => value,
  searchPlaceholder,
  action,
}: {
  title: string;
  options: FacetCount[];
  selected: string[];
  onToggle: (value: string) => void;
  label?: (value: string) => string;
  searchPlaceholder?: string;
  action?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const { t } = useI18n();

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return options.filter(
      (o) =>
        (o.count > 0 || selected.includes(o.value)) &&
        (!needle || label(o.value).toLowerCase().includes(needle))
    );
  }, [options, selected, search, label]);

  if (visible.length === 0 && !search) return null;

  const collapsible = visible.length > COLLAPSED_SIZE && !search;
  const shown = collapsible && !expanded ? visible.slice(0, COLLAPSED_SIZE) : visible;

  return (
    <fieldset className="facet">
      <div className="facet-head">
        <legend>{title}</legend>
        {action}
      </div>
      {searchPlaceholder && options.length > COLLAPSED_SIZE && (
        <input
          className="input facet-search"
          type="search"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}
      <ul className="facet-options">
        {shown.map((option) => (
          <li key={option.value}>
            <label className="facet-option">
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={() => onToggle(option.value)}
              />
              <span className="facet-label">{label(option.value)}</span>
              <span className="facet-count">{option.count}</span>
            </label>
          </li>
        ))}
        {visible.length === 0 && <li className="facet-empty">{t("browse.facetNoMatches")}</li>}
      </ul>
      {collapsible && (
        <button type="button" className="facet-more" onClick={() => setExpanded((v) => !v)}>
          {expanded ? t("browse.facetShowFewer") : t("browse.facetShowAll", { count: visible.length })}
        </button>
      )}
    </fieldset>
  );
}
