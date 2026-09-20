import { describe, expect, it } from "vitest";
import {
  matchFieldToProfileKey,
  buildFillPlan,
  findBestOptionValue,
  findDeclineOptionValue,
  normalizeLabel,
} from "./fieldMatcher.js";

const PROFILE = {
  firstName: "Elena",
  lastName: "Kowalski",
  fullName: "Elena Kowalski",
  email: "elena@test.dev",
  phone: "+48 600 123 456",
  linkedinOrPortfolio: "https://elenakowalski.dev",
  citizenship: "Poland",
  residenceCountry: "Poland",
  university: "University of Warsaw",
  educationLevel: "Bachelor",
  fieldOfStudy: "Computer Science",
  graduationYear: "2026",
  currentOrLatestJobTitle: "Software Engineering Intern",
  currentOrLatestEmployer: "LocalTech Sp. z o.o.",
  skills: "Python, React",
  summary: "A short summary.",
  availableFrom: "2026-02",
};

describe("normalizeLabel", () => {
  it("lowercases, strips punctuation, and collapses whitespace", () => {
    expect(normalizeLabel("First Name*")).toBe("first name");
    expect(normalizeLabel("first_name")).toBe("first name");
    expect(normalizeLabel("  First   Name  ")).toBe("first name");
  });
});

describe("matchFieldToProfileKey", () => {
  it("matches common field label variants to the right profile key", () => {
    const cases = [
      [{ label: "First Name" }, "firstName"],
      [{ label: "Last Name" }, "lastName"],
      [{ name: "surname" }, "lastName"],
      [{ label: "Email Address" }, "email"],
      [{ placeholder: "you@example.com" }, null], // placeholder alone with no keyword shouldn't match
      [{ label: "Phone Number" }, "phone"],
      [{ label: "LinkedIn Profile" }, "linkedinOrPortfolio"],
      [{ label: "University" }, "university"],
      [{ label: "Field of Study / Major" }, "fieldOfStudy"],
      [{ label: "Current Employer" }, "currentOrLatestEmployer"],
      [{ id: "cover-letter" }, "summary"],
      [{ label: "Full Name" }, "fullName"],
    ];
    for (const [descriptor, expected] of cases) {
      expect(matchFieldToProfileKey(descriptor)).toBe(expected);
    }
  });

  it("prefers first/last name over the generic full-name fallback", () => {
    expect(matchFieldToProfileKey({ label: "First Name" })).toBe("firstName");
    expect(matchFieldToProfileKey({ label: "Last Name" })).toBe("lastName");
  });

  it("never maps a login/account username field to the applicant's real name", () => {
    expect(matchFieldToProfileKey({ label: "Username" })).toBeNull();
    expect(matchFieldToProfileKey({ name: "user_name" })).toBeNull();
  });

  it("doesn't mistake a company-name field for the applicant's own name", () => {
    expect(matchFieldToProfileKey({ label: "Company Name" })).toBe("currentOrLatestEmployer");
  });

  // Regression test — found live on a real Scale AI Greenhouse application:
  // a yes/no availability *confirmation* question isn't a start-date field,
  // even though it happens to contain the word "availability".
  it("doesn't mistake a long availability-confirmation question for a start-date field", () => {
    expect(
      matchFieldToProfileKey({ label: "I confirm my availability for a Summer 2027 (May/June starts) internship" })
    ).toBeNull();
    expect(matchFieldToProfileKey({ label: "Available From" })).toBe("availableFrom");
  });

  it("matches Greenhouse's 'End date year' education field to graduation year", () => {
    expect(matchFieldToProfileKey({ label: "End date year" })).toBe("graduationYear");
  });

  // Regression tests — the real Scale AI education section just says
  // "Degree" and "School", not "Degree Level" / "School Name". The longer
  // phrases alone don't cover real-world terse labels like these.
  it("matches a bare 'Degree' select to education level, not field of study", () => {
    expect(matchFieldToProfileKey({ label: "Degree" })).toBe("educationLevel");
  });

  it("still prefers field of study over education level when a field says 'Degree Field'", () => {
    expect(matchFieldToProfileKey({ label: "Degree Field" })).toBe("fieldOfStudy");
  });

  it("matches a bare 'School' field to university", () => {
    expect(matchFieldToProfileKey({ label: "School" })).toBe("university");
  });

  it("returns null for a field with no recognizable signal", () => {
    expect(matchFieldToProfileKey({ label: "Referral code" })).toBeNull();
    expect(matchFieldToProfileKey({})).toBeNull();
  });
});

