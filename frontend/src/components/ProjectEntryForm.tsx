import type { ProjectEntry, SkillGroup } from "../types/domain";
import { SearchableMultiSelect } from "./SearchableMultiSelect";
import { useI18n } from "../i18n";

interface Props {
  entry: ProjectEntry;
  index: number;
  skillGroups: SkillGroup[];
  onChange: (patch: Partial<ProjectEntry>) => void;
  onRemove: () => void;
}

export function ProjectEntryForm({ entry, index, skillGroups, onChange, onRemove }: Props) {
  const { t } = useI18n();
  return (
    <div className="edu-entry">
      <button type="button" className="edu-entry-remove" onClick={onRemove} aria-label={t("entry.removeProject")}>
        {t("entry.remove")}
      </button>
      <div className="field">
        <label>{t("entry.projectTitle")}</label>
        <input
          className="input"
          value={entry.title}
          placeholder={t("entry.projectPlaceholder", { n: index + 1 })}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </div>
      <div className="field">
        <label>{t("entry.description")}</label>
        <textarea
          className="input"
          rows={3}
          value={entry.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder={t("entry.descriptionPlaceholder")}
        />
      </div>
      <div className="field">
        <label>{t("entry.linkOptional")}</label>
        <input
          className="input"
          value={entry.link}
          onChange={(e) => onChange({ link: e.target.value })}
          placeholder="https://"
        />
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
