import type { MatchResult } from "../types/domain";
import { matchTier, matchLabel } from "../lib/match";
import { matchExplanation } from "../lib/explanations";
import { useI18n } from "../i18n";
import { FlagIcon } from "./icons";

export function MatchSummary({ match }: { match: MatchResult }) {
  const { t } = useI18n();
  return (
    <div className={`match-summary ${matchTier(match.total)}`}>
      <div className="match-summary-label">
        <FlagIcon />
        {matchLabel(match.total, t)}
      </div>
      <p className="match-summary-explanation">{matchExplanation(match, t)}</p>
    </div>
  );
}
