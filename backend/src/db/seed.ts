// Runs once, only against an empty database — inserts two demo accounts
// (one applicant, one company) so the app is explorable immediately after
// a fresh install, without anyone having to sign up first.
import { pool } from "./database.js";
import { db } from "../models/store.js";
import { hashPassword } from "../services/passwords.js";
import type { Applicant } from "../types/domain.js";

export const DEMO_APPLICANT_EMAIL = "demo.applicant@internez.eu";
export const DEMO_COMPANY_EMAIL = "demo.company@internez.eu";
export const DEMO_PASSWORD = "Demo1234!";

const DEMO_APPLICANT_ID = "demo_applicant";
// Kept from when the demo company was the fictional "Nordwind Robotics" —
// production's existing demo login is this id (renamed in database.ts).
const DEMO_COMPANY_ID = "co_nordwind";

export async function seedIfEmpty(): Promise<void> {
  const { rows } = await pool.query(`SELECT COUNT(*) AS n FROM users`);
  if (Number(rows[0].n) > 0) return;

  // Real listings come from the ingestion feed (services/ingestion/), not
  // the seed — the demo company exists only as a login for trying the
  // company side, and owns no listings until one is posted from it.
  await db.saveCompany(DEMO_COMPANY_ID, {
    name: "InternEZ Demo Company",
    verified: false,
    logoUrl: null,
    description: "Demo account for trying the company side of InternEZ.",
    website: "",
    headquarters: null,
    companySize: null,
  });

  // --- demo company account ---
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

  console.log(`Seeded database with demo accounts:
  Applicant — ${DEMO_APPLICANT_EMAIL} / ${DEMO_PASSWORD}
  Company   — ${DEMO_COMPANY_EMAIL} / ${DEMO_PASSWORD}`);
}
