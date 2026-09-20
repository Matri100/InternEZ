import { useState } from "react";
import type { EligibilityResult } from "../types/domain";
import { ShieldIcon } from "./icons";

export const ELIGIBILITY_LABELS: Record<EligibilityResult["level"], string> = {
  ok: "Eligible",
  review: "Possible pathway",
  blocked: "Likely not eligible",
};

const LABELS = ELIGIBILITY_LABELS;

export function EligibilityFlag({ result }: { result: EligibilityResult }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        className={`eligibility-flag ${result.level} transition`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={LABELS[result.level]}
        title={LABELS[result.level]}
      >
        <ShieldIcon />
      </button>
      {open && <p className="eligibility-explain">{result.why}</p>}
    </div>
  );
}
