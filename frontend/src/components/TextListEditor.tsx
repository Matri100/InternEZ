interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  addLabel?: string;
}

export function TextListEditor({ value, onChange, placeholder, addLabel = "+ Add" }: Props) {
  function update(index: number, text: string) {
    onChange(value.map((v, i) => (i === index ? text : v)));
  }
  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }
  function add() {
    onChange([...value, ""]);
  }

  return (
    <div>
      {value.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            className="input"
            value={item}
            placeholder={placeholder}
            onChange={(e) => update(i, e.target.value)}
          />
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove(i)} aria-label="Remove">
            ×
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-secondary btn-sm" onClick={add}>
        {addLabel}
      </button>
    </div>
  );
}
