import type { ExtraQuestion, ExtraQuestionType } from "../types/domain";

const TYPE_LABELS: Record<ExtraQuestionType, string> = {
  short_text: "Short text",
  long_text: "Long text",
  yes_no: "Yes / No",
};

interface Props {
  value: ExtraQuestion[];
  onChange: (next: ExtraQuestion[]) => void;
}

export function ExtraQuestionsEditor({ value, onChange }: Props) {
  function update(index: number, patch: Partial<ExtraQuestion>) {
    onChange(value.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function add() {
    onChange([
      ...value,
      { key: `q_${Date.now()}_${value.length}`, prompt: "", type: "long_text", required: false },
    ]);
  }

  return (
    <div>
      {value.map((q, i) => (
        <div className="edu-entry" key={q.key}>
          <button type="button" className="edu-entry-remove" onClick={() => remove(i)} aria-label="Remove question">
            Remove
          </button>
          <div className="field">
            <label>Question {i + 1}</label>
            <input
              className="input"
              value={q.prompt}
              onChange={(e) => update(i, { prompt: e.target.value })}
              placeholder="e.g. What draws you to this role?"
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Answer type</label>
              <select
                className="input"
                value={q.type}
                onChange={(e) => update(i, { type: e.target.value as ExtraQuestionType })}
              >
                {(Object.keys(TYPE_LABELS) as ExtraQuestionType[]).map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="present-toggle" style={{ marginTop: 28 }}>
                <input type="checkbox" checked={q.required} onChange={(e) => update(i, { required: e.target.checked })} />
                Required to submit
              </label>
            </div>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-secondary btn-sm" onClick={add}>
        + Add question
      </button>
      {value.length === 0 && (
        <p className="field-hint" style={{ marginTop: 8 }}>
          No extra questions — applicants can submit using just their profile.
        </p>
      )}
    </div>
  );
}
