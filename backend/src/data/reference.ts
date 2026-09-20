import type {
  CompanySize,
  CountryCode,
  DocumentKind,
  EducationLevel,
  FieldOfStudy,
  InternshipLength,
  LanguageLevel,
  RegionCode,
  WorkArrangement,
  WorkArrangementPreference,
} from "../types/domain.js";
import universitiesData from "./universities.json" with { type: "json" };
import onetSkillGroupsData from "./skill-groups-onet.json" with { type: "json" };
import onetCoreGroupsData from "./core-groups.json" with { type: "json" };

export interface RegionDef {
  code: RegionCode;
  name: string;
  countries: { code: CountryCode; name: string }[];
}

// A single region on purpose: InternEZ is EU/EEA (+ Switzerland) only, full
// stop. Keeping the RegionDef[]/RegionCode shape (rather than collapsing it
// away) means eligibility.ts and matching.ts, which are both written
// generically against "does this country belong to an allowed region",
// needed zero logic changes for this scope narrowing — only the data did.
export const REGIONS: RegionDef[] = [
  {
    code: "EU",
    name: "EU / EEA",
    countries: [
      { code: "AT", name: "Austria" },
      { code: "BE", name: "Belgium" },
      { code: "BG", name: "Bulgaria" },
      { code: "HR", name: "Croatia" },
      { code: "CY", name: "Cyprus" },
      { code: "CZ", name: "Czechia" },
      { code: "DK", name: "Denmark" },
      { code: "EE", name: "Estonia" },
      { code: "FI", name: "Finland" },
      { code: "FR", name: "France" },
      { code: "DE", name: "Germany" },
      { code: "GR", name: "Greece" },
      { code: "HU", name: "Hungary" },
      { code: "IS", name: "Iceland" },
      { code: "IE", name: "Ireland" },
      { code: "IT", name: "Italy" },
      { code: "LV", name: "Latvia" },
      { code: "LI", name: "Liechtenstein" },
      { code: "LT", name: "Lithuania" },
      { code: "LU", name: "Luxembourg" },
      { code: "MT", name: "Malta" },
      { code: "NL", name: "Netherlands" },
      { code: "NO", name: "Norway" },
      { code: "PL", name: "Poland" },
      { code: "PT", name: "Portugal" },
      { code: "RO", name: "Romania" },
      { code: "SK", name: "Slovakia" },
      { code: "SI", name: "Slovenia" },
      { code: "ES", name: "Spain" },
      { code: "SE", name: "Sweden" },
      { code: "CH", name: "Switzerland" },
    ],
  },
];

export const ALL_COUNTRIES = REGIONS.flatMap((r) => r.countries.map((c) => ({ ...c, region: r.code })));

export function regionForCountry(country: CountryCode | null | undefined): RegionCode | null {
  if (!country) return null;
  const region = REGIONS.find((r) => r.countries.some((c) => c.code === country));
  return region ? region.code : null;
}

