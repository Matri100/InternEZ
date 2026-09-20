import type { MatchResult } from "../types/domain";

export function MatchBar({ match }: { match: MatchResult }) {
  return (
    <div className="match-factor-grid">
      {match.factors.map((f) => {
        const pct = f.max > 0 ? (f.points / f.max) * 100 : 0;
        return (
          <div className="match-bar-row" key={f.key}>
            <span>
              {f.label}
              {f.neutral && <span className="match-neutral-dot" title="No preference set — neutral default" />}
            </span>
            <div className="match-bar-track">
              <div className={`match-bar-fill ${f.neutral ? "neutral" : ""}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="match-bar-value">
              {f.points}/{f.max}
            </span>
          </div>
        );
      })}
    </div>
  );
}
