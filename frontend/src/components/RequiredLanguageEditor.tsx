import type { LanguageLevel, RequiredLanguage } from "../types/domain";

interface Props {
  value: RequiredLanguage[];
  languages: string[];
  levels: LanguageLevel[];
  onChange: (next: RequiredLanguage[]) => void;
}

export function RequiredLanguageEditor({ value, languages, levels, onChange }: Props) {
  const usedLanguages = new Set(value.map((v) => v.language));
  const availableToAdd = languages.filter((l) => !usedLanguages.has(l));

  function update(index: number, patch: Partial<RequiredLanguage>) {
    onChange(value.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }
  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }
  function add() {
    if (availableToAdd.length === 0) return;
    onChange([...value, { language: availableToAdd[0], minLevel: "Conversational" }]);
  }

  return (
    <div>
      {value.map((rl, i) => (
        <div className="language-row" key={`${rl.language}-${i}`}>
          <select className="input" value={rl.language} onChange={(e) => update(i, { language: e.target.value })}>
            <option value={rl.language}>{rl.language}</option>
            {availableToAdd.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <select className="input" value={rl.minLevel} onChange={(e) => update(i, { minLevel: e.target.value as LanguageLevel })}>
            {levels.map((l) => (
              <option key={l} value={l}>
                Min. {l}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove(i)}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-secondary btn-sm" onClick={add} disabled={availableToAdd.length === 0}>
        + Add language requirement
      </button>
      {value.length === 0 && <p className="field-hint" style={{ marginTop: 6 }}>No language requirement — leave empty if any language is fine.</p>}
    </div>
  );
}
