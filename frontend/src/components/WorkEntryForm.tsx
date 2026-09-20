import type { FieldGroup, SkillGroup, WorkExperienceEntry } from "../types/domain";
import { SearchableMultiSelect } from "./SearchableMultiSelect";
import { MonthYearPicker } from "./MonthYearPicker";

interface Props {
  entry: WorkExperienceEntry;
  index: number;
  fieldGroups: FieldGroup[];
  skillGroups: SkillGroup[];
  onChange: (patch: Partial<WorkExperienceEntry>) => void;
  onRemove: () => void;
}

export function WorkEntryForm({ entry, index, fieldGroups, skillGroups, onChange, onRemove }: Props) {
  return (
    <div className="edu-entry">
      <button type="button" className="edu-entry-remove" onClick={onRemove} aria-label="Remove work experience entry">
        Remove
      </button>
      <div className="field-row">
        <div className="field">
          <label>Title / role</label>
          <input
            className="input"
            value={entry.title}
            placeholder={`Work experience ${index + 1}`}
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Organization</label>
          <input
            className="input"
            value={entry.organization}
            onChange={(e) => onChange({ organization: e.target.value })}
          />
        </div>
      </div>
      <div className="field">
        <label>Field / domain</label>
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
      <div className="field-row">
        <div className="field">
          <label>Start</label>
          <MonthYearPicker value={entry.startDate} onChange={(v) => onChange({ startDate: v })} />
        </div>
        <div className="field">
          <label>End</label>
          {entry.endDate === "Present" ? (
            <div className="input month-picker-trigger" style={{ color: "var(--text-secondary)" }}>
              Present
            </div>
          ) : (
            <MonthYearPicker value={entry.endDate} onChange={(v) => onChange({ endDate: v })} />
          )}
          <label className="present-toggle">
            <input
              type="checkbox"
              checked={entry.endDate === "Present"}
              onChange={(e) => onChange({ endDate: e.target.checked ? "Present" : "" })}
            />
            I currently work here
          </label>
        </div>
      </div>
      <div className="field">
        <label>Skills used</label>
        <SearchableMultiSelect
          groups={skillGroups.map((g) => ({ category: g.category, options: g.skills }))}
          selected={entry.skills}
          onChange={(skills) => onChange({ skills })}
          placeholder="Search skills…"
        />
      </div>
    </div>
  );
}
