import type { FieldGroup, SkillGroup, WorkExperienceEntry } from "../types/domain";
import { SearchableMultiSelect } from "./SearchableMultiSelect";
import { MonthYearPicker } from "./MonthYearPicker";
import { useI18n } from "../i18n";

interface Props {
  entry: WorkExperienceEntry;
  index: number;
  fieldGroups: FieldGroup[];
  skillGroups: SkillGroup[];
  onChange: (patch: Partial<WorkExperienceEntry>) => void;
  onRemove: () => void;
}

export function WorkEntryForm({ entry, index, fieldGroups, skillGroups, onChange, onRemove }: Props) {
  const { t, ref } = useI18n();
  return (
    <div className="edu-entry">
      <button type="button" className="edu-entry-remove" onClick={onRemove} aria-label={t("entry.removeWork")}>
        {t("entry.remove")}
      </button>
      <div className="field-row">
        <div className="field">
          <label>{t("entry.titleRole")}</label>
          <input
            className="input"
            value={entry.title}
            placeholder={t("entry.workPlaceholder", { n: index + 1 })}
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </div>
        <div className="field">
          <label>{t("entry.organization")}</label>
          <input
            className="input"
            value={entry.organization}
            onChange={(e) => onChange({ organization: e.target.value })}
          />
        </div>
      </div>
      <div className="field">
        <label>{t("entry.fieldDomain")}</label>
        <select className="input" value={entry.field} onChange={(e) => onChange({ field: e.target.value })}>
          {fieldGroups.map((group) => (
            <optgroup key={group.category} label={ref("fieldCategory", group.category)}>
              {group.fields.map((f) => (
                <option key={f} value={f}>
                  {ref("field", f)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <div className="field-row">
        <div className="field">
          <label>{t("entry.start")}</label>
          <MonthYearPicker value={entry.startDate} onChange={(v) => onChange({ startDate: v })} />
        </div>
        <div className="field">
          <label>{t("entry.end")}</label>
          {entry.endDate === "Present" ? (
            <div className="input month-picker-trigger" style={{ color: "var(--text-secondary)" }}>
              {t("entry.present")}
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
            {t("entry.currentlyWorkHere")}
          </label>
        </div>
      </div>
      <div className="field">
        <label>{t("entry.skillsUsed")}</label>
        <SearchableMultiSelect
          groups={skillGroups.map((g) => ({ category: g.category, options: g.skills }))}
          selected={entry.skills}
          onChange={(skills) => onChange({ skills })}
          placeholder={t("profile.searchSkills")}
        />
      </div>
    </div>
  );
}
