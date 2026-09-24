import type { CertificationEntry } from "../types/domain";
import { YearSelect } from "./YearSelect";
import { useI18n } from "../i18n";

interface Props {
  entry: CertificationEntry;
  index: number;
  onChange: (patch: Partial<CertificationEntry>) => void;
  onRemove: () => void;
}

export function CertificationEntryForm({ entry, index, onChange, onRemove }: Props) {
  const { t } = useI18n();
  return (
    <div className="edu-entry">
      <button type="button" className="edu-entry-remove" onClick={onRemove} aria-label={t("entry.removeCertification")}>
        {t("entry.remove")}
      </button>
      <div className="field-row">
        <div className="field">
          <label>{t("entry.certificationName")}</label>
          <input
            className="input"
            value={entry.name}
            placeholder={t("entry.certificationPlaceholder", { n: index + 1 })}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </div>
        <div className="field">
          <label>{t("entry.issuer")}</label>
          <input className="input" value={entry.issuer} onChange={(e) => onChange({ issuer: e.target.value })} />
        </div>
      </div>
      <div className="field" style={{ maxWidth: 200 }}>
        <label>{t("entry.yearEarned")}</label>
        <YearSelect value={entry.year} onChange={(year) => onChange({ year })} />
      </div>
    </div>
  );
}
