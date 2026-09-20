// Plain functions, no import/export — this file is loaded two ways: as a
// classic script injected straight into a page (chrome.scripting.executeScript
// with no bundler involved), and via require() from the test file below. The
// module.exports guard at the bottom is a no-op in the browser (there's no
// `module` global there) and lets Node/vitest pick it up directly.

// Lowercase, collapse whitespace, strip punctuation — so "First Name*",
// "first_name", and "First  Name" all normalize to the same haystack.
function normalizeLabel(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[_\-.]/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Ordered most-specific-first — a field matches the first rule whose
// keywords appear in its normalized label/name/id/placeholder, and whose
// excludeKeywords (if any) don't also appear. Order matters: "last name"
// must be checked before the bare "name" fallback, or every name field
// would resolve to fullName.
const KEYWORD_RULES = [
  { profileKey: "email", keywords: ["email", "e mail"] },
  { profileKey: "phone", keywords: ["phone", "mobile", "telephone", "contact number"] },
  { profileKey: "linkedinOrPortfolio", keywords: ["linkedin", "portfolio", "github", "personal website", "personal site"] },
  { profileKey: "firstName", keywords: ["first name", "given name", "fname"], exclude: ["last"] },
  { profileKey: "lastName", keywords: ["last name", "surname", "family name", "lname"] },
  { profileKey: "graduationYear", keywords: ["graduation year", "grad year", "year of graduation", "end date year"] },
  // "degree" alone (bare, no "level"/"field" qualifier) is a real-world
  // label — Scale AI's own Greenhouse form just says "Degree" for a select
  // of degree levels — so it's included with an exclude guard rather than
  // requiring a longer phrase, to avoid swallowing "Degree Field" first.
  { profileKey: "educationLevel", keywords: ["degree level", "education level", "highest degree", "level of education", "degree"], exclude: ["field", "major", "discipline", "area of study"] },
  { profileKey: "fieldOfStudy", keywords: ["field of study", "major", "degree field", "area of study", "discipline"] },
  { profileKey: "university", keywords: ["university", "college", "school name", "school", "institution"] },
  { profileKey: "currentOrLatestEmployer", keywords: ["current employer", "current company", "employer name", "company name"] },
  { profileKey: "currentOrLatestJobTitle", keywords: ["job title", "current title", "position title", "current role"] },
  // Deliberately NOT bare "availability" — a real-world false positive
  // (see fieldMatcher.test.js): Greenhouse-style forms often phrase an
  // unrelated yes/no confirmation as "I confirm my availability for a
  // Summer 2027 internship," which contains that word without being an
  // actual start-date field. Every kept phrase is specific to naming a date.
  { profileKey: "availableFrom", keywords: ["available from", "start date", "earliest start", "availability date"] },
  { profileKey: "citizenship", keywords: ["citizenship", "nationality"] },
  { profileKey: "residenceCountry", keywords: ["country of residence", "current location", "residence"] },
  // Voluntary self-identification (EEO-style) fields — see VoluntaryDisclosures
  // in the backend. profile[key] is only ever populated when the applicant
  // both filled the field in AND separately consented to autofill using it;
  // buildFillPlan below falls back to auto-selecting a "prefer not to say"
  // style option on these specific keys when there's nothing to fill with,
  // rather than leaving the field untouched like every other unmatched field.
  { profileKey: "genderIdentity", keywords: ["gender identity", "gender"] },
  { profileKey: "raceEthnicity", keywords: ["race/ethnicity", "race and ethnicity", "ethnicity", "race"] },
  { profileKey: "veteranStatus", keywords: ["veteran status", "protected veteran", "veteran"] },
  { profileKey: "disabilityStatus", keywords: ["disability status", "self-identification of disability", "disability"] },
  { profileKey: "skills", keywords: ["key skills", "technical skills", "skills"] },
  { profileKey: "summary", keywords: ["cover letter", "summary", "about you", "additional information", "tell us about"] },
  // Bare "name" is the broadest, most collision-prone pattern — checked
  // last, and only wins if nothing narrower (first/last/user/company name
  // etc.) already matched. Explicitly excludes "user" so a login/account
  // "username" field is never filled with the applicant's real name.
  { profileKey: "fullName", keywords: ["full name", "your name", "applicant name", "name"], exclude: ["user", "company", "school", "file"] },
];

function matchesRule(haystack, rule) {
  const hit = rule.keywords.some((k) => haystack.includes(k));
  if (!hit) return false;
  if (rule.exclude && rule.exclude.some((k) => haystack.includes(k))) return false;
  return true;
}

// Maps one field descriptor ({label, name, id, placeholder}) to a profile
// key, or null if nothing matches. Exported separately from buildFillPlan
// so it's independently testable — the "what does this field mean" question
// is the one actually worth getting right.
function matchFieldToProfileKey(descriptor) {
  const haystack = normalizeLabel(
    [descriptor.label, descriptor.name, descriptor.id, descriptor.placeholder].filter(Boolean).join(" ")
  );
  if (!haystack) return null;
  for (const rule of KEYWORD_RULES) {
    if (matchesRule(haystack, rule)) return rule.profileKey;
  }
  return null;
}

// For a <select> field: which option's *value* attribute to set, given the
// profile's free-text value (e.g. "Bachelor") and the dropdown's real
// options (e.g. "Bachelor's Degree", "BS/BA", "Master's Degree", ...).
// Dropdown wording varies by site, so this is a fuzzy containment match on
// normalized text, not an exact one — an exact match (after normalizing)
// wins outright; otherwise the option whose text length is closest to the
// profile value's wins, among options where one side contains the other.
// Returns null rather than guessing when nothing reasonable is found —
// leaving a dropdown on its default is always safer than picking wrong.
function findBestOptionValue(options, value) {
  const target = normalizeLabel(value);
  if (!target) return null;
  let best = null;
  let bestScore = Infinity;
  for (const opt of options) {
    const optText = normalizeLabel(opt.text);
    if (!optText) continue;
    if (optText === target) return opt.value;
    if (optText.includes(target) || target.includes(optText)) {
      const score = Math.abs(optText.length - target.length);
      if (score < bestScore) {
        bestScore = score;
        best = opt.value;
      }
    }
  }
  return best;
}

// Voluntary self-identification (EEO-style) questions almost always come
// with a legally required "prefer not to say" style option on the real
// form — that's precisely why they're voluntary. When the applicant hasn't
// provided (or hasn't consented to share) a real answer for one of these,
// auto-selecting that option is a safe, zero-data-collection way to still
// make progress on the field rather than leaving it for the applicant.
const DECLINE_FALLBACK_KEYS = new Set(["genderIdentity", "raceEthnicity", "veteranStatus", "disabilityStatus"]);
const DECLINE_OPTION_PATTERNS = [
  "decline",
  "prefer not",
  "don t wish",
  "do not wish",
  "not to answer",
  "not disclosed",
  "rather not",
  "choose not",
];

function findDeclineOptionValue(options) {
  for (const opt of options) {
    const text = normalizeLabel(opt.text);
    if (DECLINE_OPTION_PATTERNS.some((p) => text.includes(p))) return opt.value;
  }
  return null;
}

// Turns a list of field descriptors + the applicant's profile into a list
// of {index, profileKey, value} fills — skipping fields with no match, no
// corresponding profile value, or that already have a value (never
// overwrite something the applicant already typed). A descriptor with an
// `options` array is treated as a <select>: `value` in the returned plan
// is the option's own value attribute (via findBestOptionValue), not the
// raw profile string — the caller sets it directly, no further lookup.
function buildFillPlan(descriptors, profile) {
  const plan = [];
  descriptors.forEach((descriptor, index) => {
    if (descriptor.hasValue) return;
    const profileKey = matchFieldToProfileKey(descriptor);
    if (!profileKey) return;
    const value = profile[profileKey];

    if (descriptor.options) {
      if (value) {
        const optionValue = findBestOptionValue(descriptor.options, value);
        if (optionValue !== null) {
          plan.push({ index, profileKey, value: optionValue });
          return;
        }
      }
      // No usable profile value (not provided, or no option resembled it).
      // For the voluntary self-ID keys specifically, fall back to the
      // form's own decline option rather than leaving the field blank.
      if (DECLINE_FALLBACK_KEYS.has(profileKey)) {
        const declineValue = findDeclineOptionValue(descriptor.options);
        if (declineValue !== null) plan.push({ index, profileKey, value: declineValue });
      }
      return;
    }

    if (!value) return;
    plan.push({ index, profileKey, value });
  });
  return plan;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    normalizeLabel,
    matchFieldToProfileKey,
    findBestOptionValue,
    findDeclineOptionValue,
    buildFillPlan,
    KEYWORD_RULES,
    DECLINE_FALLBACK_KEYS,
  };
}