describe("buildFillPlan", () => {
  it("fills matching empty fields from the profile", () => {
    const descriptors = [
      { label: "First Name", hasValue: false },
      { label: "Last Name", hasValue: false },
      { label: "Email", hasValue: false },
      { label: "Referral code", hasValue: false },
    ];
    const plan = buildFillPlan(descriptors, PROFILE);
    expect(plan).toEqual([
      { index: 0, profileKey: "firstName", value: "Elena" },
      { index: 1, profileKey: "lastName", value: "Kowalski" },
      { index: 2, profileKey: "email", value: "elena@test.dev" },
    ]);
  });

  it("never overwrites a field that already has a value", () => {
    const descriptors = [{ label: "First Name", hasValue: true }];
    expect(buildFillPlan(descriptors, PROFILE)).toEqual([]);
  });

  it("skips a matched field when the profile has nothing to put there", () => {
    const descriptors = [{ label: "LinkedIn Profile", hasValue: false }];
    const sparseProfile = { ...PROFILE, linkedinOrPortfolio: "" };
    expect(buildFillPlan(descriptors, sparseProfile)).toEqual([]);
  });

  it("resolves a <select> field to the matching option's value, not the raw profile string", () => {
    const descriptors = [
      {
        label: "Degree",
        hasValue: false,
        options: [
          { value: "", text: "Select..." },
          { value: "opt_1", text: "Associate's Degree" },
          { value: "opt_2", text: "Bachelor's Degree" },
          { value: "opt_3", text: "Master's Degree" },
        ],
      },
    ];
    const plan = buildFillPlan(descriptors, PROFILE);
    expect(plan).toEqual([{ index: 0, profileKey: "educationLevel", value: "opt_2" }]);
  });

  it("leaves a <select> untouched when none of its options resemble the profile value", () => {
    const descriptors = [
      {
        label: "Degree",
        hasValue: false,
        options: [
          { value: "opt_1", text: "High School Diploma" },
          { value: "opt_2", text: "PhD" },
        ],
      },
    ];
    // PROFILE.educationLevel is "Bachelor" — neither option resembles it.
    expect(buildFillPlan(descriptors, PROFILE)).toEqual([]);
  });
});

describe("findBestOptionValue", () => {
  const DEGREE_OPTIONS = [
    { value: "hs", text: "High School" },
    { value: "assoc", text: "Associate's Degree" },
    { value: "bach", text: "Bachelor's Degree" },
    { value: "mast", text: "Master's Degree" },
    { value: "phd", text: "PhD" },
  ];

  it("finds the option whose text contains the profile value", () => {
    expect(findBestOptionValue(DEGREE_OPTIONS, "Bachelor")).toBe("bach");
    expect(findBestOptionValue(DEGREE_OPTIONS, "Master")).toBe("mast");
  });

  it("matches exactly (case/punctuation-insensitive) when available, over a looser containment match", () => {
    const options = [
      { value: "a", text: "PhD" },
      { value: "b", text: "PhD Candidate" },
    ];
    expect(findBestOptionValue(options, "PhD")).toBe("a");
  });

  it("returns null when nothing resembles the value, rather than guessing", () => {
    expect(findBestOptionValue(DEGREE_OPTIONS, "Vocational / Professional")).toBeNull();
  });

  it("returns null for an empty value or an empty option list", () => {
    expect(findBestOptionValue(DEGREE_OPTIONS, "")).toBeNull();
    expect(findBestOptionValue([], "Bachelor")).toBeNull();
  });
});

