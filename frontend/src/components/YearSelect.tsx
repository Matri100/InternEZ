import { useI18n } from "../i18n";

interface Props {
  value: string;
  onChange: (value: string) => void;
  minYear?: number;
  maxYear?: number;
  placeholder?: string;
}

export function YearSelect({ value, onChange, minYear = 1995, maxYear = 2032, placeholder }: Props) {
  const { t } = useI18n();
  const years: number[] = [];
  for (let y = maxYear; y >= minYear; y--) years.push(y);

  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder ?? t("entry.selectYear")}</option>
      {years.map((y) => (
        <option key={y} value={String(y)}>
          {y}
        </option>
      ))}
    </select>
  );
}
