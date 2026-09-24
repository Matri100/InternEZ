// Interface translation, without a library: typed message catalogs
// (messages/*.ts), plural rules and date/number/country/language names from
// the browser's built-in Intl APIs. English ships in the main bundle; each
// other language is its own small chunk, loaded when chosen.
import {
  cloneElement,
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { en, type MessageKey, type Messages, type Plural } from "./messages/en";
import { detectLocale, LOCALE_STORAGE_KEY, type Locale } from "./locales";

type Params = Record<string, string | number>;

const LOADERS: Record<Locale, () => Promise<Messages>> = {
  en: async () => en,
  de: () => import("./messages/de").then((m) => m.de),
  fr: () => import("./messages/fr").then((m) => m.fr),
  it: () => import("./messages/it").then((m) => m.it),
  nl: () => import("./messages/nl").then((m) => m.nl),
  es: () => import("./messages/es").then((m) => m.es),
  pl: () => import("./messages/pl").then((m) => m.pl),
};

// The app's language values are English names (Listing.language and the
// profile's languages, from backend data/reference.ts) — mapped to codes so
// Intl can name them in the interface language.
const LANGUAGE_CODES: Record<string, string> = {
  English: "en", German: "de", French: "fr", Danish: "da", Swedish: "sv", Norwegian: "no", Dutch: "nl",
  Spanish: "es", Italian: "it", Polish: "pl", Portuguese: "pt", Finnish: "fi", Mandarin: "zh", Japanese: "ja",
  Korean: "ko", Cantonese: "yue", Russian: "ru", Arabic: "ar", Hindi: "hi", Turkish: "tr", Ukrainian: "uk",
  Czech: "cs", Hungarian: "hu", Romanian: "ro", Greek: "el", Hebrew: "he", Thai: "th", Vietnamese: "vi",
  Indonesian: "id",
};

// ISO code of a language named in English ("German" -> "de"), or null.
export function languageCodeOf(englishName: string): string | null {
  return LANGUAGE_CODES[englishName] ?? null;
}

interface I18nValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, params?: Params) => string;
  // The message with its <tag> markers kept — for <T>.
  rich: (key: MessageKey, params?: Params) => string;
  formatDate: (date: Date, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number) => string;
  countryName: (code: string) => string;
  languageName: (englishName: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

function interpolate(text: string, params: Params | undefined, formatNumber: (n: number) => string): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => {
    const value = params[name];
    if (value === undefined) return whole;
    return typeof value === "number" ? formatNumber(value) : value;
  });
}

// Removes <tag>…</tag> markers (keeping the text between them) for places
// that need a plain string — a title attribute, an aria-label.
function stripTags(text: string): string {
  return text.replace(/<\/?\w+>/g, "");
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ locale: Locale; messages: Messages } | null>(null);

  const load = useCallback((locale: Locale) => {
    LOADERS[locale]()
      .then((messages) => setState({ locale, messages }))
      // A language chunk that fails to load (offline, a deploy replaced it)
      // falls back to English rather than leaving the app blank.
      .catch(() => setState({ locale: "en", messages: en }));
  }, []);

  useEffect(() => load(detectLocale()), [load]);

  useEffect(() => {
    if (state) document.documentElement.lang = state.locale;
  }, [state]);

  const setLocale = useCallback(
    (locale: Locale) => {
      try {
        localStorage.setItem(LOCALE_STORAGE_KEY, locale);
      } catch {
        // Not persisted when storage is blocked — the choice still applies now.
      }
      load(locale);
    },
    [load]
  );

  const value = useMemo((): I18nValue | null => {
    if (!state) return null;
    const { locale, messages } = state;
    const numberFormat = new Intl.NumberFormat(locale);
    const plurals = new Intl.PluralRules(locale);
    const formatNumber = (n: number) => numberFormat.format(n);
    let regions: Intl.DisplayNames | null = null;
    let languages: Intl.DisplayNames | null = null;
    try {
      regions = new Intl.DisplayNames([locale], { type: "region" });
      languages = new Intl.DisplayNames([locale], { type: "language" });
    } catch {
      // Older browsers without Intl.DisplayNames show the raw values.
    }

    function resolve(key: MessageKey, params?: Params): string {
      const entry = (messages[key] ?? en[key]) as string | Plural;
      if (typeof entry === "string") return interpolate(entry, params, formatNumber);
      const count = Number(params?.count ?? 0);
      const form = plurals.select(count) as keyof Plural;
      return interpolate(entry[form] ?? entry.other, params, formatNumber);
    }

    return {
      locale,
      setLocale,
      t: (key, params) => stripTags(resolve(key, params)),
      rich: resolve,
      formatDate: (date, options = { day: "numeric", month: "short", year: "numeric" }) =>
        new Intl.DateTimeFormat(locale, options).format(date),
      formatNumber,
      countryName: (code) => regions?.of(code) ?? code,
      languageName: (englishName) => {
        const code = LANGUAGE_CODES[englishName];
        return (code && languages?.of(code)) || englishName;
      },
    };
  }, [state, setLocale]);

  // Nothing renders until the first catalog is in — a split second, and it
  // avoids English flashing up before the visitor's own language.
  if (!value) return null;

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

// For messages with markup: <T k="auth.newHere" tags={{ link: <Link to="/signup" /> }} />
// renders "New here? <link>Create an account</link>" with the link element
// wrapped around its text. Tags can't nest — none of our messages need it.
export function T({ k, params, tags }: { k: MessageKey; params?: Params; tags: Record<string, ReactElement> }) {
  const text = useI18n().rich(k, params);
  const parts: ReactNode[] = [];
  const pattern = /<(\w+)>(.*?)<\/\1>/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    parts.push(text.slice(last, match.index));
    const element = tags[match[1]];
    parts.push(element ? cloneElement(element, { key: match.index }, match[2]) : match[2]);
    last = pattern.lastIndex;
  }
  parts.push(text.slice(last));
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>{part}</Fragment>
      ))}
    </>
  );
}
