import type { EducationEntry, EducationLevel, FieldGroup, RegionDef } from "../types/domain";
import { SearchableSelect } from "./SearchableSelect";
import { YearSelect } from "./YearSelect";
import { useUniversities } from "../hooks/useUniversities";
import { useI18n } from "../i18n";

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
  const { t, ref, countryName, formatNumber, locale } = useI18n();

  return (
    <div className="edu-entry">
      <button type="button" className="edu-entry-remove" onClick={onRemove} aria-label={t("entry.removeEducation")}>
        {t("entry.remove")}
      </button>
      <div className="field-row">
        <div className="field">
          <label>{t("entry.level")}</label>
          <select
            className="input"
            value={entry.level}
            onChange={(e) => onChange({ level: e.target.value as EducationLevel })}
          >
            {levels.map((l) => (
              <option key={l} value={l}>
                {t(`education.${l}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>{t("entry.fieldOfStudy")}</label>
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
      </div>
      <div className="field-row">
        <div className="field">
          <label>{t("entry.country")}</label>
          <select
            className="input"
            value={entry.country}
            onChange={(e) => onChange({ country: e.target.value as EducationEntry["country"], institution: "" })}
          >
            <option value="">{t("profile.selectCountry")}</option>
            {regions.map((region) => (
              <optgroup key={region.code} label={ref("region", region.name)}>
                {region.countries
                  .map((c) => ({ code: c.code, name: countryName(c.code) }))
                  .sort((a, b) => a.name.localeCompare(b.name, locale))
                  .map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="field">
          <label>{t("entry.institution")}</label>
          {entry.country ? (
            <SearchableSelect
              options={options}
              value={entry.institution}
              onChange={(v) => onChange({ institution: v })}
              placeholder={
                loading
                  ? t("entry.loadingUniversities")
                  : t("entry.searchUniversities", { count: formatNumber(countryUniversities.length) })
              }
              disabled={loading}
            />
          ) : (
            <SearchableSelect
              options={[]}
              value=""
              onChange={() => {}}
              disabled
              disabledHint={t("entry.selectCountryFirst")}
            />
          )}
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>{t("entry.startYear")}</label>
          <YearSelect value={entry.startYear} onChange={(v) => onChange({ startYear: v })} />
        </div>
        <div className="field">
          <label>{t("entry.endYear")}</label>
          <YearSelect value={entry.endYear} onChange={(v) => onChange({ endYear: v })} maxYear={2032} />
        </div>
      </div>
    </div>
  );
}
