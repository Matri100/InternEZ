import { useMemo, useRef, useState } from "react";
import { MAP_HEIGHT, MAP_SHAPES, MAP_WIDTH, type MapShape } from "../../data/europeMap";
import type { CountryCode } from "../../types/domain";
import { useI18n } from "../../i18n";

// Shapes smaller than this (in the map's own 1000px-wide units) are too
// small to fit a count label — Luxembourg, Malta, Liechtenstein, Cyprus.
const LABEL_MIN_AREA = 900;

interface CountryGroup {
  code: CountryCode;
  shapes: MapShape[];
  label: MapShape; // the largest shape, where the count goes
}

// Browse's country map: each covered country shaded by how many
// internships match the other active filters, clickable to add or remove
// it from the country filter. Drawn from a static, pre-projected SVG
// (data/europeMap.ts) — no map library or third-party tiles. Loaded
// lazily, only once someone opens the map.
export default function EuropeMap({
  counts,
  selected,
  onToggle,
  countryName,
}: {
  counts: Map<string, number>;
  selected: CountryCode[];
  onToggle: (code: CountryCode) => void;
  countryName: (code: CountryCode) => string;
}) {
  const [hover, setHover] = useState<{ code: CountryCode; x: number; y: number } | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  const groups = useMemo(() => {
    const byCode = new Map<CountryCode, MapShape[]>();
    for (const shape of MAP_SHAPES) {
      if (shape.code) byCode.set(shape.code, [...(byCode.get(shape.code) ?? []), shape]);
    }
    return [...byCode].map(([code, shapes]): CountryGroup => ({
      code,
      shapes,
      label: shapes.reduce((a, b) => (b.area > a.area ? b : a)),
    }));
  }, []);

  const max = Math.max(1, ...counts.values());

  // Log-scaled so one country with hundreds of listings doesn't wash every
  // other country out to the same pale shade. Capped well below full
  // strength, which is kept for selected countries.
  function fill(code: CountryCode): string {
    if (selected.includes(code)) return "var(--accent)";
    const count = counts.get(code) ?? 0;
    if (count === 0) return "var(--map-empty)";
    const share = 18 + Math.round((Math.log(count + 1) / Math.log(max + 1)) * 37);
    return `color-mix(in srgb, var(--accent) ${share}%, var(--surface-alt))`;
  }

  function trackHover(code: CountryCode, event: React.MouseEvent) {
    const frame = frameRef.current?.getBoundingClientRect();
    if (!frame) return;
    setHover({ code, x: event.clientX - frame.left, y: event.clientY - frame.top });
  }

  const hoverCount = hover ? counts.get(hover.code) ?? 0 : 0;

  return (
    <div className="europe-map" ref={frameRef}>
      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        role="group"
        aria-label={t("browse.mapLabel")}
        onMouseLeave={() => setHover(null)}
      >
        <g className="map-context" aria-hidden="true">
          {MAP_SHAPES.filter((s) => !s.code).map((shape) => (
            <path key={shape.name} d={shape.d} />
          ))}
        </g>
        {groups.map(({ code, shapes }) => {
          const count = counts.get(code) ?? 0;
          const isSelected = selected.includes(code);
          const interactive = count > 0 || isSelected;
          return (
            <g
              key={code}
              className={`map-country ${interactive ? "interactive" : ""} ${isSelected ? "selected" : ""}`}
              role={interactive ? "button" : undefined}
              tabIndex={interactive ? 0 : undefined}
              aria-pressed={interactive ? isSelected : undefined}
              aria-label={`${countryName(code)}: ${t("browse.mapCount", { count })}`}
              onClick={interactive ? () => onToggle(code) : undefined}
              onKeyDown={
                interactive
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onToggle(code);
                      }
                    }
                  : undefined
              }
              onMouseMove={(e) => trackHover(code, e)}
              style={{ fill: fill(code) }}
            >
              {shapes.map((shape, i) => (
                <path key={i} d={shape.d} />
              ))}
            </g>
          );
        })}
        {/* Outlines of selected countries on top, so no neighbour is drawn
            over them — in their own layer rather than by reordering the
            countries, which would drop keyboard focus on every toggle. */}
        <g className="map-selection" aria-hidden="true">
          {groups
            .filter(({ code }) => selected.includes(code))
            .flatMap(({ code, shapes }) => shapes.map((shape, i) => <path key={`${code}-${i}`} d={shape.d} />))}
        </g>
        <g className="map-labels" aria-hidden="true">
          {groups
            .filter(({ code, label }) => (counts.get(code) ?? 0) > 0 && label.area >= LABEL_MIN_AREA)
            .map(({ code, label }) => (
              <text
                key={code}
                x={label.labelX}
                y={label.labelY}
                className={selected.includes(code) ? "on-accent" : ""}
              >
                {counts.get(code)}
              </text>
            ))}
        </g>
      </svg>
      {hover && (
        <div className="map-tooltip" style={{ left: hover.x, top: hover.y }} role="status">
          <strong>{countryName(hover.code)}</strong>
          <span>{t("browse.mapCount", { count: hoverCount })}</span>
        </div>
      )}
    </div>
  );
}
