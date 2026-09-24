import type {
  Applicant,
  EducationEntry,
  EligibilityResult,
  Listing,
  MatchFactor,
  MatchResult,
} from "../types/domain.js";
import { EDUCATION_LEVEL_RANK, LANGUAGE_LEVEL_RANK, regionForCountry } from "../data/reference.js";

function primaryEducation(entries: EducationEntry[]): EducationEntry | null {
  if (entries.length === 0) return null;
  return entries.reduce((best, e) =>
    EDUCATION_LEVEL_RANK[e.level] > EDUCATION_LEVEL_RANK[best.level] ? e : best
  );
}

function highestEducationRank(entries: EducationEntry[]): number {
  return entries.reduce((max, e) => Math.max(max, EDUCATION_LEVEL_RANK[e.level]), -1);
}

interface FactorDef extends MatchFactor {
  positiveNote: string;
  negativeNote: string;
}

/**
 * 11-factor weighted compatibility score (0-100) plus a short, templated
 * explanation of the strongest and weakest contributors. Every factor is a
 * pure function of profile + listing data — no external calls, fully
 * deterministic and testable. Weights sum to 100:
 *   field 22, skills 18, availability 10, duration 6, location 8,
 *   work arrangement 6, languages 8, education level 6, eligibility 8,
 *   interests 5, qualifications 3.
 */
