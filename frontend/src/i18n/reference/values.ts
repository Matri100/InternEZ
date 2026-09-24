// Values from the app's own reference lists (backend data/reference.ts)
// that the interface shows in the visitor's language. The stored value
// always stays English — profiles, listings and the match score compare
// these exact strings — only the label changes. A value the backend adds
// later and this list doesn't know yet simply shows in English.
//
// Skills aren't here: ~9,000 of them are technology and tool names from
// O*NET that are the same in every language, and they're matched against
// listing skills, which arrive in English.
export const REFERENCE_VALUES = {
  fieldCategory: [
    "Engineering", "Computing & Data", "Business & Economics", "Design & Media", "Arts & Performance",
    "Life & Physical Sciences", "Health & Social Sciences", "Agriculture & Environment",
    "Communications & Humanities", "General",
  ],
  field: [
    "Mechanical Engineering", "Electrical Engineering", "Civil Engineering", "Chemical Engineering",
    "Aerospace Engineering", "Industrial & Manufacturing Engineering", "Automotive Engineering",
    "Biomedical Engineering", "Materials Science & Engineering", "Environmental Engineering", "Mechatronics",
    "Computer Science", "Software Engineering", "Data Science", "Information Systems", "Cybersecurity",
    "Artificial Intelligence", "Game Development", "Human-Computer Interaction",
    "Business & Economics", "Finance", "Accounting", "Marketing", "International Business", "Human Resources",
    "Supply Chain & Logistics", "Entrepreneurship", "Hospitality & Tourism Management", "Real Estate",
    "Design", "Architecture", "Urban Planning", "Journalism & Media", "Film & Television", "Fashion Design",
    "Interior Design",
    "Music", "Theatre & Performing Arts", "Dance", "Studio Art", "Art History", "Creative Writing",
    "Biology & Life Sciences", "Chemistry", "Physics", "Environmental Science", "Mathematics & Statistics",
    "Biochemistry", "Neuroscience", "Geology & Earth Sciences", "Astronomy",
    "Psychology", "Political Science & Public Policy", "Law", "Nursing", "Public Health", "Sociology",
    "Anthropology", "Education", "Social Work", "Kinesiology & Sports Science", "Criminology & Criminal Justice",
    "Agricultural Science", "Forestry", "Veterinary Science",
    "Communications", "Linguistics", "History", "Philosophy", "International Relations",
    "Religious Studies & Theology",
    "General / Pre-university", "Other",
  ],
  interest: [
    "Robotics", "AI / Machine Learning", "Automotive & Manufacturing", "Climate & Sustainability", "Fintech",
    "Healthcare", "Biotech", "Consumer Products", "Gaming", "Defense & Aerospace", "Media & Publishing",
    "Renewable Energy", "Logistics", "Public Policy", "Nonprofit / Social Impact", "Real Estate",
    "Telecommunications", "Education Technology", "Insurance", "E-commerce", "Cybersecurity",
    "Space & Aerospace", "Agriculture & Food Tech", "Travel & Hospitality", "Fashion & Retail",
    "Sports & Entertainment", "Legal Tech", "Semiconductors", "Construction & Infrastructure", "Arts & Culture",
    "Government & Public Sector", "Human Services & Social Work", "Education & Teaching",
    "Music & Performing Arts",
  ],
  qualification: [
    "Driver's license", "Security clearance eligible", "Study abroad / exchange experience",
    "Open source contributor", "Published research or thesis", "Teaching or mentoring experience",
    "Competitive hackathon experience", "Varsity athletics or team leadership", "Volunteer leadership experience",
    "Professional certification (e.g. PMP, CFA, AWS)", "Student government or society leadership",
    "Startup founder / co-founder experience", "Patent or invention disclosure",
    "National or international competition award", "Peer-reviewed publication", "Fluent in 3+ languages",
  ],
  documentKind: ["ID Photo", "Resume / CV", "Transcript", "Certificate", "Other"],
  // US equal-opportunity categories (see VoluntaryDisclosuresSection) — the
  // stored answer stays English because the extension fills it into US
  // employers' forms.
  gender: ["Man", "Woman", "Non-binary", "Prefer to self-describe", "Prefer not to say"],
  race: [
    "American Indian or Alaska Native", "Asian", "Black or African American", "Hispanic or Latino",
    "Native Hawaiian or Other Pacific Islander", "White", "Two or more races", "Prefer not to say",
  ],
  veteran: [
    "I am not a protected veteran", "I identify as one or more classifications of a protected veteran",
    "Prefer not to say",
  ],
  disability: [
    "Yes, I have a disability, or have had one in the past", "No, I do not have a disability", "Prefer not to say",
  ],
  region: ["EU / EEA"],
} as const;

export type ReferenceKind = keyof typeof REFERENCE_VALUES;

// A translation must name every value of every kind.
export type ReferenceCatalog = {
  [K in ReferenceKind]: Record<(typeof REFERENCE_VALUES)[K][number], string>;
};
