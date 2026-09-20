import type { Applicant, CountryCode, EligibilityResult, ListingEligibility, RegionCode } from "../types/domain.js";
import { countryName, regionForCountry, REGIONS } from "../data/reference.js";

function regionName(code: RegionCode): string {
  return REGIONS.find((r) => r.code === code)?.name ?? code;
}

// Both citizenships count on equal footing — a second citizenship isn't a
// fallback tried only when the first doesn't match, it's a real, independent
// basis for eligibility (that's the whole point of holding it).
function citizenshipsOf(applicant: Applicant): CountryCode[] {
  return [applicant.citizenship, applicant.secondCitizenship].filter((c): c is CountryCode => Boolean(c));
}

/**
 * Derives eligibility from profile data — no manual work-permit question.
 * See §6 of the build brief for the exact rule set.
 */
export function computeEligibility(applicant: Applicant, rule: ListingEligibility): EligibilityResult {
  const citizenships = citizenshipsOf(applicant);

  if (rule.citizenOnly) {
    const matches = citizenships.includes(rule.citizenOnly);
    if (matches) {
      if (rule.clearance) {
        return {
          level: "review",
          why: `This role requires ${countryName(rule.citizenOnly)} citizenship, which you have — but it also requires eligibility for a security clearance, which can't be confirmed from your profile. Worth applying if you'd qualify.`,
        };
      }
      return { level: "ok", why: `This role requires ${countryName(rule.citizenOnly)} citizenship, which matches your profile.` };
    }
    return {
      level: "blocked",
      why: `This role is restricted to ${countryName(rule.citizenOnly)} citizens. Your profile lists a different citizenship, so you're unlikely to qualify — but you can still apply if this has changed.`,
    };
  }

  const allowed = rule.allowedRegions ?? [];
  if (allowed.length === 0) {
    return { level: "ok", why: "This role has no region restriction." };
  }

  const matchedCitizenship = citizenships.find((c) => allowed.includes(regionForCountry(c) as RegionCode));
  if (matchedCitizenship) {
    return { level: "ok", why: `Your citizenship (${countryName(matchedCitizenship)}) is within the eligible region for this role.` };
  }

  // No direct citizenship match — look for an indirect pathway.
  const candidates: { label: string; country: typeof applicant.citizenship }[] = [
    { label: "place of birth", country: applicant.placeOfBirth },
    { label: "residence", country: applicant.residence },
  ];
  for (const edu of applicant.education) {
    candidates.push({ label: `education (${edu.institution || edu.level})`, country: edu.country || null });
  }

  for (const candidate of candidates) {
    const region = regionForCountry(candidate.country);
    if (region && allowed.includes(region) && candidate.country) {
      return {
        level: "review",
        why: `Your citizenship alone doesn't match, but your ${candidate.label} (${countryName(candidate.country)}) falls within the eligible region — this may create a pathway worth exploring with the employer.`,
      };
    }
  }

  return {
    level: "blocked",
    why: `This role is limited to applicants connected to the ${allowed.map(regionName).join(", ")}. Nothing in your profile — citizenship, place of birth, residence, or education — connects there.`,
  };
}
