import { franc } from "franc";
import { LANGUAGES } from "../data/reference.js";

// franc's ISO 639-3 codes for the languages InternEZ actually offers
// elsewhere (LANGUAGES in reference.ts, used for RequiredLanguage and an
// applicant's own profile) — restricting franc to just these via `only`
// both keeps the two lists in sync and improves accuracy, since franc
// isn't wasting its guess on languages this app has no name for anyway.
const FRANC_TO_LANGUAGE: Record<string, string> = {
  eng: "English",
  deu: "German",
  fra: "French",
  dan: "Danish",
  swe: "Swedish",
  nob: "Norwegian",
  nno: "Norwegian",
  nld: "Dutch",
  spa: "Spanish",
  ita: "Italian",
  pol: "Polish",
  por: "Portuguese",
  fin: "Finnish",
  cmn: "Mandarin",
  jpn: "Japanese",
  kor: "Korean",
  yue: "Cantonese",
  rus: "Russian",
  arb: "Arabic",
  hin: "Hindi",
  tur: "Turkish",
  ukr: "Ukrainian",
  ces: "Czech",
  hun: "Hungarian",
  ron: "Romanian",
  ell: "Greek",
  heb: "Hebrew",
  tha: "Thai",
  vie: "Vietnamese",
  ind: "Indonesian",
};

const FRANC_CODES = Object.keys(FRANC_TO_LANGUAGE);

// Detection, not translation — this only ever decides which of
// LANGUAGES a listing's own title/description reads as, for an honest
// "Posted in Polish" flag on Browse. It never rewrites or interprets the
// text, so there's no LLM call and no per-request cost either way.
// Below franc's own reliable-length floor, a short/ambiguous listing
// defaults to English (i.e. no flag shown) rather than risking a wrong
// label off too little text.
export function detectListingLanguage(title: string, description: string): string {
  const text = `${title} ${description}`.trim();
  const code = franc(text, { minLength: 20, only: FRANC_CODES });
  return FRANC_TO_LANGUAGE[code] ?? "English";
}
