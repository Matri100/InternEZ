// The interface languages: English plus the language of each country
// InternEZ sources listings from. Listings themselves are never
// translated — they stay in the language they were posted in.
export type Locale = "en" | "de" | "fr" | "it" | "nl" | "es" | "pl";

export type FlagCode = "gb" | "de" | "fr" | "it" | "nl" | "es" | "pl";

// Each language is shown by its own name ("Deutsch", not "German"), so
// someone who can't read the current interface can still find theirs.
export const LOCALES: { code: Locale; name: string; flag: FlagCode }[] = [
  { code: "en", name: "English", flag: "gb" },
  { code: "de", name: "Deutsch", flag: "de" },
  { code: "fr", name: "Français", flag: "fr" },
  { code: "it", name: "Italiano", flag: "it" },
  { code: "nl", name: "Nederlands", flag: "nl" },
  { code: "es", name: "Español", flag: "es" },
  { code: "pl", name: "Polski", flag: "pl" },
];

const SUPPORTED = new Set<string>(LOCALES.map((l) => l.code));

export const LOCALE_STORAGE_KEY = "iez_locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && SUPPORTED.has(value);
}

// A choice made in the language menu wins; otherwise the first browser
// language we support ("de-AT" counts as German); otherwise English.
export function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // Storage blocked (private mode, disabled cookies) — fall through.
  }
  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = tag.slice(0, 2).toLowerCase();
    if (isLocale(base)) return base;
  }
  return "en";
}
