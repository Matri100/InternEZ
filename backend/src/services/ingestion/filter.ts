// ATS feeds return every open role, not just internships — this decides
// which ones are internship-shaped by title. Word-boundary matching only:
// a naive substring check on "intern" also matches "Internal Audit" or
// "Internal Tools Engineer" (found this the hard way testing against
// real GitLab/N26 data — plain "intern".includes() gave false positives on
// every "Internal ..." title). Checked against title only, not
// description — a senior role's description mentioning "our intern
// program" elsewhere in the company doesn't make the role itself one.
// "stage" (French for internship) is a known imprecise entry here — it
// also matches the unrelated English title "Stage Manager". Kept anyway
// since French postings often title-case it bare ("Stage - Marketing");
// the false-positive rate in practice is low since "Stage Manager" is rare
// among the tech/business roles this app curates employers from.
const INTERNSHIP_TITLE_PATTERN =
  /\b(intern|interns|internship|internships|trainee|traineeship|working student|werkstudent|praktikant(in)?|praktikum|apprentice|apprenticeship|stagiaire|stage)\b/i;

export function isInternshipTitle(title: string): boolean {
  return INTERNSHIP_TITLE_PATTERN.test(title);
}
