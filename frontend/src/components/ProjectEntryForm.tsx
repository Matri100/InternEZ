import type { ProjectEntry, SkillGroup } from "../types/domain";
import { SearchableMultiSelect } from "./SearchableMultiSelect";

interface Props {
  entry: ProjectEntry;
  index: number;
  skillGroups: SkillGroup[];
  onChange: (patch: Partial<ProjectEntry>) => void;
  onRemove: () => void;
}

export function ProjectEntryForm({ entry, index, skillGroups, onChange, onRemove }: Props) {
  return (
    <div className="edu-entry">
      <button type="button" className="edu-entry-remove" onClick={onRemove} aria-label="Remove project">
        Remove
      </button>
      <div className="field">
        <label>Project title</label>
        <input
          className="input"
          value={entry.title}
          placeholder={`Project ${index + 1}`}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </div>
      <div className="field">
        <label>Description</label>
        <textarea
          className="input"
          rows={3}
          value={entry.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="What did you build, and what was your role?"
        />
      </div>
      <div className="field">
        <label>Link (optional)</label>
        <input
          className="input"
          value={entry.link}
          onChange={(e) => onChange({ link: e.target.value })}
          placeholder="https://"
        />
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
