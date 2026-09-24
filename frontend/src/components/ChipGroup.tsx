export function ChipGroup({
  options,
  selected,
  onToggle,
  label = (value) => value,
}: {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  // What a chip shows, when that differs from the value it stands for
  // (a translated label for a stored English value).
  label?: (value: string) => string;
}) {
  return (
    <div className="chip-group">
      {options.map((opt) => (
        <button
          type="button"
          key={opt}
          className={`chip transition ${selected.includes(opt) ? "selected" : ""}`}
          onClick={() => onToggle(opt)}
          aria-pressed={selected.includes(opt)}
        >
          {label(opt)}
        </button>
      ))}
    </div>
  );
}