export function countryName(code: CountryCode | null | undefined): string {
  if (!code) return "";
  return ALL_COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

export const EDUCATION_LEVELS: EducationLevel[] = [
  "High School",
  "Vocational / Professional",
  "Associate Degree",
  "Bachelor",
  "Master",
  "PhD",
];

export const EDUCATION_LEVEL_RANK: Record<EducationLevel, number> = {
  "High School": 0,
  "Vocational / Professional": 1,
  "Associate Degree": 2,
  "Bachelor": 3,
  "Master": 4,
  "PhD": 5,
};

export interface FieldGroup {
  category: string;
  fields: FieldOfStudy[];
}

export const FIELD_GROUPS: FieldGroup[] = [
  {
    category: "Engineering",
    fields: [
      "Mechanical Engineering",
      "Electrical Engineering",
      "Civil Engineering",
      "Chemical Engineering",
      "Aerospace Engineering",
      "Industrial & Manufacturing Engineering",
      "Automotive Engineering",
      "Biomedical Engineering",
      "Materials Science & Engineering",
      "Environmental Engineering",
      "Mechatronics",
    ],
  },
  {
    category: "Computing & Data",
    fields: [
      "Computer Science",
      "Software Engineering",
      "Data Science",
      "Information Systems",
      "Cybersecurity",
      "Artificial Intelligence",
      "Game Development",
      "Human-Computer Interaction",
    ],
  },
  {
    category: "Business & Economics",
    fields: [
      "Business & Economics",
      "Finance",
      "Accounting",
      "Marketing",
      "International Business",
      "Human Resources",
      "Supply Chain & Logistics",
      "Entrepreneurship",
      "Hospitality & Tourism Management",
      "Real Estate",
    ],
  },
  {
    category: "Design & Media",
    fields: [
      "Design", "Architecture", "Urban Planning", "Journalism & Media", "Film & Television",
      "Fashion Design", "Interior Design",
    ],
  },
  {
    category: "Arts & Performance",
    fields: [
      "Music", "Theatre & Performing Arts", "Dance", "Studio Art", "Art History", "Creative Writing",
    ],
  },
  {
    category: "Life & Physical Sciences",
    fields: [
      "Biology & Life Sciences",
      "Chemistry",
      "Physics",
      "Environmental Science",
      "Mathematics & Statistics",
      "Biochemistry",
      "Neuroscience",
      "Geology & Earth Sciences",
      "Astronomy",
    ],
  },
  {
    category: "Health & Social Sciences",
    fields: [
      "Psychology",
      "Political Science & Public Policy",
      "Law",
      "Nursing",
      "Public Health",
      "Sociology",
      "Anthropology",
      "Education",
      "Social Work",
      "Kinesiology & Sports Science",
      "Criminology & Criminal Justice",
    ],
  },
  {
    category: "Agriculture & Environment",
    fields: ["Agricultural Science", "Forestry", "Veterinary Science"],
  },
  {
    category: "Communications & Humanities",
    fields: [
      "Communications", "Linguistics", "History", "Philosophy", "International Relations",
      "Religious Studies & Theology",
    ],
  },
  {
    category: "General",
    fields: ["General / Pre-university", "Other"],
  },
];

export const FIELDS_OF_STUDY: FieldOfStudy[] = FIELD_GROUPS.flatMap((g) => g.fields);

export const INTERNSHIP_LENGTHS: InternshipLength[] = ["3 months", "6 months", "12 months", "Flexible"];

export const WORK_ARRANGEMENTS: WorkArrangement[] = ["On-site", "Hybrid", "Remote"];

export const WORK_ARRANGEMENT_PREFERENCES: WorkArrangementPreference[] = ["On-site", "Hybrid", "Remote", "Flexible"];

export const LANGUAGE_LEVELS: LanguageLevel[] = ["Basic", "Conversational", "Fluent", "Native"];

export const LANGUAGE_LEVEL_RANK: Record<LanguageLevel, number> = {
  Basic: 0,
  Conversational: 1,
  Fluent: 2,
  Native: 3,
};

export interface SkillGroup {
  category: string;
  skills: string[];
}

export const SKILL_GROUPS: SkillGroup[] = [
  {
    category: "Software & Data",
    skills: [
      "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "Go", "Rust", "Kotlin", "Swift", "PHP", "Ruby", "SQL",
      "React", "Node.js", "Vue", "Angular", "Next.js", "GraphQL", "REST APIs", "Git", "Docker", "Kubernetes",
      "CI/CD", "Cloud (AWS)", "Cloud (Azure)", "Cloud (GCP)", "Data Analysis", "Machine Learning",
      "Deep Learning", "Reinforcement Learning", "Statistics", "Data Visualization", "ETL Pipelines", "NLP",
      "Computer Vision", "Big Data (Spark/Hadoop)", "Database Design", "Systems Design", "Mobile Development (iOS/Android)",
    ],
  },
  {
    category: "Engineering & Manufacturing",
    skills: [
      "CAD", "SolidWorks", "AutoCAD", "Fusion 360", "MATLAB", "Simulink", "Finite Element Analysis", "Robotics",
      "PLC Programming", "Embedded Systems", "Circuit Design", "PCB Design", "Thermodynamics", "Fluid Dynamics",
      "Manufacturing Processes", "Quality Control", "Lean Six Sigma", "3D Printing", "CNC Machining",
      "Structural Analysis", "HVAC Design",
    ],
  },
  {
    category: "Design",
    skills: [
      "Figma", "Adobe XD", "Sketch", "UI Design", "UX Research", "Prototyping",
      "Graphic Design", "Motion Design", "Design Systems", "Adobe Photoshop", "Adobe Illustrator",
      "Adobe Premiere Pro", "3D Modeling (Blender)", "Typography", "Branding",
    ],
  },
  {
    category: "Business & Finance",
    skills: [
      "Financial Modeling", "Accounting", "Market Research", "Valuation", "Excel / Spreadsheets",
      "Business Strategy", "Project Management", "Agile / Scrum", "Supply Chain Management", "Procurement",
      "Bookkeeping", "Investment Analysis", "Risk Management", "Business Development", "Sales", "CRM (Salesforce)",
      "Pricing Strategy", "Hospitality Operations", "Event Planning", "Retail Management", "Real Estate Analysis",
    ],
  },
  {
    category: "Life Sciences",
    skills: [
      "Lab Techniques", "Molecular Biology", "Bioinformatics", "Cell Culture", "Chromatography",
      "Clinical Research", "Biostatistics", "Genomics", "Microscopy", "PCR / qPCR", "Immunoassays",
      "Anatomy & Physiology", "Epidemiology", "Toxicology",
    ],
  },
  {
    category: "Environmental",
    skills: [
      "GIS", "Environmental Modeling", "Sustainability Reporting", "Life Cycle Assessment",
      "Renewable Energy Systems", "Environmental Impact Assessment", "Carbon Accounting", "Water Resource Management",
      "Wildlife Conservation", "Waste Management",
    ],
  },
  {
    category: "Marketing & Communications",
    skills: [
      "Copywriting", "SEO", "Social Media", "Content Strategy", "Email Marketing", "Brand Strategy",
      "Public Relations", "Paid Advertising (SEM)", "Marketing Analytics", "Video Editing", "Community Management",
      "Journalism", "Broadcasting", "Media Relations",
    ],
  },
  {
    category: "Healthcare & Clinical",
    skills: [
      "Patient Care", "Medical Terminology", "Electronic Health Records", "First Aid / CPR", "Clinical Documentation",
      "Nursing Care", "Physical Therapy Techniques", "Pharmacy Operations", "Mental Health Counseling",
    ],
  },
  {
    category: "Education & Social Work",
    skills: [
      "Curriculum Development", "Classroom Management", "Special Education", "Social Work Practice",
      "Case Management", "Community Outreach", "Tutoring",
    ],
  },
  {
    category: "Arts & Performance",
    skills: [
      "Music Theory", "Music Performance", "Acting", "Choreography", "Studio Art", "Art History",
      "Creative Writing", "Creative Direction",
    ],
  },
  {
    category: "Legal & Government",
    skills: [
      "Legal Research", "Contract Review", "Policy Analysis", "Paralegal Support", "Public Administration",
    ],
  },
  {
    category: "General / Soft Skills",
    skills: [
      "Public Speaking", "Technical Writing", "Cross-functional Collaboration", "Data Storytelling",
      "Negotiation", "Critical Thinking", "Time Management", "Conflict Resolution", "Mentoring", "Fundraising",
    ],
  },
];

// Curated, hand-picked groups above cover general/soft skills and the most
// common domain skills. Beneath them we append ~8,900 real technology/tool
// names plus O*NET's standard work-skill and knowledge-area taxonomies,
// sourced from the O*NET 29.2 Database (US Dept. of Labor / National Center
// for O*NET Development, CC BY 4.0 — https://www.onetcenter.org/database.html).
// Any O*NET entry that exactly duplicates a curated one (case-insensitive) is
// dropped so it doesn't show up twice in the picker.
const curatedSkillNames = new Set(SKILL_GROUPS.flatMap((g) => g.skills.map((s) => s.toLowerCase())));

const onetGroups: SkillGroup[] = [...onetCoreGroupsData, ...onetSkillGroupsData]
  .map((g) => ({
    category: g.category,
    skills: g.skills.filter((s: string) => !curatedSkillNames.has(s.toLowerCase())),
  }))
  .filter((g) => g.skills.length > 0);

export const SKILL_GROUPS_ALL: SkillGroup[] = [...SKILL_GROUPS, ...onetGroups];

export const SKILLS: string[] = SKILL_GROUPS_ALL.flatMap((g) => g.skills);

export const LANGUAGES: string[] = [
  "English", "German", "French", "Danish", "Swedish", "Norwegian", "Dutch",
  "Spanish", "Italian", "Polish", "Portuguese", "Finnish",
  "Mandarin", "Japanese", "Korean", "Cantonese",
  "Russian", "Arabic", "Hindi", "Turkish", "Ukrainian", "Czech", "Hungarian",
  "Romanian", "Greek", "Hebrew", "Thai", "Vietnamese", "Indonesian",
];

export const INTERESTS: string[] = [
  "Robotics", "AI / Machine Learning", "Automotive & Manufacturing", "Climate & Sustainability",
  "Fintech", "Healthcare", "Biotech", "Consumer Products", "Gaming", "Defense & Aerospace",
  "Media & Publishing", "Renewable Energy", "Logistics", "Public Policy",
  "Nonprofit / Social Impact", "Real Estate", "Telecommunications", "Education Technology", "Insurance",
  "E-commerce", "Cybersecurity", "Space & Aerospace", "Agriculture & Food Tech", "Travel & Hospitality",
  "Fashion & Retail", "Sports & Entertainment", "Legal Tech", "Semiconductors", "Construction & Infrastructure",
  "Arts & Culture", "Government & Public Sector", "Human Services & Social Work", "Education & Teaching",
  "Music & Performing Arts",
];

export const QUALIFICATIONS: string[] = [
  "Driver's license",
  "Security clearance eligible",
  "Study abroad / exchange experience",
  "Open source contributor",
  "Published research or thesis",
  "Teaching or mentoring experience",
  "Competitive hackathon experience",
  "Varsity athletics or team leadership",
  "Volunteer leadership experience",
  "Professional certification (e.g. PMP, CFA, AWS)",
  "Student government or society leadership",
  "Startup founder / co-founder experience",
  "Patent or invention disclosure",
  "National or international competition award",
  "Peer-reviewed publication",
  "Fluent in 3+ languages",
];

// --- voluntary self-identification (EEO-style questions) ---
// Wording deliberately mirrors the US OFCCP-standard voluntary self-ID form
// that Greenhouse/Workday/Lever all effectively copy for their own EEO
// reporting — matching real forms' phrasing closely means the extension's
// fuzzy option-matching (findBestOptionValue) actually lands on the right
// choice instead of just the decline fallback. Every list ends with a
// decline option, since these questions are legally required to offer one.
export const GENDER_IDENTITY_OPTIONS: string[] = [
  "Man",
  "Woman",
  "Non-binary",
  "Prefer to self-describe",
  "Prefer not to say",
];

export const RACE_ETHNICITY_OPTIONS: string[] = [
  "American Indian or Alaska Native",
  "Asian",
  "Black or African American",
  "Hispanic or Latino",
  "Native Hawaiian or Other Pacific Islander",
  "White",
  "Two or more races",
  "Prefer not to say",
];

export const VETERAN_STATUS_OPTIONS: string[] = [
  "I am not a protected veteran",
  "I identify as one or more classifications of a protected veteran",
  "Prefer not to say",
];

export const DISABILITY_STATUS_OPTIONS: string[] = [
  "Yes, I have a disability, or have had one in the past",
  "No, I do not have a disability",
  "Prefer not to say",
];

export const DOCUMENT_KINDS: DocumentKind[] = ["ID Photo", "Resume / CV", "Transcript", "Certificate", "Other"];

export const COMPANY_SIZES: CompanySize[] = ["1-10", "11-50", "51-200", "201-1000", "1000+"];

// Real per-country university lists so the university field can stay a closed
// dropdown (no free text) while covering essentially every accredited
// institution in each supported country, not just the well-known handful.
// Sourced from the Hipo/university-domains-list dataset (MIT licensed —
// https://github.com/Hipo/university-domains-list), filtered to our 26
// supported countries and deduplicated by name. "Other (not listed)" is
// appended in the UI, not stored here.
export const UNIVERSITIES: Partial<Record<CountryCode, string[]>> = universitiesData;
