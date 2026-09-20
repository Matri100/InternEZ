interface Props {
  value: string;
  onChange: (value: string) => void;
  minYear?: number;
  maxYear?: number;
  placeholder?: string;
}

export function YearSelect({ value, onChange, minYear = 1995, maxYear = 2032, placeholder = "Select year" }: Props) {
  const years: number[] = [];
  for (let y = maxYear; y >= minYear; y--) years.push(y);

  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {years.map((y) => (
        <option key={y} value={String(y)}>
          {y}
        </option>
      ))}
    </select>
  );
}
