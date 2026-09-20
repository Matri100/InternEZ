import { Router } from "express";
import {
  REGIONS,
  EDUCATION_LEVELS,
  FIELD_GROUPS,
  FIELDS_OF_STUDY,
  INTERNSHIP_LENGTHS,
  WORK_ARRANGEMENTS,
  WORK_ARRANGEMENT_PREFERENCES,
  LANGUAGE_LEVELS,
  SKILL_GROUPS_ALL,
  SKILLS,
  LANGUAGES,
  INTERESTS,
  QUALIFICATIONS,
  DOCUMENT_KINDS,
  UNIVERSITIES,
  COMPANY_SIZES,
  GENDER_IDENTITY_OPTIONS,
  RACE_ETHNICITY_OPTIONS,
  VETERAN_STATUS_OPTIONS,
  DISABILITY_STATUS_OPTIONS,
} from "../data/reference.js";
import type { CountryCode } from "../types/domain.js";

export const referenceRouter = Router();

referenceRouter.get("/", (_req, res) => {
  res.json({
    regions: REGIONS,
    educationLevels: EDUCATION_LEVELS,
    fieldGroups: FIELD_GROUPS,
    fieldsOfStudy: FIELDS_OF_STUDY,
    internshipLengths: INTERNSHIP_LENGTHS,
    workArrangements: WORK_ARRANGEMENTS,
    workArrangementPreferences: WORK_ARRANGEMENT_PREFERENCES,
    languageLevels: LANGUAGE_LEVELS,
    skillGroups: SKILL_GROUPS_ALL,
    skills: SKILLS,
    languages: LANGUAGES,
    interests: INTERESTS,
    qualifications: QUALIFICATIONS,
    documentKinds: DOCUMENT_KINDS,
    companySizes: COMPANY_SIZES,
    genderIdentityOptions: GENDER_IDENTITY_OPTIONS,
    raceEthnicityOptions: RACE_ETHNICITY_OPTIONS,
    veteranStatusOptions: VETERAN_STATUS_OPTIONS,
    disabilityStatusOptions: DISABILITY_STATUS_OPTIONS,
    // Universities are ~5,500 records across 26 countries — fetched on demand
    // per country (see /universities/:country) instead of inlined here, so
    // the main reference payload stays small on first load.
  });
});

// Served separately from the ~5,500-strong universities dataset so a page
// load never has to pull every country's list just to show one country's.
referenceRouter.get("/universities/:country", (req, res) => {
  const country = req.params.country as CountryCode;
  res.json({ universities: UNIVERSITIES[country] ?? [] });
});
