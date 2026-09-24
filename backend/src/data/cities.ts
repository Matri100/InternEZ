// One name per city for Browse's city filter. The listing feed spells the
// same city several ways — mostly English ("Warsaw", "Munich") but
// sometimes local ("Warszawa", "Roma"), with or without accents — which
// showed up as separate filter options ("Warsaw 6", "Warszawa 3").
//
// Each entry's `en` name is the canonical value (the one filters and URLs
// use); every other name and alias resolves to it. The per-language names
// are what the interface shows ("Warschau" in German), sent to the
// frontend with the rest of the reference data. Lookups are per country:
// French "Vienne" is Vienna, but it's also a town in France.
import type { CountryCode } from "../types/domain.js";

type InterfaceLanguage = "de" | "fr" | "it" | "nl" | "es" | "pl";

interface City {
  country: CountryCode;
  en: string;
  names?: Partial<Record<InterfaceLanguage, string>>;
  // Other spellings seen in (or likely from) the feed: the local name when
  // no interface language uses it, unaccented forms, historical names.
  aliases?: string[];
}

// Major cities where names differ between languages, plus ones the feed
// spells more than one way. Not exhaustive — a city missing here just
// isn't merged or translated; its name is shown as the feed gives it.
export const CITIES: City[] = [
  // Poland
  { country: "PL", en: "Warsaw", names: { de: "Warschau", fr: "Varsovie", it: "Varsavia", nl: "Warschau", es: "Varsovia", pl: "Warszawa" } },
  { country: "PL", en: "Kraków", names: { de: "Krakau", fr: "Cracovie", it: "Cracovia", nl: "Krakau", es: "Cracovia" }, aliases: ["Cracow"] },
  { country: "PL", en: "Łódź" },
  { country: "PL", en: "Wrocław" },
  { country: "PL", en: "Poznań" },
  { country: "PL", en: "Gdańsk" },
  { country: "PL", en: "Katowice" },
  // Germany
  { country: "DE", en: "Berlin", names: { it: "Berlino", nl: "Berlijn", es: "Berlín" } },
  { country: "DE", en: "Munich", names: { de: "München", it: "Monaco di Baviera", nl: "München", es: "Múnich", pl: "Monachium" } },
  { country: "DE", en: "Cologne", names: { de: "Köln", it: "Colonia", nl: "Keulen", es: "Colonia", pl: "Kolonia" } },
  { country: "DE", en: "Hamburg", names: { fr: "Hambourg", it: "Amburgo", es: "Hamburgo" } },
  { country: "DE", en: "Frankfurt", names: { fr: "Francfort", it: "Francoforte", es: "Fráncfort" }, aliases: ["Frankfurt am Main", "Frankfurt a. M."] },
  { country: "DE", en: "Nuremberg", names: { de: "Nürnberg", it: "Norimberga", nl: "Neurenberg", es: "Núremberg", pl: "Norymberga" } },
  { country: "DE", en: "Hanover", names: { de: "Hannover", fr: "Hanovre", it: "Hannover", nl: "Hannover", es: "Hannover", pl: "Hanower" } },
  { country: "DE", en: "Düsseldorf" },
  { country: "DE", en: "Leipzig", names: { it: "Lipsia", pl: "Lipsk" } },
  { country: "DE", en: "Dresden", names: { fr: "Dresde", it: "Dresda", es: "Dresde", pl: "Drezno" } },
  { country: "DE", en: "Aachen", names: { fr: "Aix-la-Chapelle", it: "Aquisgrana", nl: "Aken", es: "Aquisgrán", pl: "Akwizgran" } },
  // Italy
  { country: "IT", en: "Milan", names: { de: "Mailand", nl: "Milaan", it: "Milano", es: "Milán", pl: "Mediolan" } },
  { country: "IT", en: "Rome", names: { de: "Rom", it: "Roma", es: "Roma", pl: "Rzym" } },
  { country: "IT", en: "Turin", names: { it: "Torino", nl: "Turijn", es: "Turín", pl: "Turyn" } },
  { country: "IT", en: "Naples", names: { de: "Neapel", it: "Napoli", nl: "Napels", es: "Nápoles", pl: "Neapol" } },
  { country: "IT", en: "Florence", names: { de: "Florenz", it: "Firenze", es: "Florencia", pl: "Florencja" } },
  { country: "IT", en: "Venice", names: { de: "Venedig", fr: "Venise", it: "Venezia", nl: "Venetië", es: "Venecia", pl: "Wenecja" } },
  { country: "IT", en: "Genoa", names: { de: "Genua", fr: "Gênes", it: "Genova", nl: "Genua", es: "Génova", pl: "Genua" } },
  { country: "IT", en: "Bologna", names: { fr: "Bologne", es: "Bolonia", pl: "Bolonia" } },
  { country: "IT", en: "Padua", names: { fr: "Padoue", it: "Padova", pl: "Padwa" } },
  // Spain
  { country: "ES", en: "Madrid" },
  { country: "ES", en: "Barcelona", names: { fr: "Barcelone", it: "Barcellona" } },
  { country: "ES", en: "Seville", names: { de: "Sevilla", fr: "Séville", it: "Siviglia", nl: "Sevilla", es: "Sevilla", pl: "Sewilla" } },
  { country: "ES", en: "Valencia", names: { fr: "Valence", pl: "Walencja" } },
  { country: "ES", en: "Zaragoza", names: { de: "Saragossa", fr: "Saragosse", it: "Saragozza", pl: "Saragossa" } },
  { country: "ES", en: "Málaga" },
  { country: "ES", en: "A Coruña", aliases: ["La Coruña", "Coruña"] },
  // France
  { country: "FR", en: "Paris", names: { it: "Parigi", nl: "Parijs", es: "París", pl: "Paryż" } },
  { country: "FR", en: "Marseille", names: { it: "Marsiglia", es: "Marsella", pl: "Marsylia" }, aliases: ["Marseilles"] },
  { country: "FR", en: "Lyon", names: { it: "Lione" }, aliases: ["Lyons"] },
  { country: "FR", en: "Nice", names: { de: "Nizza", it: "Nizza", es: "Niza", pl: "Nicea" } },
  { country: "FR", en: "Strasbourg", names: { de: "Straßburg", it: "Strasburgo", nl: "Straatsburg", es: "Estrasburgo", pl: "Strasburg" } },
  { country: "FR", en: "Toulouse", names: { it: "Tolosa" } },
  { country: "FR", en: "Bordeaux", names: { es: "Burdeos" } },
  { country: "FR", en: "Lille", names: { it: "Lilla", nl: "Rijsel" } },
  // Benelux
  { country: "NL", en: "The Hague", names: { de: "Den Haag", fr: "La Haye", it: "L'Aia", nl: "Den Haag", es: "La Haya", pl: "Haga" }, aliases: ["'s-Gravenhage"] },
  { country: "NL", en: "'s-Hertogenbosch", names: { fr: "Bois-le-Duc" }, aliases: ["Den Bosch"] },
  { country: "BE", en: "Brussels", names: { de: "Brüssel", fr: "Bruxelles", it: "Bruxelles", nl: "Brussel", es: "Bruselas", pl: "Bruksela" } },
  { country: "BE", en: "Antwerp", names: { de: "Antwerpen", fr: "Anvers", it: "Anversa", nl: "Antwerpen", es: "Amberes", pl: "Antwerpia" } },
  { country: "BE", en: "Ghent", names: { de: "Gent", fr: "Gand", it: "Gand", nl: "Gent", es: "Gante", pl: "Gandawa" } },
  { country: "BE", en: "Bruges", names: { de: "Brügge", nl: "Brugge", es: "Brujas", pl: "Brugia" } },
  { country: "BE", en: "Leuven", names: { de: "Löwen", fr: "Louvain", it: "Lovanio", es: "Lovaina", pl: "Lowanium" } },
  { country: "BE", en: "Liège", names: { de: "Lüttich", it: "Liegi", nl: "Luik", es: "Lieja" } },
  { country: "LU", en: "Luxembourg", names: { de: "Luxemburg", it: "Lussemburgo", nl: "Luxemburg", es: "Luxemburgo", pl: "Luksemburg" } },
  // Elsewhere
  { country: "AT", en: "Vienna", names: { de: "Wien", fr: "Vienne", nl: "Wenen", es: "Viena", pl: "Wiedeń" } },
  { country: "CZ", en: "Prague", names: { de: "Prag", it: "Praga", nl: "Praag", es: "Praga", pl: "Praga" }, aliases: ["Praha"] },
  { country: "PT", en: "Lisbon", names: { de: "Lissabon", fr: "Lisbonne", it: "Lisbona", nl: "Lissabon", es: "Lisboa", pl: "Lizbona" }, aliases: ["Lisboa"] },
  { country: "PT", en: "Porto", aliases: ["Oporto"] },
  { country: "DK", en: "Copenhagen", names: { de: "Kopenhagen", fr: "Copenhague", it: "Copenaghen", nl: "Kopenhagen", es: "Copenhague", pl: "Kopenhaga" }, aliases: ["København"] },
  { country: "SE", en: "Stockholm", names: { it: "Stoccolma", es: "Estocolmo", pl: "Sztokholm" } },
  { country: "SE", en: "Gothenburg", names: { de: "Göteborg", fr: "Göteborg", it: "Göteborg", nl: "Göteborg", es: "Gotemburgo", pl: "Göteborg" } },
  { country: "CH", en: "Zurich", names: { de: "Zürich", it: "Zurigo", nl: "Zürich", es: "Zúrich", pl: "Zurych" } },
  { country: "CH", en: "Geneva", names: { de: "Genf", fr: "Genève", it: "Ginevra", nl: "Genève", es: "Ginebra", pl: "Genewa" } },
  { country: "CH", en: "Basel", names: { fr: "Bâle", it: "Basilea", es: "Basilea", pl: "Bazylea" }, aliases: ["Basle"] },
  { country: "CH", en: "Bern", names: { fr: "Berne", it: "Berna", es: "Berna", pl: "Berno" } },
  { country: "GR", en: "Athens", names: { de: "Athen", fr: "Athènes", it: "Atene", nl: "Athene", es: "Atenas", pl: "Ateny" }, aliases: ["Athina", "Αθήνα"] },
  { country: "RO", en: "Bucharest", names: { de: "Bukarest", fr: "Bucarest", it: "Bucarest", nl: "Boekarest", es: "Bucarest", pl: "Bukareszt" }, aliases: ["București"] },
  { country: "HU", en: "Budapest", names: { pl: "Budapeszt" } },
  { country: "IE", en: "Dublin", names: { es: "Dublín" } },
  { country: "FI", en: "Helsinki", aliases: ["Helsingfors"] },
];

