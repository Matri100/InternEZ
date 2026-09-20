export function ChipGroup({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
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
          {opt}
        </button>
      ))}
    </div>
  );
}
