import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useReferenceData } from "../context/ReferenceData";
import { useCompanyData } from "../context/CompanyData";
import { api } from "../api/client";
import { LogoUploadField } from "../components/LogoUploadField";
import { AccountSection } from "../components/AccountSection";
import type { Company, CompanySize } from "../types/domain";

export function CompanyProfile() {
  const { reference, loading: refLoading } = useReferenceData();
  const { company, loading, refreshCompany } = useCompanyData();
  const navigate = useNavigate();
  const [form, setForm] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (company) setForm(structuredClone(company));
  }, [company]);

  if (loading || refLoading || !form || !reference) {
    return (
      <div className="page page-narrow">
        <p style={{ color: "var(--text-secondary)" }}>Loading…</p>
      </div>
    );
  }

  function set<K extends keyof Company>(key: K, value: Company[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    setSaved(false);
  }

  async function save(andContinue: boolean) {
    if (!form) return;
    setSaving(true);
    try {
      const { id, verified, ...rest } = form;
      await api.saveCompany(rest);
      await refreshCompany();
      setSaved(true);
      if (andContinue) navigate("/company/listings/new");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page page-narrow">
      <div className="page-header">
        <div>
          <h1>Company profile</h1>
          <p>Shown to applicants on every listing you post — fill it out once.</p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(false);
        }}
      >
        <section className="form-section">
          <div className="form-section-header">
            <span className="form-section-number">01</span>
            <h2>Basics</h2>
          </div>
          <div className="field" style={{ marginBottom: 20 }}>
            <label>Logo</label>
            <LogoUploadField name={form.name} logoUrl={form.logoUrl} onChange={(url) => set("logoUrl", url)} />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="name">Company name</label>
              <input id="name" className="input" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="website">Website</label>
              <input
                id="website"
                className="input"
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
                placeholder="https://"
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              className="input"
              rows={4}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="What does your company do? What would an intern be walking into?"
            />
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-header">
            <span className="form-section-number">02</span>
            <h2>Details</h2>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="headquarters">Headquarters</label>
              <select
                id="headquarters"
                className="input"
                value={form.headquarters ?? ""}
                onChange={(e) => set("headquarters", (e.target.value || null) as Company["headquarters"])}
              >
                <option value="">Select country</option>
                {reference.regions.map((region) => (
                  <optgroup key={region.code} label={region.name}>
                    {region.countries.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="companySize">Company size</label>
              <select
                id="companySize"
                className="input"
                value={form.companySize ?? ""}
                onChange={(e) => set("companySize", (e.target.value || null) as CompanySize | null)}
              >
                <option value="">Select size</option>
                {reference.companySizes.map((s) => (
                  <option key={s} value={s}>
                    {s} employees
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="field-hint">
            Verification (the checkmark applicants see) is a platform decision, not self-declared — new company
            accounts start unverified.
          </p>
        </section>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button type="submit" className="btn btn-secondary" disabled={saving}>
            {saving ? "Saving…" : "Save profile"}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => save(true)} disabled={saving}>
            Save and post a listing
          </button>
          {saved && <span style={{ fontSize: 13, color: "var(--ok)" }}>Saved</span>}
        </div>
      </form>

      <AccountSection exportUrl="/api/company/export" onDeleteAccount={() => api.deleteCompanyAccount()} />
    </div>
  );
}
