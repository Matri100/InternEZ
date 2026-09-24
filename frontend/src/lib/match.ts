import type { MessageKey } from "../i18n/messages/en";

export type MatchTier = "good" | "average" | "poor";

export function matchTier(total: number): MatchTier {
  if (total >= 70) return "good";
  if (total >= 40) return "average";
  return "poor";
}

export function matchLabel(total: number, t: (key: MessageKey) => string): string {
  return t(`match.${matchTier(total)}`);
}
