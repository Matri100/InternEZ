import { describe, expect, it } from "vitest";
import { computeEligibility } from "./eligibility.js";
import type { Applicant } from "../types/domain.js";

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

describe("computeEligibility", () => {
  it("is ok with no restrictions at all", () => {
    const result = computeEligibility(makeApplicant(), {});
    expect(result.level).toBe("ok");
  });

  describe("citizenOnly rule", () => {
    it("is ok when citizenship matches and no clearance is required", () => {
      const result = computeEligibility(makeApplicant({ citizenship: "DE" }), { citizenOnly: "DE" });
      expect(result.level).toBe("ok");
    });

    it("is review when citizenship matches but clearance can't be confirmed", () => {
      const result = computeEligibility(makeApplicant({ citizenship: "DE" }), { citizenOnly: "DE", clearance: true });
      expect(result.level).toBe("review");
    });

    it("is blocked when citizenship doesn't match", () => {
      const result = computeEligibility(makeApplicant({ citizenship: "FR" }), { citizenOnly: "DE" });
      expect(result.level).toBe("blocked");
      expect(result.reason).toEqual({ code: "citizenOnlyBlocked", country: "DE" });
    });

    it("is ok when the SECOND citizenship matches, not just the first", () => {
      const result = computeEligibility(makeApplicant({ citizenship: "FR", secondCitizenship: "DE" }), {
        citizenOnly: "DE",
      });
      expect(result.level).toBe("ok");
    });
  });

  describe("allowedRegions rule", () => {
    it("is ok when citizenship falls within the allowed region", () => {
      const result = computeEligibility(makeApplicant({ citizenship: "DE" }), { allowedRegions: ["EU"] });
      expect(result.level).toBe("ok");
    });

    it("is ok via a second citizenship alone, with no first citizenship set", () => {
      const result = computeEligibility(makeApplicant({ citizenship: null, secondCitizenship: "DE" }), {
        allowedRegions: ["EU"],
      });
      expect(result.level).toBe("ok");
    });

    it("is review when only an indirect pathway (residence) connects to the region", () => {
      const result = computeEligibility(makeApplicant({ citizenship: null, residence: "FR" }), {
        allowedRegions: ["EU"],
      });
      expect(result.level).toBe("review");
    });

    it("is review when only education connects to the region", () => {
      const result = computeEligibility(
        makeApplicant({
          citizenship: null,
          education: [
            { id: "e1", applicantId: "a1", level: "Bachelor", institution: "TU Berlin", country: "DE", field: "CS", startYear: "2020", endYear: "2024" },
          ],
        }),
        { allowedRegions: ["EU"] }
      );
      expect(result.level).toBe("review");
      // The frontend words this in the interface language from these fields.
      expect(result.reason).toEqual({ code: "pathway", via: "education", institution: "TU Berlin", country: "DE" });
    });

    it("is blocked when nothing in the profile connects to the region", () => {
      const result = computeEligibility(makeApplicant(), { allowedRegions: ["EU"] });
      expect(result.level).toBe("blocked");
    });
  });
});
