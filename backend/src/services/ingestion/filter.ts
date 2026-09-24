// Decides whether a job title is internship-shaped. The Active Jobs DB
// query already filters by title, but its full-text search stems words
// ("internal"/"international" can come back for "intern"), so this runs
// as a second, stricter pass over every result.
//
// Whole-word matching uses Unicode-aware lookarounds rather than \b: JS's
// \b is ASCII-only, so it silently fails at a word ending in a letter like
// "ż" (Polish "staż") or after "á" — and a naive substring check on
// "intern" matches every "Internal Audit ..." title (found the hard way
// against real GitLab/N26 data).
//
// "stage" (French/Dutch/Italian for internship) also matches the unrelated
// English "Stage Manager" — kept anyway, since bare "Stage - Marketing" is
// one of the most common real internship titles in France and Italy.
const WHOLE_WORD_TERMS = [
  // English
  "intern", "interns", "internship", "internships", "trainee", "traineeship",
  "working student", "apprentice", "apprenticeship",
  // French / Dutch
  "stagiaire", "stagiair", "stage",
  // Italian
  "stagista", "stagisti", "tirocinio", "tirocinante",
  // Spanish
  "prácticas", "practicas", "becario", "becaria",
];

const WHOLE_WORD_PATTERN = new RegExp(`(?<!\\p{L})(?:${WHOLE_WORD_TERMS.join("|")})(?!\\p{L})`, "iu");

// Stems matched anywhere in a word: German compounds glue these onto
// other words ("Pflichtpraktikum", "Praktikumsstelle", "Werkstudentin",
// "IT-Werkstudentenjob"), and Polish inflects them ("stażu", "praktyki",
// "praktykant"). None of these stems appears inside a common
// non-internship word.
const STEM_PATTERN = /praktik(?:um|ant)|werkstudent|praktyk|staż/iu;

export function isInternshipTitle(title: string): boolean {
  return WHOLE_WORD_PATTERN.test(title) || STEM_PATTERN.test(title);
}
