import type {
  Applicant,
  AutofillProfile,
  EducationEntry,
  VoluntaryDisclosures,
  WorkExperienceEntry,
} from "../types/domain.js";
import { countryName, EDUCATION_LEVEL_RANK } from "../data/reference.js";

function primaryEducation(entries: EducationEntry[]): EducationEntry | null {
  if (entries.length === 0) return null;
  return entries.reduce((best, e) => (EDUCATION_LEVEL_RANK[e.level] > EDUCATION_LEVEL_RANK[best.level] ? e : best));
}

// "Latest" by end date — "Present" sorts last since it's lexically greater
// than any YYYY-MM date, which is exactly the entry a form asking for
// "current employer" wants.
function latestWorkExperience(entries: WorkExperienceEntry[]): WorkExperienceEntry | null {
  if (entries.length === 0) return null;
  return entries.reduce((best, w) => (w.endDate >= best.endDate ? w : best));
}

function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

// Flattens the applicant's structured profile into the plain-text shape a
// third-party application form actually asks for. Deliberately lossy —
// this is what gets typed into someone else's text inputs, not a full data
// export (see profileRouter.get("/export") for that).
//
// `disclosures` is optional and, even when given, only makes it into the
// result if consentToAutofill is true — filling in the voluntary
// self-identification section does not by itself authorize handing that
// data to the extension; see VoluntaryDisclosures in types/domain.ts.
export function buildAutofillProfile(applicant: Applicant, disclosures?: VoluntaryDisclosures | null): AutofillProfile {
  const { first, last } = splitName(applicant.name);
  const education = primaryEducation(applicant.education);
  const work = latestWorkExperience(applicant.workExperience);

  const profile: AutofillProfile = {
    firstName: first,
    lastName: last,
    fullName: applicant.name,
    email: applicant.email,
    phone: applicant.phone,
    linkedinOrPortfolio: applicant.portfolioUrl,
    // Joined rather than just the first — a free-text field benefits from
    // seeing both; a real <select> safely won't match a joined string
    // (findBestOptionValue degrades to leaving it untouched, not a wrong
    // pick), so there's no downside to including both here.
    citizenship: [applicant.citizenship, applicant.secondCitizenship]
      .filter(Boolean)
      .map((c) => countryName(c))
      .join(", "),
    residenceCountry: countryName(applicant.residence),
    university: education?.institution ?? "",
    educationLevel: education?.level ?? "",
    fieldOfStudy: education?.field ?? "",
    graduationYear: education?.endYear ?? "",
    currentOrLatestJobTitle: work?.title ?? "",
    currentOrLatestEmployer: work?.organization ?? "",
    skills: applicant.skills.join(", "),
    summary: applicant.summary,
    availableFrom: applicant.availableFrom,
  };

  if (disclosures?.consentToAutofill) {
    if (disclosures.genderIdentity) profile.genderIdentity = disclosures.genderIdentity;
    if (disclosures.raceEthnicity) profile.raceEthnicity = disclosures.raceEthnicity;
    if (disclosures.veteranStatus) profile.veteranStatus = disclosures.veteranStatus;
    if (disclosures.disabilityStatus) profile.disabilityStatus = disclosures.disabilityStatus;
  }

  return profile;
}
