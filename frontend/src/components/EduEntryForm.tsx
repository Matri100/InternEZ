import type { EducationEntry, EducationLevel, FieldGroup, RegionDef } from "../types/domain";
import { SearchableSelect } from "./SearchableSelect";
import { YearSelect } from "./YearSelect";
import { useUniversities } from "../hooks/useUniversities";

const OTHER_UNIVERSITY = "Other (not listed)";

interface Props {
  entry: EducationEntry;
  levels: EducationLevel[];
  fieldGroups: FieldGroup[];
  regions: RegionDef[];
  onChange: (patch: Partial<EducationEntry>) => void;
  onRemove: () => void;
}

export function EduEntryForm({ entry, levels, fieldGroups, regions, onChange, onRemove }: Props) {
  const { universities: countryUniversities, loading } = useUniversities(entry.country);
  const options = entry.country ? [...countryUniversities, OTHER_UNIVERSITY] : [];

  return (
    <div className="edu-entry">
      <button type="button" className="edu-entry-remove" onClick={onRemove} aria-label="Remove education entry">
        Remove
      </button>
      <div className="field-row">
        <div className="field">
          <label>Level</label>
          <select
            className="input"
            value={entry.level}
            onChange={(e) => onChange({ level: e.target.value as EducationLevel })}
          >
            {levels.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Field of study</label>
          <select className="input" value={entry.field} onChange={(e) => onChange({ field: e.target.value })}>
            {fieldGroups.map((group) => (
              <optgroup key={group.category} label={group.category}>
                {group.fields.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Country</label>
          <select
            className="input"
            value={entry.country}
            onChange={(e) => onChange({ country: e.target.value as EducationEntry["country"], institution: "" })}
          >
            <option value="">Select country</option>
            {regions.map((region) => (
              <optgroup key={region.code} label={region.name}>
                {region.countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Institution</label>
          {entry.country ? (
            <SearchableSelect
              options={options}
              value={entry.institution}
              onChange={(v) => onChange({ institution: v })}
              placeholder={loading ? "Loading universities…" : `Search ${countryUniversities.length.toLocaleString()} universities…`}
              disabled={loading}
            />
          ) : (
            <SearchableSelect options={[]} value="" onChange={() => {}} disabled disabledHint="Select a country first" />
          )}
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Start year</label>
          <YearSelect value={entry.startYear} onChange={(v) => onChange({ startYear: v })} />
        </div>
        <div className="field">
          <label>End year (or expected)</label>
          <YearSelect value={entry.endYear} onChange={(v) => onChange({ endYear: v })} maxYear={2032} />
        </div>
      </div>
    </div>
  );
}
