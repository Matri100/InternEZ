import { describe, expect, it } from "vitest";
import { computeMatch } from "./matching.js";
import type { Applicant, EligibilityResult, Listing } from "../types/domain.js";

function makeApplicant(overrides: Partial<Applicant> = {}): Applicant {
  return {
    id: "a1",
    name: "Test Applicant",
    email: "a@test.dev",
    phone: "",
    portfolioUrl: "",
    citizenship: null,
    secondCitizenship: null,
    placeOfBirth: null,
    residence: null,
    education: [],
    workExperience: [],
    projects: [],
    certifications: [],
    documents: [],
    availableFrom: "",
    preferredLength: null,
    workArrangementPreference: [],
    preferredLocations: [],
    languages: [],
    skills: [],
    interests: [],
    qualifications: [],
    summary: "",
    coverLetterPrompts: { whyThisField: "", provenStrength: "", workingStyle: "", careerGoals: "" },
    profileComplete: true,
    discoverable: false,
    ...overrides,
  };
}

function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "l1",
    companyId: "c1",
    createdAt: new Date().toISOString(),
    title: "Software Engineering Intern",
    location: "Berlin",
    country: "DE",
    origin: "direct",
    department: "Engineering",
    workArrangement: "Hybrid",
    requiredEducationLevel: "Bachelor",
    duration: "6 months",
    startDate: "flexible",
    startLabel: "",
    endLabel: "",
    compensation: "",
    applicationDeadline: "",
    description: "",
    language: "English",
    applyUrl: "",
    requirements: [],
    skills: [],
    targetFields: [],
    requiredLanguages: [],
    industries: [],
    preferredQualifications: [],
    eligibility: {},
    extraQuestions: [],
    ...overrides,
  };
}

const OK: EligibilityResult = { level: "ok", why: "", reason: { code: "noRestriction" } };
const BLOCKED: EligibilityResult = { level: "blocked", why: "", reason: { code: "regionBlocked" } };

describe("computeMatch", () => {
  it("gives full field-of-study points when primary education field matches a target field", () => {
    const applicant = makeApplicant({
      education: [{ id: "e1", applicantId: "a1", level: "Bachelor", institution: "TUM", country: "DE", field: "Computer Science", startYear: "2020", endYear: "2024" }],
    });
    const listing = makeListing({ targetFields: ["Computer Science"] });
    const result = computeMatch(applicant, listing, OK);
    const field = result.factors.find((f) => f.key === "field")!;
    expect(field.points).toBe(field.max);
  });

  it("caps skills points at the factor max rather than scaling unbounded", () => {
    const applicant = makeApplicant({ skills: ["React", "TypeScript", "Node.js", "SQL", "Docker", "Python"] });
    const listing = makeListing({ skills: ["React", "TypeScript", "Node.js", "SQL", "Docker", "Python"] });
    const result = computeMatch(applicant, listing, OK);
    const skills = result.factors.find((f) => f.key === "skills")!;
    expect(skills.points).toBe(skills.max);
  });

  it("gives full availability points when the listing start date is flexible regardless of applicant availability", () => {
    const applicant = makeApplicant({ availableFrom: "" });
    const listing = makeListing({ startDate: "flexible" });
    const result = computeMatch(applicant, listing, OK);
    const availability = result.factors.find((f) => f.key === "availability")!;
    expect(availability.points).toBe(availability.max);
  });

  it("zeroes the eligibility factor when eligibility is blocked", () => {
    const listing = makeListing();
    const okResult = computeMatch(makeApplicant(), listing, OK);
    const blockedResult = computeMatch(makeApplicant(), listing, BLOCKED);
    const okEligibility = okResult.factors.find((f) => f.key === "eligibility")!;
    const blockedEligibility = blockedResult.factors.find((f) => f.key === "eligibility")!;
    expect(okEligibility.points).toBe(okEligibility.max);
    expect(blockedEligibility.points).toBe(0);
  });

  it("names the factors its explanation was built from, so it can be worded in any language", () => {
    const applicant = makeApplicant({
      skills: ["React", "TypeScript", "Node.js", "SQL", "Docker", "Python"],
      education: [{ id: "e1", applicantId: "a1", level: "Bachelor", institution: "TUM", country: "DE", field: "Computer Science", startYear: "2020", endYear: "2024" }],
    });
    const listing = makeListing({ targetFields: ["Computer Science"], skills: ["React", "TypeScript", "Node.js", "SQL", "Docker", "Python"] });
    const result = computeMatch(applicant, listing, BLOCKED);
    expect(result.strengths).toEqual(["field", "skills"]);
    expect(result.gaps).toEqual(["eligibility"]);
    expect(result.explanation).toBe(
      "A strong academic background match and relevant technical skills. Eligibility looks like a real hurdle here."
    );
  });

  it("total is the sum of all factor points and stays within 0-100", () => {
    const applicant = makeApplicant({
      skills: ["React"],
      education: [{ id: "e1", applicantId: "a1", level: "Bachelor", institution: "TUM", country: "DE", field: "Computer Science", startYear: "2020", endYear: "2024" }],
    });
    const listing = makeListing({ skills: ["React"], targetFields: ["Computer Science"] });
    const result = computeMatch(applicant, listing, OK);
    const sum = result.factors.reduce((s, f) => s + f.points, 0);
    expect(result.total).toBe(sum);
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
  });
});
