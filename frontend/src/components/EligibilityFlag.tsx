import { useState } from "react";
import type { EligibilityResult } from "../types/domain";
import { useI18n } from "../i18n";
import { eligibilityText } from "../lib/explanations";
import { ShieldIcon } from "./icons";

export function EligibilityFlag({ result }: { result: EligibilityResult }) {
  const [open, setOpen] = useState(false);
  const { t, countryName } = useI18n();
  const label = t(`eligibility.${result.level}`);

  return (
    <div>
      <button
        type="button"
        className={`eligibility-flag ${result.level} transition`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={label}
        title={label}
      >
        <ShieldIcon />
      </button>
      {open && <p className="eligibility-explain">{eligibilityText(result, t, countryName)}</p>}
    </div>
  );
}