// Case-, accent- and spacing-insensitive, including the letters NFD
// doesn't decompose ("Łódź" and "Lodz" fold to the same key).
export function foldCityName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[łŁ]/g, "l")
    .replace(/ß/g, "ss")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const CANONICAL = new Map<string, City>();
for (const city of CITIES) {
  for (const name of [city.en, ...Object.values(city.names ?? {}), ...(city.aliases ?? [])]) {
    CANONICAL.set(`${city.country}|${foldCityName(name)}`, city);
  }
}

function lookup(name: string, country: CountryCode | null): City | undefined {
  return country ? CANONICAL.get(`${country}|${foldCityName(name)}`) : undefined;
}

// The one name a city is filtered and counted under; a city not in the
// table keeps the feed's spelling.
export function canonicalCity(name: string, country: CountryCode | null): string {
  return lookup(name, country)?.en ?? name.trim();
}

// Every known name of a city, so a search for "Warschau" or "Warszawa"
// finds listings located in "Warsaw".
export function cityNamesFor(name: string, country: CountryCode | null): string[] {
  const city = lookup(name, country);
  return city ? [city.en, ...Object.values(city.names ?? {}), ...(city.aliases ?? [])] : [name];
}

// Canonical name -> its name in each interface language that differs from
// English, for the frontend (reference data).
export const CITY_DISPLAY_NAMES: Record<string, Partial<Record<InterfaceLanguage, string>>> = Object.fromEntries(
  CITIES.filter((c) => c.names).map((c) => [c.en, c.names!])
);
