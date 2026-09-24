import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useI18n } from "../i18n";
import type { VoluntaryDisclosures } from "../types/domain";

const EMPTY: VoluntaryDisclosures = {
  genderIdentity: "",
  raceEthnicity: "",
  veteranStatus: "",
  disabilityStatus: "",
  consentToAutofill: false,
};

// Entirely separate from the main profile: its own GET/PUT endpoints, its
// own save button, never fetched or sent as part of Applicant. Some US
// companies' application forms (Greenhouse/Workday/Lever) ask these for
// their own equal-opportunity reporting; several of these categories are
// GDPR "special category" data, so nothing here is ever required, ever
// defaulted to a value, or ever shared with the browser extension unless
// the applicant explicitly consents to that separately from filling the
// fields in.
export function VoluntaryDisclosuresSection({
  genderIdentityOptions,
  raceEthnicityOptions,
  veteranStatusOptions,
  disabilityStatusOptions,
}: {
  genderIdentityOptions: string[];
  raceEthnicityOptions: string[];
  veteranStatusOptions: string[];
  disabilityStatusOptions: string[];
}) {
  const [form, setForm] = useState<VoluntaryDisclosures | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { t, ref } = useI18n();

  useEffect(() => {
    api.getVoluntaryDisclosures().then(setForm);
  }, []);

  function set<K extends keyof VoluntaryDisclosures>(key: K, value: VoluntaryDisclosures[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    setSaved(false);
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    try {
      const result = await api.saveVoluntaryDisclosures(form);
      setForm(result);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function clearAll() {
    setSaving(true);
    try {
      const result = await api.saveVoluntaryDisclosures(EMPTY);
      setForm(result);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (!form) return null;

  const hasAnyAnswer = Boolean(
    form.genderIdentity || form.raceEthnicity || form.veteranStatus || form.disabilityStatus
  );

  return (
    <section className="form-section">
      <div className="form-section-header">
        <h2>{t("disclosures.title")}</h2>
        <span className="field-hint">{t("disclosures.hint")}</span>
      </div>
      <p className="field-hint" style={{ maxWidth: "60ch", marginBottom: "var(--space-4)" }}>
        {t("disclosures.intro")}
      </p>

      <div className="field-row">
        <div className="field">
          <label htmlFor="genderIdentity">{t("disclosures.gender")}</label>
          <select
            id="genderIdentity"
            className="input"
            value={form.genderIdentity}
            onChange={(e) => set("genderIdentity", e.target.value)}
          >
            <option value="">{t("disclosures.noAnswer")}</option>
            {genderIdentityOptions.map((o) => (
              <option key={o} value={o}>
                {ref("gender", o)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="raceEthnicity">{t("disclosures.race")}</label>
          <select
            id="raceEthnicity"
            className="input"
            value={form.raceEthnicity}
            onChange={(e) => set("raceEthnicity", e.target.value)}
          >
            <option value="">{t("disclosures.noAnswer")}</option>
            {raceEthnicityOptions.map((o) => (
              <option key={o} value={o}>
                {ref("race", o)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="veteranStatus">{t("disclosures.veteran")}</label>
          <select
            id="veteranStatus"
            className="input"
            value={form.veteranStatus}
            onChange={(e) => set("veteranStatus", e.target.value)}
          >
            <option value="">{t("disclosures.noAnswer")}</option>
            {veteranStatusOptions.map((o) => (
              <option key={o} value={o}>
                {ref("veteran", o)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="disabilityStatus">{t("disclosures.disability")}</label>
          <select
            id="disabilityStatus"
            className="input"
            value={form.disabilityStatus}
            onChange={(e) => set("disabilityStatus", e.target.value)}
          >
            <option value="">{t("disclosures.noAnswer")}</option>
            {disabilityStatusOptions.map((o) => (
              <option key={o} value={o}>
                {ref("disability", o)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="detail-block">
        <label className="present-toggle" style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>
          <input
            type="checkbox"
            checked={form.consentToAutofill}
            onChange={(e) => set("consentToAutofill", e.target.checked)}
          />
          {t("disclosures.consent")}
        </label>
        <p className="field-hint" style={{ marginTop: 6, maxWidth: "56ch" }}>
          {t("disclosures.consentHint")}
        </p>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={save} disabled={saving}>
          {saving ? t("common.saving") : t("common.save")}
        </button>
        {hasAnyAnswer && (
          <button type="button" className="btn btn-ghost btn-sm" style={{ color: "var(--blocked)" }} onClick={clearAll} disabled={saving}>
            {t("disclosures.clear")}
          </button>
        )}
        {saved && <span style={{ fontSize: 13, color: "var(--ok)" }}>{t("profile.saved")}</span>}
      </div>
    </section>
  );
}
