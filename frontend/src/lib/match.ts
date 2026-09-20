export type MatchTier = "good" | "average" | "poor";

export function matchTier(total: number): MatchTier {
  if (total >= 70) return "good";
  if (total >= 40) return "average";
  return "poor";
}

const MATCH_LABELS: Record<MatchTier, string> = {
  good: "Good match",
  average: "Average match",
  poor: "Poor match",
};

export function matchLabel(total: number): string {
  return MATCH_LABELS[matchTier(total)];
}
