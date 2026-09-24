import type { LanguageLevel, LanguageProficiency } from "../types/domain";
import { useI18n } from "../i18n";

interface Props {
  value: LanguageProficiency[];
  languages: string[];
  levels: LanguageLevel[];
  onChange: (next: LanguageProficiency[]) => void;
}

export function LanguageProficiencyEditor({ value, languages, levels, onChange }: Props) {
  const { t, languageName, locale } = useI18n();
  const usedLanguages = new Set(value.map((v) => v.language));
  // Sorted by name in the interface language; the stored value stays the
  // English name (backend data/reference.ts LANGUAGES).
  const availableToAdd = languages
    .filter((l) => !usedLanguages.has(l))
    .sort((a, b) => languageName(a).localeCompare(languageName(b), locale));
  const label = (l: string) => {
    const name = languageName(l);
    return name.charAt(0).toLocaleUpperCase() + name.slice(1);
  };

  function update(index: number, patch: Partial<LanguageProficiency>) {
    onChange(value.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function add() {
    if (availableToAdd.length === 0) return;
    onChange([...value, { language: availableToAdd[0], level: "Conversational" }]);
  }

  return (
    <div>
      {value.map((lp, i) => (
        <div className="language-row" key={`${lp.language}-${i}`}>
          <select
            className="input"
            value={lp.language}
            onChange={(e) => update(i, { language: e.target.value })}
          >
            <option value={lp.language}>{label(lp.language)}</option>
            {availableToAdd.map((l) => (
              <option key={l} value={l}>
                {label(l)}
              </option>
            ))}
          </select>
          <select className="input" value={lp.level} onChange={(e) => update(i, { level: e.target.value as LanguageLevel })}>
            {levels.map((l) => (
              <option key={l} value={l}>
                {t(`languageLevel.${l}`)}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove(i)} aria-label={t("languages.remove")}>
            {t("entry.remove")}
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-secondary btn-sm" onClick={add} disabled={availableToAdd.length === 0}>
        {t("languages.add")}
      </button>
    </div>
  );
}