export function computeMatch(
  applicant: Applicant,
  listing: Omit<Listing, "description">,
  eligibility: EligibilityResult
): MatchResult {
  const factors: FactorDef[] = [];

  // --- Field of study / academic background (22) ---
  {
    const primary = primaryEducation(applicant.education);
    const max = 22;
    let points = 0;
    let neutral = false;
    if (!primary) {
      points = max * 0.4;
      neutral = true;
    } else if (listing.targetFields.includes(primary.field)) {
      points = max;
    } else if (applicant.education.some((e) => listing.targetFields.includes(e.field))) {
      points = max * 0.5;
    } else {
      points = 0;
    }
    factors.push({
      key: "field",
      label: "Field of study",
      points: Math.round(points),
      max,
      neutral,
      positiveNote: "a strong academic background match",
      negativeNote: "your field of study doesn't align closely with this role",
    });
  }

  // --- Skills & experience relevance (18) ---
  {
    const max = 18;
    const workSkills = applicant.workExperience.flatMap((w) => w.skills);
    const allSkills = new Set([...applicant.skills, ...workSkills]);
    const overlap = listing.skills.filter((s) => allSkills.has(s));
    const points = Math.min(overlap.length * 5, max);
    factors.push({
      key: "skills",
      label: "Skills & experience",
      points,
      max,
      neutral: false,
      positiveNote: "relevant technical skills",
      negativeNote: "few overlapping skills with what's required",
    });
  }

  // --- Availability / start date (10) ---
  {
    const max = 10;
    let points: number;
    let neutral = false;
    if (listing.startDate === "flexible") {
      points = max;
    } else if (applicant.availableFrom) {
      points = applicant.availableFrom <= listing.startDate ? max : 0;
    } else {
      points = max * 0.5;
      neutral = true;
    }
    factors.push({
      key: "availability",
      label: "Availability",
      points: Math.round(points),
      max,
      neutral,
      positiveNote: "compatible start dates",
      negativeNote: "your availability doesn't line up with the start date",
    });
  }

  // --- Preferred internship duration (6) ---
  {
    const max = 6;
    let points: number;
    let neutral = false;
    if (!applicant.preferredLength) {
      points = max * 0.5;
      neutral = true;
    } else if (applicant.preferredLength === "Flexible" || applicant.preferredLength === listing.duration) {
      points = max;
    } else {
      points = 0;
    }
    factors.push({
      key: "duration",
      label: "Internship length",
      points: Math.round(points),
      max,
      neutral,
      positiveNote: "matches your preferred internship length",
      negativeNote: "the internship length differs from your preference",
    });
  }

  // --- Location preference (8) ---
  {
    const max = 8;
    let points: number;
    let neutral = false;
    if (applicant.preferredLocations.length === 0) {
      points = max * 0.5;
      neutral = true;
    } else if (listing.country === null) {
      points = listing.workArrangement === "Remote" ? max : max * 0.5;
    } else if (applicant.preferredLocations.includes(listing.country)) {
      points = max;
    } else {
      const listingRegion = regionForCountry(listing.country);
      const sameRegion = applicant.preferredLocations.some((c) => regionForCountry(c) === listingRegion);
      points = sameRegion ? max * 0.6 : 0;
    }
    factors.push({
      key: "location",
      label: "Location",
      points: Math.round(points),
      max,
      neutral,
      positiveNote: "matches your preferred location",
      negativeNote: "location is outside your stated preferences",
    });
  }

  // --- Work arrangement preference (6) ---
  {
    const max = 6;
    let points: number;
    let neutral = false;
    if (applicant.workArrangementPreference.length === 0) {
      points = max * 0.5;
      neutral = true;
    } else if (applicant.workArrangementPreference.includes("Flexible")) {
      points = max;
    } else if (applicant.workArrangementPreference.includes(listing.workArrangement)) {
      points = max;
    } else {
      points = 0;
    }
    factors.push({
      key: "workArrangement",
      label: "Work arrangement",
      points: Math.round(points),
      max,
      neutral,
      positiveNote: "fits your work-arrangement preference",
      negativeNote: "the work arrangement doesn't match your preference",
    });
  }

  // --- Language requirements (8) ---
  {
    const max = 8;
    let points: number;
    let neutral = false;
    if (listing.requiredLanguages.length === 0) {
      points = max;
      neutral = true;
    } else {
      const met = listing.requiredLanguages.filter((req) =>
        applicant.languages.some(
          (l) => l.language === req.language && LANGUAGE_LEVEL_RANK[l.level] >= LANGUAGE_LEVEL_RANK[req.minLevel]
        )
      );
      points = (met.length / listing.requiredLanguages.length) * max;
    }
    factors.push({
      key: "languages",
      label: "Language requirements",
      points: Math.round(points),
      max,
      neutral,
      positiveNote: "meets the language requirements",
      negativeNote: "may not meet the language requirements",
    });
  }

  // --- Required education level (6) ---
  {
    const max = 6;
    const required = EDUCATION_LEVEL_RANK[listing.requiredEducationLevel];
    const applicantRank = highestEducationRank(applicant.education);
    let points: number;
    let neutral = false;
    if (applicantRank < 0) {
      points = max * 0.4;
      neutral = true;
    } else if (applicantRank >= required) {
      points = max;
    } else if (applicantRank === required - 1) {
      points = max * 0.5;
    } else {
      points = 0;
    }
    factors.push({
      key: "educationLevel",
      label: "Education level",
      points: Math.round(points),
      max,
      neutral,
      positiveNote: "meets the required education level",
      negativeNote: "below the education level this role asks for",
    });
  }

  // --- Citizenship / work-authorization eligibility (8) ---
  {
    const max = 8;
    const points = eligibility.level === "ok" ? max : eligibility.level === "review" ? max * 0.5 : 0;
    factors.push({
      key: "eligibility",
      label: "Eligibility",
      points: Math.round(points),
      max,
      neutral: false,
      positiveNote: "you're eligible to apply",
      negativeNote: "eligibility looks like a real hurdle here",
    });
  }

  // --- Career interests / industries (5) ---
  {
    const max = 5;
    let points: number;
    let neutral = false;
    if (listing.industries.length === 0 || applicant.interests.length === 0) {
      points = max * 0.5;
      neutral = true;
    } else {
      const overlap = applicant.interests.filter((i) => listing.industries.includes(i));
      points = Math.min(overlap.length * 3, max);
    }
    factors.push({
      key: "interests",
      label: "Career interests",
      points: Math.round(points),
      max,
      neutral,
      positiveNote: "aligns with your stated interests",
      negativeNote: "isn't an obvious fit for your stated interests",
    });
  }

  // --- Preferred qualifications (3) ---
  {
    const max = 3;
    let points: number;
    let neutral = false;
    if (listing.preferredQualifications.length === 0) {
      points = max;
      neutral = true;
    } else {
      const overlap = applicant.qualifications.filter((q) => listing.preferredQualifications.includes(q));
      points = (overlap.length / listing.preferredQualifications.length) * max;
    }
    factors.push({
      key: "qualifications",
      label: "Preferred qualifications",
      points: Math.round(points),
      max,
      neutral,
      positiveNote: "matches preferred qualifications",
      negativeNote: "missing some of the preferred qualifications",
    });
  }

  const total = factors.reduce((sum, f) => sum + f.points, 0);

  return {
    total,
    factors: factors.map(({ positiveNote, negativeNote, ...f }) => f),
    explanation: buildExplanation(factors, total),
  };
}

function buildExplanation(factors: FactorDef[], total: number): string {
  const scored = factors.filter((f) => !f.neutral);

  const strengths = [...scored]
    .filter((f) => f.points / f.max >= 0.75)
    .sort((a, b) => b.points / b.max - a.points / a.max)
    .slice(0, 2)
    .map((f) => f.positiveNote);

  const gaps = [...scored]
    .filter((f) => f.points / f.max < 0.4)
    .sort((a, b) => a.points / a.max - b.points / b.max)
    .slice(0, 1)
    .map((f) => f.negativeNote);

  if (strengths.length === 0 && gaps.length === 0) {
    if (total >= 60) return "A reasonable overall fit, without one factor standing out strongly either way.";
    return "Limited overlap with this listing's requirements right now — worth a look if you're still interested.";
  }

  let sentence = "";
  if (strengths.length > 0) {
    sentence += capitalize(joinWithAnd(strengths)) + ".";
  } else {
    sentence += "Nothing stands out as an especially strong match here.";
  }
  if (gaps.length > 0) {
    sentence += ` ${capitalize(gaps[0])}.`;
  }
  return sentence;
}

function joinWithAnd(items: string[]): string {
  if (items.length === 1) return items[0];
  return `${items[0]} and ${items[1]}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