// Voluntary self-identification (EEO-style) fields. PROFILE above has none
// of these keys set, matching the common case: not filled in, or filled in
// without autofill consent — buildAutofillProfile omits the key entirely
// either way (see backend/src/services/autofill.test.ts), which is what
// buildFillPlan below is exercised against.
describe("matchFieldToProfileKey — voluntary self-identification", () => {
  it("matches real-world EEO field labels", () => {
    expect(matchFieldToProfileKey({ label: "Gender Identity" })).toBe("genderIdentity");
    expect(matchFieldToProfileKey({ label: "Gender" })).toBe("genderIdentity");
    expect(matchFieldToProfileKey({ label: "Race/Ethnicity" })).toBe("raceEthnicity");
    expect(matchFieldToProfileKey({ label: "Veteran Status" })).toBe("veteranStatus");
    expect(matchFieldToProfileKey({ label: "Disability Status" })).toBe("disabilityStatus");
  });
});

describe("findDeclineOptionValue", () => {
  const VETERAN_OPTIONS = [
    { value: "", text: "Please select" },
    { value: "not_vet", text: "I am not a protected veteran" },
    { value: "is_vet", text: "I identify as one or more classifications of a protected veteran" },
    { value: "decline", text: "I don't wish to answer" },
  ];

  it("finds an option phrased as declining to answer", () => {
    expect(findDeclineOptionValue(VETERAN_OPTIONS)).toBe("decline");
  });

  it("returns null when no option offers a decline-style choice", () => {
    const noDeclineOptions = [
      { value: "a", text: "Yes" },
      { value: "b", text: "No" },
    ];
    expect(findDeclineOptionValue(noDeclineOptions)).toBeNull();
  });
});

describe("buildFillPlan — voluntary self-identification decline fallback", () => {
  const GENDER_OPTIONS = [
    { value: "", text: "Select..." },
    { value: "man", text: "Man" },
    { value: "woman", text: "Woman" },
    { value: "decline", text: "Prefer not to say" },
  ];

  it("auto-selects the decline option when the applicant hasn't provided (or consented to share) a value", () => {
    // PROFILE.genderIdentity is undefined — not filled in, or no autofill consent.
    const descriptors = [{ label: "Gender Identity", hasValue: false, options: GENDER_OPTIONS }];
    expect(buildFillPlan(descriptors, PROFILE)).toEqual([{ index: 0, profileKey: "genderIdentity", value: "decline" }]);
  });

  it("uses the applicant's real answer instead of declining when one is present and consented", () => {
    const descriptors = [{ label: "Gender Identity", hasValue: false, options: GENDER_OPTIONS }];
    const consented = { ...PROFILE, genderIdentity: "Woman" };
    expect(buildFillPlan(descriptors, consented)).toEqual([{ index: 0, profileKey: "genderIdentity", value: "woman" }]);
  });

  it("falls back to declining when the real answer doesn't match any option on this particular form", () => {
    const descriptors = [{ label: "Gender Identity", hasValue: false, options: GENDER_OPTIONS }];
    const consented = { ...PROFILE, genderIdentity: "Non-binary" };
    expect(buildFillPlan(descriptors, consented)).toEqual([{ index: 0, profileKey: "genderIdentity", value: "decline" }]);
  });

  it("leaves the field untouched if the form has no decline-style option and no value is available", () => {
    const noDeclineOptions = [
      { value: "man", text: "Man" },
      { value: "woman", text: "Woman" },
    ];
    const descriptors = [{ label: "Gender Identity", hasValue: false, options: noDeclineOptions }];
    expect(buildFillPlan(descriptors, PROFILE)).toEqual([]);
  });

  it("does not apply the decline fallback to an ordinary (non-EEO) select, even if it happens to offer one", () => {
    // Regression guard: only the four EEO keys get the decline fallback.
    // This select matches to educationLevel (via the "Degree" label) and
    // happens to offer a "Prefer not to say" style option too, but
    // educationLevel isn't an EEO key, so it must stay untouched exactly
    // like it did before this feature existed — PROFILE.educationLevel is
    // "Bachelor", which none of these options resemble.
    const degreeOptionsWithDecline = [
      { value: "hs", text: "High School Diploma" },
      { value: "phd", text: "PhD" },
      { value: "decline", text: "Prefer not to say" },
    ];
    const descriptors = [{ label: "Degree", hasValue: false, options: degreeOptionsWithDecline }];
    expect(buildFillPlan(descriptors, PROFILE)).toEqual([]);
  });
});
