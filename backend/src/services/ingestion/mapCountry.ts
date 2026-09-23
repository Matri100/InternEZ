// InternEZ is EU/EEA(+CH)-only — CountryCode (types/domain.ts) is a closed
// union of exactly those 31 codes, with nothing outside it (no "US", "GB",
// etc). ATS location strings are free text ("Berlin, Germany", "Remote -
// DE", "Dublin 2, Ireland"), so this maps that text back to a CountryCode
// or null — never guesses, never falls back to some default country. A
// listing whose location doesn't clearly resolve to one of the 31 is
// rejected by the ingestion filter (see filter.ts), not mis-tagged.
import { REGIONS } from "../../data/reference.js";
import type { CountryCode } from "../../types/domain.js";

const NAME_TO_CODE = new Map<string, CountryCode>();
for (const region of REGIONS) {
  for (const country of region.countries) {
    NAME_TO_CODE.set(country.name.toLowerCase(), country.code);
  }
}

// Common alternate spellings ATS location fields actually use, beyond the
// canonical names in reference.ts. Deliberately no "United Kingdom" entry —
// post-Brexit the UK isn't EEA, and GB isn't a valid CountryCode here, so a
// UK-located posting should map to null and get rejected by the filter.
const ALIASES: Record<string, CountryCode> = {
  "czech republic": "CZ",
  "the netherlands": "NL",
  holland: "NL",
};

// ATS location fields very often give just a city, with no country at all
// ("Madrid", not "Madrid, Spain") — confirmed against real Greenhouse data
// while building this, where it silently dropped a real internship
// listing before this table existed. Not exhaustive — one or two major
// cities per country, enough to cover where internship-posting employers
// are actually concentrated. Extend as real ingested listings turn up
// unresolved cities.
const CITY_TO_CODE: Record<string, CountryCode> = {
  vienna: "AT",
  brussels: "BE",
  antwerp: "BE",
  sofia: "BG",
  zagreb: "HR",
  nicosia: "CY",
  prague: "CZ",
  brno: "CZ",
  copenhagen: "DK",
  aarhus: "DK",
  tallinn: "EE",
  helsinki: "FI",
  espoo: "FI",
  paris: "FR",
  lyon: "FR",
  marseille: "FR",
  toulouse: "FR",
  nantes: "FR",
  strasbourg: "FR",
  bordeaux: "FR",
  lille: "FR",
  nice: "FR",
  berlin: "DE",
  munich: "DE",
  münchen: "DE",
  hamburg: "DE",
  frankfurt: "DE",
  cologne: "DE",
  köln: "DE",
  stuttgart: "DE",
  düsseldorf: "DE",
  dusseldorf: "DE",
  leipzig: "DE",
  athens: "GR",
  budapest: "HU",
  reykjavik: "IS",
  dublin: "IE",
  cork: "IE",
  rome: "IT",
  milan: "IT",
  milano: "IT",
  turin: "IT",
  naples: "IT",
  riga: "LV",
  vaduz: "LI",
  vilnius: "LT",
  luxembourg: "LU",
  valletta: "MT",
  amsterdam: "NL",
  rotterdam: "NL",
  "the hague": "NL",
  utrecht: "NL",
  eindhoven: "NL",
  oslo: "NO",
  bergen: "NO",
  warsaw: "PL",
  krakow: "PL",
  kraków: "PL",
  wroclaw: "PL",
  wrocław: "PL",
  poznan: "PL",
  poznań: "PL",
  lisbon: "PT",
  lisboa: "PT",
  porto: "PT",
  bucharest: "RO",
  bratislava: "SK",
  ljubljana: "SI",
  madrid: "ES",
  barcelona: "ES",
  valencia: "ES",
  seville: "ES",
  stockholm: "SE",
  gothenburg: "SE",
  malmo: "SE",
  malmö: "SE",
  zurich: "CH",
  zürich: "CH",
  geneva: "CH",
  basel: "CH",
  bern: "CH",
};

const VALID_CODES = new Set<CountryCode>(Array.from(NAME_TO_CODE.values()));

export function mapLocationToCountry(location: string): CountryCode | null {
  if (!location) return null;

  for (const part of location.split(/[,\-–—/]/)) {
    const token = part.trim();
    if (!token) continue;

    const lower = token.toLowerCase();
    const byName = NAME_TO_CODE.get(lower) ?? ALIASES[lower] ?? CITY_TO_CODE[lower];
    if (byName) return byName;

    // A bare 2-letter token that happens to be one of our 31 codes (ATS
    // location fields sometimes give "DE" / "PL" directly).
    const upper = token.toUpperCase();
    if (upper.length === 2 && VALID_CODES.has(upper as CountryCode)) {
      return upper as CountryCode;
    }
  }

  // Fall back to a substring scan of the whole string for a known country
  // or city name, in case it wasn't isolated by a separator (e.g. "Remote
  // Germany", "Berlin (Remote)").
  const wholeLower = location.toLowerCase();
  for (const [name, code] of NAME_TO_CODE) {
    if (wholeLower.includes(name)) return code;
  }
  for (const [city, code] of Object.entries(CITY_TO_CODE)) {
    if (wholeLower.includes(city)) return code;
  }

  return null;
}
