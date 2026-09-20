// Runs once, only against an empty database — inserts the reference
// companies/listings every account can browse, plus two demo accounts
// (one applicant, one company) so the app is fully explorable immediately
// after a fresh install, without anyone having to sign up first.
import { randomUUID } from "node:crypto";
import { sqlite } from "./database.js";
import { db } from "../models/store.js";
import { hashPassword } from "../services/passwords.js";
import { companies, listings } from "../data/seed.js";
import type { Applicant } from "../types/domain.js";

export const DEMO_APPLICANT_EMAIL = "demo.applicant@internez.eu";
export const DEMO_COMPANY_EMAIL = "demo.company@internez.eu";
export const DEMO_PASSWORD = "Demo1234!";

const DEMO_APPLICANT_ID = "demo_applicant";
const DEMO_COMPANY_ID = "co_nordwind"; // owns the seeded Nordwind listings

export async function seedIfEmpty(): Promise<void> {
  const userCount = (sqlite.prepare(`SELECT COUNT(*) AS n FROM users`).get() as { n: number }).n;
  if (userCount > 0) return;

  for (const company of companies) {
    await db.saveCompany(company.id, {
      name: company.name,
      verified: company.verified,
      logoUrl: company.logoUrl,
      description: company.description,
      website: company.website,
      headquarters: company.headquarters,
      companySize: company.companySize,
    });
  }

  const insertListing = sqlite.prepare(
    `INSERT INTO listings (
      id, company_id, created_at, title, location, country, origin, department, work_arrangement,
      required_education_level, duration, start_date, start_label, end_label, compensation,
      application_deadline, description, requirements, skills, target_fields, required_languages,
      industries, preferred_qualifications, eligibility, extra_questions
    ) VALUES (@id, @companyId, @createdAt, @title, @location, @country, @origin, @department, @workArrangement,
      @requiredEducationLevel, @duration, @startDate, @startLabel, @endLabel, @compensation,
      @applicationDeadline, @description, @requirements, @skills, @targetFields, @requiredLanguages,
      @industries, @preferredQualifications, @eligibility, @extraQuestions)`
  );
  for (const listing of listings) {
    insertListing.run({
      id: listing.id,
      companyId: listing.companyId,
      createdAt: listing.createdAt,
      title: listing.title,
      location: listing.location,
      country: listing.country,
      origin: listing.origin,
      department: listing.department,
      workArrangement: listing.workArrangement,
      requiredEducationLevel: listing.requiredEducationLevel,
      duration: listing.duration,
      startDate: listing.startDate,
      startLabel: listing.startLabel,
      endLabel: listing.endLabel,
      compensation: listing.compensation,
      applicationDeadline: listing.applicationDeadline,
      description: listing.description,
      requirements: JSON.stringify(listing.requirements),
      skills: JSON.stringify(listing.skills),
      targetFields: JSON.stringify(listing.targetFields),
      requiredLanguages: JSON.stringify(listing.requiredLanguages),
      industries: JSON.stringify(listing.industries),
      preferredQualifications: JSON.stringify(listing.preferredQualifications),
      eligibility: JSON.stringify(listing.eligibility),
      extraQuestions: JSON.stringify(listing.extraQuestions),
    });
  }

  // --- demo company account, reusing Nordwind's id so it owns real listings ---
  await db.createUser({
    id: DEMO_COMPANY_ID,
    email: DEMO_COMPANY_EMAIL,
    passwordHash: hashPassword(DEMO_PASSWORD),
    role: "company",
  });

  // --- demo applicant account, pre-filled so the product is explorable immediately ---
  await db.createUser({
    id: DEMO_APPLICANT_ID,
    email: DEMO_APPLICANT_EMAIL,
    passwordHash: hashPassword(DEMO_PASSWORD),
    role: "applicant",
  });

  const demoApplicant: Omit<
    Applicant,
    "id" | "education" | "workExperience" | "projects" | "certifications" | "documents"
  > = {
    name: "Elena Kowalski",
    email: DEMO_APPLICANT_EMAIL,
    phone: "+48 600 123 456",
    portfolioUrl: "https://elenakowalski.dev",
    citizenship: "PL",
    secondCitizenship: "DE",
    placeOfBirth: "PL",
    residence: "PL",
    availableFrom: "2026-02",
    preferredLength: "6 months",
    workArrangementPreference: ["On-site", "Hybrid"],
    preferredLocations: ["DK", "DE", "NL"],
    languages: [
      { language: "English", level: "Fluent" },
      { language: "Polish", level: "Native" },
    ],
    skills: ["Python", "C++", "React", "Machine Learning", "SQL", "TypeScript"],
    interests: ["Robotics", "AI / Machine Learning"],
    qualifications: [],
    summary:
      "Computer science student focused on robotics perception and machine learning, with hands-on project experience in Python and C++.",
    coverLetterPrompts: {
      whyThisField: "I've always liked the point where software meets something physical — robotics is that, exactly.",
      provenStrength: "Built a perception pipeline for a warehouse robot as a course capstone; it went from a prototype that lost track of boxes half the time to one reliable enough that our professor used it as the department's demo.",
      workingStyle: "I dig into the failure case nobody else wants to debug, and I write down what I find so the next person doesn't have to rediscover it.",
      careerGoals: "I want real production code experience — not another simulation — before I decide between an ML-heavy path and a more classical robotics one.",
    },
    profileComplete: true,
    discoverable: true,
  };
  await db.saveApplicant(DEMO_APPLICANT_ID, demoApplicant);
  await db.setEducation(DEMO_APPLICANT_ID, [
    {
      level: "Bachelor",
      institution: "University of Warsaw",
      country: "PL",
      field: "Computer Science",
      startYear: "2022",
      endYear: "2026",
    },
  ]);
  await db.setWorkExperience(DEMO_APPLICANT_ID, [
    {
      title: "Software Engineering Intern",
      organization: "LocalTech Sp. z o.o.",
      field: "Computer Science",
      startDate: "2025-06",
      endDate: "2025-09",
      skills: ["Python", "SQL"],
    },
  ]);
  await db.setProjects(DEMO_APPLICANT_ID, [
    {
      title: "Warehouse Robot Path Planner",
      description: "An A*-based path planning simulator for warehouse robots, built in Python.",
      link: "",
      skills: ["Python", "Machine Learning"],
    },
  ]);

  // A sample application, so Applications/Applicants pages aren't empty either.
  await db.createApplication({
    applicantId: DEMO_APPLICANT_ID,
    listingId: "l_nordwind_swe",
    overridden: false,
    answers: [
      {
        key: "why_robotics",
        answer:
          "I love the intersection of software and the physical world — robotics is where my ML and systems interests actually meet.",
      },
      { key: "relocation_ok", answer: "Yes" },
    ],
  });

  console.log(`Seeded database with demo accounts:
  Applicant — ${DEMO_APPLICANT_EMAIL} / ${DEMO_PASSWORD}
  Company   — ${DEMO_COMPANY_EMAIL} / ${DEMO_PASSWORD}`);
}
