import type { MatchResult } from "../types/domain";
import { factorLabel } from "../lib/explanations";
import { useI18n } from "../i18n";

export function MatchBar({ match }: { match: MatchResult }) {
  const { t } = useI18n();
  return (
    <div className="match-factor-grid">
      {match.factors.map((f) => {
        const pct = f.max > 0 ? (f.points / f.max) * 100 : 0;
        return (
          <div className="match-bar-row" key={f.key}>
            <span>
              {factorLabel(f, t)}
              {f.neutral && <span className="match-neutral-dot" title={t("match.neutral")} />}
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
