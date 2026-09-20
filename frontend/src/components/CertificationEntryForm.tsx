import type { CertificationEntry } from "../types/domain";
import { YearSelect } from "./YearSelect";

interface Props {
  entry: CertificationEntry;
  index: number;
  onChange: (patch: Partial<CertificationEntry>) => void;
  onRemove: () => void;
}

export function CertificationEntryForm({ entry, index, onChange, onRemove }: Props) {
  return (
    <div className="edu-entry">
      <button type="button" className="edu-entry-remove" onClick={onRemove} aria-label="Remove certification">
        Remove
      </button>
      <div className="field-row">
        <div className="field">
          <label>Certification name</label>
          <input
            className="input"
            value={entry.name}
            placeholder={`Certification ${index + 1}`}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Issuing organization</label>
          <input className="input" value={entry.issuer} onChange={(e) => onChange({ issuer: e.target.value })} />
        </div>
      </div>
      <div className="field" style={{ maxWidth: 200 }}>
        <label>Year earned</label>
        <YearSelect value={entry.year} onChange={(year) => onChange({ year })} />
      </div>
    </div>
  );
}
