import type { LanguageLevel, LanguageProficiency } from "../types/domain";

interface Props {
  value: LanguageProficiency[];
  languages: string[];
  levels: LanguageLevel[];
  onChange: (next: LanguageProficiency[]) => void;
}

export function LanguageProficiencyEditor({ value, languages, levels, onChange }: Props) {
  const usedLanguages = new Set(value.map((v) => v.language));
  const availableToAdd = languages.filter((l) => !usedLanguages.has(l));

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
            <option value={lp.language}>{lp.language}</option>
            {availableToAdd.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <select className="input" value={lp.level} onChange={(e) => update(i, { level: e.target.value as LanguageLevel })}>
            {levels.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove(i)} aria-label="Remove language">
            Remove
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-secondary btn-sm" onClick={add} disabled={availableToAdd.length === 0}>
        + Add language
      </button>
    </div>
  );
}
