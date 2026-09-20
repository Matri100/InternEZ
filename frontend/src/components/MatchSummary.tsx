import type { MatchResult } from "../types/domain";
import { matchTier, matchLabel } from "../lib/match";
import { FlagIcon } from "./icons";

export function MatchSummary({ match }: { match: MatchResult }) {
  return (
    <div className={`match-summary ${matchTier(match.total)}`}>
      <div className="match-summary-label">
        <FlagIcon />
        {matchLabel(match.total)}
      </div>
      <p className="match-summary-explanation">{match.explanation}</p>
    </div>
  );
}
