import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppData";
import { useReferenceData } from "../context/ReferenceData";
import { api } from "../api/client";
import { ChipGroup } from "../components/ChipGroup";
import { EduEntryForm } from "../components/EduEntryForm";
import { WorkEntryForm } from "../components/WorkEntryForm";
import { ProjectEntryForm } from "../components/ProjectEntryForm";
import { CertificationEntryForm } from "../components/CertificationEntryForm";
import { DocumentsEditor } from "../components/DocumentsEditor";
import { LanguageProficiencyEditor } from "../components/LanguageProficiencyEditor";
import { SearchableMultiSelect } from "../components/SearchableMultiSelect";
import { MonthYearPicker } from "../components/MonthYearPicker";
import { ExtensionSection } from "../components/ExtensionSection";
import { VoluntaryDisclosuresSection } from "../components/VoluntaryDisclosuresSection";
import { AccountSection } from "../components/AccountSection";
import type {
  Applicant,
  CertificationEntry,
  CountryCode,
  EducationEntry,
  InternshipLength,
  ProjectEntry,
  WorkArrangementPreference,
  WorkExperienceEntry,
} from "../types/domain";

function emptyEducation(applicantId: string): EducationEntry {
  return {
    id: `tmp_${Math.random().toString(36).slice(2)}`,
    applicantId,
    level: "Bachelor",
    institution: "",
    country: "",
    field: "General / Pre-university",
    startYear: "",
    endYear: "",
  };
}

function emptyWork(applicantId: string): WorkExperienceEntry {
  return {
    id: `tmp_${Math.random().toString(36).slice(2)}`,
    applicantId,
    title: "",
    organization: "",
    field: "General / Pre-university",
    startDate: "",
    endDate: "Present",
    skills: [],
  };
}

function emptyProject(applicantId: string): ProjectEntry {
  return {
    id: `tmp_${Math.random().toString(36).slice(2)}`,
    applicantId,
    title: "",
    description: "",
    link: "",
    skills: [],
  };
}

function emptyCertification(applicantId: string): CertificationEntry {
  return {
    id: `tmp_${Math.random().toString(36).slice(2)}`,
    applicantId,
    name: "",
    issuer: "",
    year: "",
  };
}

