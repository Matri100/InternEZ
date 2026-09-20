import { describe, expect, it } from "vitest";
import { buildAutofillProfile } from "./autofill.js";
import type { Applicant, VoluntaryDisclosures } from "../types/domain.js";

function makeApplicant(overrides: Partial<Applicant> = {}): Applicant {
  return {
    id: "a1",
    name: "Elena Kowalski",
    email: "elena@test.dev",
    phone: "+48 600 123 456",
    portfolioUrl: "https://elenakowalski.dev",
    citizenship: "PL",
    secondCitizenship: null,
    placeOfBirth: "PL",
    residence: "PL",
    education: [],
    workExperience: [],
    projects: [],
    certifications: [],
    documents: [],
    availableFrom: "2026-06",
    preferredLength: null,
    workArrangementPreference: [],
    preferredLocations: [],
    languages: [],
    skills: ["Python", "React"],
    interests: [],
    qualifications: [],
    summary: "A short summary.",
    coverLetterPrompts: { whyThisField: "", provenStrength: "", workingStyle: "", careerGoals: "" },
    profileComplete: true,
    discoverable: false,
    ...overrides,
  };
}

describe("buildAutofillProfile", () => {
  it("splits a full name into first/last", () => {
    const profile = buildAutofillProfile(makeApplicant({ name: "Elena Maria Kowalski" }));
    expect(profile.firstName).toBe("Elena");
    expect(profile.lastName).toBe("Maria Kowalski");
  });

  it("handles a single-word name without crashing", () => {
    const profile = buildAutofillProfile(makeApplicant({ name: "Prince" }));
    expect(profile.firstName).toBe("Prince");
    expect(profile.lastName).toBe("");
  });

  it("handles a blank name", () => {
    const profile = buildAutofillProfile(makeApplicant({ name: "" }));
    expect(profile.firstName).toBe("");
    expect(profile.lastName).toBe("");
  });

  it("picks the highest-ranked education entry as primary", () => {
    const profile = buildAutofillProfile(
      makeApplicant({
        education: [
          { id: "e1", applicantId: "a1", level: "Bachelor", institution: "TU Berlin", country: "DE", field: "CS", startYear: "2018", endYear: "2022" },
          { id: "e2", applicantId: "a1", level: "Master", institution: "TU Munich", country: "DE", field: "Robotics", startYear: "2022", endYear: "2024" },
        ],
      })
    );
    expect(profile.university).toBe("TU Munich");
    expect(profile.educationLevel).toBe("Master");
    expect(profile.graduationYear).toBe("2024");
  });

  it("picks the work experience entry that's still ongoing (Present) over a finished one", () => {
    const profile = buildAutofillProfile(
      makeApplicant({
        workExperience: [
          { id: "w1", applicantId: "a1", title: "Intern", organization: "OldCo", field: "CS", startDate: "2021-01", endDate: "2021-06", skills: [] },
          { id: "w2", applicantId: "a1", title: "Working Student", organization: "NewCo", field: "CS", startDate: "2023-01", endDate: "Present", skills: [] },
        ],
      })
    );
    expect(profile.currentOrLatestEmployer).toBe("NewCo");
    expect(profile.currentOrLatestJobTitle).toBe("Working Student");
  });

  it("resolves country codes to readable names", () => {
    const profile = buildAutofillProfile(makeApplicant({ citizenship: "DE", residence: "FR" }));
    expect(profile.citizenship).toBe("Germany");
    expect(profile.residenceCountry).toBe("France");
  });

  it("joins both citizenships when a second one is set", () => {
    const profile = buildAutofillProfile(makeApplicant({ citizenship: "PL", secondCitizenship: "DE" }));
    expect(profile.citizenship).toBe("Poland, Germany");
  });

  it("falls back to just the second citizenship when the first isn't set", () => {
    const profile = buildAutofillProfile(makeApplicant({ citizenship: null, secondCitizenship: "DE" }));
    expect(profile.citizenship).toBe("Germany");
  });

  it("joins skills into a comma-separated string", () => {
    const profile = buildAutofillProfile(makeApplicant({ skills: ["Python", "SQL", "React"] }));
    expect(profile.skills).toBe("Python, SQL, React");
  });

  it("leaves education/work fields blank rather than throwing when the applicant has none", () => {
    const profile = buildAutofillProfile(makeApplicant({ education: [], workExperience: [] }));
    expect(profile.university).toBe("");
    expect(profile.currentOrLatestEmployer).toBe("");
  });
});

function disclosures(overrides: Partial<VoluntaryDisclosures> = {}): VoluntaryDisclosures {
  return {
    genderIdentity: "Woman",
    raceEthnicity: "Asian",
    veteranStatus: "Prefer not to say",
    disabilityStatus: "No, I do not have a disability",
    consentToAutofill: true,
    ...overrides,
  };
}

describe("buildAutofillProfile — voluntary self-identification", () => {
  it("omits the disclosure fields entirely when no disclosures record is passed", () => {
    const profile = buildAutofillProfile(makeApplicant());
    expect(profile.genderIdentity).toBeUndefined();
    expect(profile.raceEthnicity).toBeUndefined();
    expect(profile.veteranStatus).toBeUndefined();
    expect(profile.disabilityStatus).toBeUndefined();
  });

  it("omits the disclosure fields when the applicant filled them in but withheld autofill consent", () => {
    const profile = buildAutofillProfile(makeApplicant(), disclosures({ consentToAutofill: false }));
    expect(profile.genderIdentity).toBeUndefined();
    expect(profile.raceEthnicity).toBeUndefined();
    expect(profile.veteranStatus).toBeUndefined();
    expect(profile.disabilityStatus).toBeUndefined();
  });

  it("includes the disclosure fields only once the applicant has both filled them in and consented", () => {
    const profile = buildAutofillProfile(makeApplicant(), disclosures());
    expect(profile.genderIdentity).toBe("Woman");
    expect(profile.raceEthnicity).toBe("Asian");
    expect(profile.veteranStatus).toBe("Prefer not to say");
    expect(profile.disabilityStatus).toBe("No, I do not have a disability");
  });

  it("omits an individual field left blank even when consent is on", () => {
    const profile = buildAutofillProfile(makeApplicant(), disclosures({ raceEthnicity: "" }));
    expect(profile.genderIdentity).toBe("Woman");
    expect(profile.raceEthnicity).toBeUndefined();
  });
});
