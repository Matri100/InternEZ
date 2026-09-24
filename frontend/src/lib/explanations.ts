// Server-computed results worded in the interface language. The server
// sends what it decided (a reason code, factor keys) alongside its own
// English sentence; these build the same sentence from the data instead.
import { en, type MessageKey } from "../i18n/messages/en";
import type { EligibilityResult, MatchFactor, MatchResult } from "../types/domain";

type Translate = (key: MessageKey, params?: Record<string, string | number>) => string;

export function eligibilityText(result: EligibilityResult, t: Translate, countryName: (code: string) => string): string {
  // Results cached from before the server sent reasons fall back to its text.
  if (!result.reason) return result.why;
  const { code, country, via, institution } = result.reason;
  const countryText = country ? countryName(country) : "";
  switch (code) {
    case "citizenOnlyClearance":
      return t("eligibility.citizenOnlyClearance", { country: countryText });
    case "citizenOnlyOk":
      return t("eligibility.citizenOnlyOk", { country: countryText });
    case "citizenOnlyBlocked":
      return t("eligibility.citizenOnlyBlocked", { country: countryText });
    case "noRestriction":
      return t("eligibility.noRestriction");
    case "regionCitizenship":
      return t("eligibility.regionCitizenship", { country: countryText });
    case "pathway": {
      const viaText =
        via === "placeOfBirth"
          ? t("eligibility.viaPlaceOfBirth")
          : via === "residence"
            ? t("eligibility.viaResidence")
            : t("eligibility.viaEducation", { institution: institution ?? "" });
      return t("eligibility.pathway", { via: viaText, country: countryText });
    }
    case "regionBlocked":
      return t("eligibility.regionBlocked");
    default:
      return result.why;
  }
}

function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

// A factor key the server added before this file learned about it has no
// translation yet.
function isMessageKey(key: string): key is MessageKey {
  return key in en;
}

// Mirrors buildExplanation in backend services/matching.ts.
export function matchExplanation(match: MatchResult, t: Translate): string {
  const keys = [...(match.strengths ?? []), ...(match.gaps ?? [])];
  if (!match.strengths || !match.gaps || keys.some((k) => !isMessageKey(`match.strength.${k}`))) {
    return match.explanation;
  }
  const strengths = match.strengths.map((key) => t(`match.strength.${key}` as MessageKey));
  const gaps = match.gaps.map((key) => t(`match.gap.${key}` as MessageKey));

  if (strengths.length === 0 && gaps.length === 0) {
    return match.total >= 60 ? t("match.fairFit") : t("match.limited");
  }
  let sentence =
    strengths.length === 0
      ? t("match.nothingStrong")
      : `${capitalize(strengths.length === 1 ? strengths[0] : t("match.and", { first: strengths[0], second: strengths[1] }))}.`;
  if (gaps.length > 0) sentence += ` ${capitalize(gaps[0])}.`;
  return sentence;
}

export function factorLabel(factor: MatchFactor, t: Translate): string {
  const key = `match.factor.${factor.key}`;
  return isMessageKey(key) ? t(key) : factor.label;
}