export function Profile() {
  const { profile, loading, refreshProfile } = useAppData();
  const { reference } = useReferenceData();
  const navigate = useNavigate();
  const [form, setForm] = useState<Applicant | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) setForm(structuredClone(profile));
  }, [profile]);

  if (loading || !form || !reference) {
    return (
      <div className="page page-narrow">
        <p style={{ color: "var(--text-secondary)" }}>Loading…</p>
      </div>
    );
  }

  function set<K extends keyof Applicant>(key: K, value: Applicant[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    setSaved(false);
  }

  function setCoverLetterPrompt(key: keyof Applicant["coverLetterPrompts"], value: string) {
    setForm((f) => (f ? { ...f, coverLetterPrompts: { ...f.coverLetterPrompts, [key]: value } } : f));
    setSaved(false);
  }

  function toggleListItem(key: "interests" | "qualifications", value: string) {
    setForm((f) => {
      if (!f) return f;
      const list = f[key];
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
      return { ...f, [key]: next };
    });
    setSaved(false);
  }

  function toggleWorkArrangement(value: WorkArrangementPreference) {
    setForm((f) => {
      if (!f) return f;
      const list = f.workArrangementPreference;
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
      return { ...f, workArrangementPreference: next };
    });
    setSaved(false);
  }

  function addEducation() {
    setForm((f) => (f ? { ...f, education: [...f.education, emptyEducation(f.id)] } : f));
  }
  function updateEducation(id: string, patch: Partial<EducationEntry>) {
    setForm((f) => (f ? { ...f, education: f.education.map((e) => (e.id === id ? { ...e, ...patch } : e)) } : f));
    setSaved(false);
  }
  function removeEducation(id: string) {
    setForm((f) => (f ? { ...f, education: f.education.filter((e) => e.id !== id) } : f));
    setSaved(false);
  }

  function addWork() {
    setForm((f) => (f ? { ...f, workExperience: [...f.workExperience, emptyWork(f.id)] } : f));
  }
  function updateWork(id: string, patch: Partial<WorkExperienceEntry>) {
    setForm((f) =>
      f ? { ...f, workExperience: f.workExperience.map((w) => (w.id === id ? { ...w, ...patch } : w)) } : f
    );
    setSaved(false);
  }
  function removeWork(id: string) {
    setForm((f) => (f ? { ...f, workExperience: f.workExperience.filter((w) => w.id !== id) } : f));
    setSaved(false);
  }

  function addProject() {
    setForm((f) => (f ? { ...f, projects: [...f.projects, emptyProject(f.id)] } : f));
  }
  function updateProject(id: string, patch: Partial<ProjectEntry>) {
    setForm((f) => (f ? { ...f, projects: f.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) } : f));
    setSaved(false);
  }
  function removeProject(id: string) {
    setForm((f) => (f ? { ...f, projects: f.projects.filter((p) => p.id !== id) } : f));
    setSaved(false);
  }

  function addCertification() {
    setForm((f) => (f ? { ...f, certifications: [...f.certifications, emptyCertification(f.id)] } : f));
  }
  function updateCertification(id: string, patch: Partial<CertificationEntry>) {
    setForm((f) =>
      f ? { ...f, certifications: f.certifications.map((c) => (c.id === id ? { ...c, ...patch } : c)) } : f
    );
    setSaved(false);
  }
  function removeCertification(id: string) {
    setForm((f) => (f ? { ...f, certifications: f.certifications.filter((c) => c.id !== id) } : f));
    setSaved(false);
  }

  async function save(andBrowse: boolean) {
    if (!form) return;
    setSaving(true);
    setSaveError(null);
    try {
      const { id, ...rest } = form;
      await api.saveProfile({ ...rest, profileComplete: true });
      await refreshProfile();
      setSaved(true);
      if (andBrowse) navigate("/browse");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Couldn't save your profile");
    } finally {
      setSaving(false);
    }
  }

  const lengths: InternshipLength[] = reference.internshipLengths;
  const countryOptions = reference.regions.map((region) => ({
    category: region.name,
    options: region.countries.map((c) => ({ value: c.code, label: c.name })),
  }));
  const skillGroupOptions = reference.skillGroups.map((g) => ({ category: g.category, options: g.skills }));

  return (
    <div className="page page-narrow">
      <div className="page-header">
        <div>
          <h1>Your profile</h1>
          <p>
            Fill this out once. It's what powers eligibility checks and match scores across every listing — no
            re-entering the same details for each application.
          </p>
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
            <h2>Contact</h2>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input id="name" className="input" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="phone">Phone</label>
              <input id="phone" className="input" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="portfolio">Portfolio / LinkedIn URL</label>
              <input
                id="portfolio"
                className="input"
                value={form.portfolioUrl}
                onChange={(e) => set("portfolioUrl", e.target.value)}
                placeholder="https://"
              />
            </div>
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-header">
            <span className="form-section-number">02</span>
            <h2>Eligibility background</h2>
            <span className="field-hint">Replaces a manual work-permit question — we derive it from this</span>
          </div>
          <div className="field-row">
            <CountrySelect
              label="Citizenship"
              value={form.citizenship}
              onChange={(v) => set("citizenship", v)}
              reference={reference}
            />
            <CountrySelect
              label="Second citizenship (optional)"
              value={form.secondCitizenship}
              onChange={(v) => set("secondCitizenship", v)}
              reference={reference}
            />
          </div>
          <div className="field-row">
            <CountrySelect
              label="Place of birth"
              value={form.placeOfBirth}
              onChange={(v) => set("placeOfBirth", v)}
              reference={reference}
            />
            <CountrySelect
              label="Current residence"
              value={form.residence}
              onChange={(v) => set("residence", v)}
              reference={reference}
            />
          </div>
          <p className="field-hint">
            InternEZ covers the EU/EEA (and Switzerland) exclusively, for now. Dual citizens: either citizenship
            counts toward eligibility — you don't need to pick the "better" one.
          </p>
        </section>

        <section className="form-section">
          <div className="form-section-header">
            <span className="form-section-number">03</span>
            <h2>Education</h2>
          </div>
          {form.education.length === 0 && (
            <p className="field-hint" style={{ marginBottom: 12 }}>
              Add at least one entry — high school counts if that's where you are.
            </p>
          )}
          {form.education.map((entry, i) => (
            <EduEntryForm
              key={entry.id}
              entry={entry}
              index={i}
              levels={reference.educationLevels}
              fieldGroups={reference.fieldGroups}
              regions={reference.regions}
              onChange={(patch) => updateEducation(entry.id, patch)}
              onRemove={() => removeEducation(entry.id)}
            />
          ))}
          <button type="button" className="btn btn-secondary btn-sm" onClick={addEducation}>
            + Add education entry
          </button>
        </section>

        <section className="form-section">
          <div className="form-section-header">
            <span className="form-section-number">04</span>
            <h2>Work experience</h2>
            <span className="field-hint">Optional — internships, part-time roles, research assistantships</span>
          </div>
          {form.workExperience.map((entry, i) => (
            <WorkEntryForm
              key={entry.id}
              entry={entry}
              index={i}
              fieldGroups={reference.fieldGroups}
              skillGroups={reference.skillGroups}
              onChange={(patch) => updateWork(entry.id, patch)}
              onRemove={() => removeWork(entry.id)}
            />
          ))}
          <button type="button" className="btn btn-secondary btn-sm" onClick={addWork}>
            + Add work experience
          </button>
        </section>

        <section className="form-section">
          <div className="form-section-header">
            <span className="form-section-number">05</span>
            <h2>Projects</h2>
            <span className="field-hint">Optional — course projects, side projects, competitions</span>
          </div>
          {form.projects.map((entry, i) => (
            <ProjectEntryForm
              key={entry.id}
              entry={entry}
              index={i}
              skillGroups={reference.skillGroups}
              onChange={(patch) => updateProject(entry.id, patch)}
              onRemove={() => removeProject(entry.id)}
            />
          ))}
          <button type="button" className="btn btn-secondary btn-sm" onClick={addProject}>
            + Add project
          </button>
        </section>

        <section className="form-section">
          <div className="form-section-header">
            <span className="form-section-number">06</span>
            <h2>Certifications</h2>
            <span className="field-hint">Optional — named credentials, not general qualifications</span>
          </div>
          {form.certifications.map((entry, i) => (
            <CertificationEntryForm
              key={entry.id}
              entry={entry}
              index={i}
              onChange={(patch) => updateCertification(entry.id, patch)}
              onRemove={() => removeCertification(entry.id)}
            />
          ))}
          <button type="button" className="btn btn-secondary btn-sm" onClick={addCertification}>
            + Add certification
          </button>
        </section>

        <section className="form-section">
          <div className="form-section-header">
            <span className="form-section-number">07</span>
            <h2>Availability &amp; preferences</h2>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Available from</label>
              <MonthYearPicker value={form.availableFrom} onChange={(v) => set("availableFrom", v)} />
            </div>
            <div className="field">
              <label htmlFor="preferredLength">Preferred internship length</label>
              <select
                id="preferredLength"
                className="input"
                value={form.preferredLength ?? ""}
                onChange={(e) => set("preferredLength", (e.target.value || null) as InternshipLength | null)}
              >
                <option value="">Select length</option>
                {lengths.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Work arrangement preference</label>
            <ChipGroup
              options={reference.workArrangementPreferences}
              selected={form.workArrangementPreference}
              onToggle={(v) => toggleWorkArrangement(v as WorkArrangementPreference)}
            />
          </div>
          <div className="field">
            <label>Preferred locations</label>
            <SearchableMultiSelect
              groups={countryOptions}
              selected={form.preferredLocations}
              onChange={(v) => set("preferredLocations", v as CountryCode[])}
              placeholder="Search countries…"
            />
            <span className="field-hint">Leave empty if you're open to anywhere in our current coverage.</span>
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-header">
            <span className="form-section-number">08</span>
            <h2>Languages</h2>
          </div>
          <LanguageProficiencyEditor
            value={form.languages}
            languages={reference.languages}
            levels={reference.languageLevels}
            onChange={(v) => set("languages", v)}
          />
        </section>

        <section className="form-section">
          <div className="form-section-header">
            <span className="form-section-number">09</span>
            <h2>Skills</h2>
            <span className="field-hint">Search to add — organized by domain</span>
          </div>
          <SearchableMultiSelect
            groups={skillGroupOptions}
            selected={form.skills}
            onChange={(v) => set("skills", v)}
            placeholder="Search skills…"
          />
        </section>

        <section className="form-section">
          <div className="form-section-header">
            <span className="form-section-number">10</span>
            <h2>Career interests &amp; qualifications</h2>
          </div>
          <div className="field">
            <label>Industries / career interests</label>
            <ChipGroup
              options={reference.interests}
              selected={form.interests}
              onToggle={(v) => toggleListItem("interests", v)}
            />
          </div>
          <div className="field">
            <label>Qualifications</label>
            <ChipGroup
              options={reference.qualifications}
              selected={form.qualifications}
              onToggle={(v) => toggleListItem("qualifications", v)}
            />
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-header">
            <span className="form-section-number">11</span>
            <h2>Files</h2>
            <span className="field-hint">ID photo, transcript, or other supporting documents</span>
          </div>
          <DocumentsEditor value={form.documents} kinds={reference.documentKinds} onChange={(v) => set("documents", v)} />
        </section>

        <section className="form-section">
          <div className="form-section-header">
            <span className="form-section-number">12</span>
            <h2>Summary</h2>
            <span className="field-hint">A few sentences — optional but helps employers get a sense of you</span>
          </div>
          <div className="field">
            <textarea
              className="input"
              rows={4}
              value={form.summary}
              onChange={(e) => set("summary", e.target.value)}
              placeholder="Briefly, who are you? What are you studying, what are you looking for in an internship, and what makes you a good fit?"
            />
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-header">
            <span className="form-section-number">13</span>
            <h2>Cover letter prompts</h2>
            <span className="field-hint">Optional — answer once, in your own words</span>
          </div>
          <p className="field-hint" style={{ maxWidth: "60ch", marginBottom: "var(--space-4)" }}>
            These aren't shown to employers directly. They're source material — so that whenever a listing needs
            a cover letter or an open-ended answer, there's something real to work from instead of a blank page.
          </p>
          <div className="field">
            <label htmlFor="promptWhyField">What draws you to this field, and why internships right now?</label>
            <textarea
              id="promptWhyField"
              className="input"
              rows={3}
              value={form.coverLetterPrompts.whyThisField}
              onChange={(e) => setCoverLetterPrompt("whyThisField", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="promptStrength">
              Tell us about a project, achievement, or experience you're proud of.
            </label>
            <textarea
              id="promptStrength"
              className="input"
              rows={3}
              value={form.coverLetterPrompts.provenStrength}
              onChange={(e) => setCoverLetterPrompt("provenStrength", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="promptStyle">How would you describe how you work, or what you bring to a team?</label>
            <textarea
              id="promptStyle"
              className="input"
              rows={3}
              value={form.coverLetterPrompts.workingStyle}
              onChange={(e) => setCoverLetterPrompt("workingStyle", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="promptGoals">What are you hoping to get out of an internship at this stage?</label>
            <textarea
              id="promptGoals"
              className="input"
              rows={3}
              value={form.coverLetterPrompts.careerGoals}
              onChange={(e) => setCoverLetterPrompt("careerGoals", e.target.value)}
            />
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-header">
            <span className="form-section-number">14</span>
            <h2>Visibility</h2>
            <span className="field-hint">Off by default</span>
          </div>
          <label className="present-toggle" style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>
            <input
              type="checkbox"
              checked={form.discoverable}
              onChange={(e) => set("discoverable", e.target.checked)}
            />
            Let companies discover my profile
          </label>
          <p className="field-hint" style={{ marginTop: 6, maxWidth: "56ch" }}>
            When on, companies can find you in talent search and reach out about roles — even ones you haven't
            applied to. Your contact details are only shared once you reply.
          </p>
        </section>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button type="submit" className="btn btn-secondary" disabled={saving}>
            {saving ? "Saving…" : "Save profile"}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => save(true)} disabled={saving}>
            Save and browse listings
          </button>
          {saved && <span style={{ fontSize: 13, color: "var(--ok)" }}>Saved</span>}
          {saveError && <span style={{ fontSize: 13, color: "var(--blocked)" }}>{saveError}</span>}
          <Link to="/profile/resume" className="btn btn-ghost" style={{ marginLeft: "auto" }}>
            Download resume (PDF)
          </Link>
        </div>
      </form>

      <ExtensionSection />
      <VoluntaryDisclosuresSection
        genderIdentityOptions={reference.genderIdentityOptions}
        raceEthnicityOptions={reference.raceEthnicityOptions}
        veteranStatusOptions={reference.veteranStatusOptions}
        disabilityStatusOptions={reference.disabilityStatusOptions}
      />
      <AccountSection exportUrl="/api/profile/export" onDeleteAccount={() => api.deleteAccount()} />
    </div>
  );
}

function CountrySelect({
  label,
  value,
  onChange,
  reference,
}: {
  label: string;
  value: CountryCode | null;
  onChange: (v: CountryCode | null) => void;
  reference: { regions: { code: string; name: string; countries: { code: string; name: string }[] }[] };
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <select
        className="input"
        value={value ?? ""}
        onChange={(e) => onChange((e.target.value || null) as CountryCode | null)}
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
  );
}
