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
import { useI18n } from "../i18n";
import { errorText } from "../i18n/errors";
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
  const { t, ref, countryName, locale } = useI18n();

  useEffect(() => {
    if (profile) setForm(structuredClone(profile));
  }, [profile]);

  if (loading || !form || !reference) {
    return (
      <div className="page page-narrow">
        <p style={{ color: "var(--text-secondary)" }}>{t("common.loading")}</p>
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
      setSaveError(e instanceof Error && e.message ? errorText(e, t) : t("profile.saveError"));
    } finally {
      setSaving(false);
    }
  }

  const lengths: InternshipLength[] = reference.internshipLengths;
  const countryOptions = reference.regions.map((region) => ({
    category: ref("region", region.name),
    options: region.countries
      .map((c) => ({ value: c.code, label: countryName(c.code) }))
      .sort((a, b) => a.label.localeCompare(b.label, locale)),
  }));
  const skillGroupOptions = reference.skillGroups.map((g) => ({ category: g.category, options: g.skills }));

  return (
    <div className="page page-narrow">
      <div className="page-header">
        <div>
          <h1>{t("profile.title")}</h1>
          <p>{t("profile.intro")}</p>
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
            <h2>{t("profile.sectionContact")}</h2>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="name">{t("profile.fullName")}</label>
              <input id="name" className="input" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="email">{t("profile.email")}</label>
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
              <label htmlFor="phone">{t("profile.phone")}</label>
              <input id="phone" className="input" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="portfolio">{t("profile.portfolio")}</label>
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
            <h2>{t("profile.sectionEligibility")}</h2>
            <span className="field-hint">{t("profile.sectionEligibilityHint")}</span>
          </div>
          <div className="field-row">
            <CountrySelect
              label={t("profile.citizenship")}
              value={form.citizenship}
              onChange={(v) => set("citizenship", v)}
              reference={reference}
            />
            <CountrySelect
              label={t("profile.secondCitizenship")}
              value={form.secondCitizenship}
              onChange={(v) => set("secondCitizenship", v)}
              reference={reference}
            />
          </div>
          <div className="field-row">
            <CountrySelect
              label={t("profile.placeOfBirth")}
              value={form.placeOfBirth}
              onChange={(v) => set("placeOfBirth", v)}
              reference={reference}
            />
            <CountrySelect
              label={t("profile.residence")}
              value={form.residence}
              onChange={(v) => set("residence", v)}
              reference={reference}
            />
          </div>
          <p className="field-hint">
            {t("profile.eligibilityNote")}
          </p>
        </section>

        <section className="form-section">
          <div className="form-section-header">
            <span className="form-section-number">03</span>
            <h2>{t("profile.sectionEducation")}</h2>
          </div>
          {form.education.length === 0 && (
            <p className="field-hint" style={{ marginBottom: 12 }}>
              {t("profile.educationEmpty")}
            </p>
          )}
          {form.education.map((entry) => (
            <EduEntryForm
              key={entry.id}
              entry={entry}
              levels={reference.educationLevels}
              fieldGroups={reference.fieldGroups}
              regions={reference.regions}
              onChange={(patch) => updateEducation(entry.id, patch)}
              onRemove={() => removeEducation(entry.id)}
            />
          ))}
          <button type="button" className="btn btn-secondary btn-sm" onClick={addEducation}>
            {t("profile.addEducation")}
          </button>
        </section>

        <section className="form-section">
          <div className="form-section-header">
            <span className="form-section-number">04</span>
            <h2>{t("profile.sectionWork")}</h2>
            <span className="field-hint">{t("profile.sectionWorkHint")}</span>
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
            {t("profile.addWork")}
          </button>
        </section>

        <section className="form-section">
          <div className="form-section-header">
            <span className="form-section-number">05</span>
            <h2>{t("profile.sectionProjects")}</h2>
            <span className="field-hint">{t("profile.sectionProjectsHint")}</span>
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
            {t("profile.addProject")}
          </button>
        </section>

        <section className="form-section">
          <div className="form-section-header">
            <span className="form-section-number">06</span>
            <h2>{t("profile.sectionCertifications")}</h2>
            <span className="field-hint">{t("profile.sectionCertificationsHint")}</span>
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
            {t("profile.addCertification")}
          </button>
        </section>

        <section className="form-section">
          <div className="form-section-header">
            <span className="form-section-number">07</span>
            <h2>{t("profile.sectionAvailability")}</h2>
          </div>
          <div className="field-row">
            <div className="field">
              <label>{t("profile.availableFrom")}</label>
              <MonthYearPicker value={form.availableFrom} onChange={(v) => set("availableFrom", v)} />
            </div>
            <div className="field">
              <label htmlFor="preferredLength">{t("profile.preferredLength")}</label>
              <select
                id="preferredLength"
                className="input"
                value={form.preferredLength ?? ""}
                onChange={(e) => set("preferredLength", (e.target.value || null) as InternshipLength | null)}
              >
                <option value="">{t("profile.selectLength")}</option>
                {lengths.map((l) => (
                  <option key={l} value={l}>
                    {t(`duration.${l}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label>{t("profile.workArrangementPref")}</label>
            <ChipGroup
              options={reference.workArrangementPreferences}
              selected={form.workArrangementPreference}
              onToggle={(v) => toggleWorkArrangement(v as WorkArrangementPreference)}
              label={(v) => t(`arrangement.${v as WorkArrangementPreference}`)}
            />
          </div>
          <div className="field">
            <label>{t("profile.preferredLocations")}</label>
            <SearchableMultiSelect
              groups={countryOptions}
              selected={form.preferredLocations}
              onChange={(v) => set("preferredLocations", v as CountryCode[])}
              placeholder={t("profile.searchCountries")}
            />
            <span className="field-hint">{t("profile.preferredLocationsHint")}</span>
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-header">
            <span className="form-section-number">08</span>
            <h2>{t("profile.sectionLanguages")}</h2>
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
            <h2>{t("profile.sectionSkills")}</h2>
            <span className="field-hint">{t("profile.sectionSkillsHint")}</span>
          </div>
          <SearchableMultiSelect
            groups={skillGroupOptions}
            selected={form.skills}
            onChange={(v) => set("skills", v)}
            placeholder={t("profile.searchSkills")}
          />
        </section>

        <section className="form-section">
          <div className="form-section-header">
            <span className="form-section-number">10</span>
            <h2>{t("profile.sectionInterests")}</h2>
          </div>
          <div className="field">
            <label>{t("profile.interests")}</label>
            <ChipGroup
              options={reference.interests}
              selected={form.interests}
              onToggle={(v) => toggleListItem("interests", v)}
              label={(v) => ref("interest", v)}
            />
          </div>
          <div className="field">
            <label>{t("profile.qualifications")}</label>
            <ChipGroup
              options={reference.qualifications}
              selected={form.qualifications}
              onToggle={(v) => toggleListItem("qualifications", v)}
              label={(v) => ref("qualification", v)}
            />
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-header">
            <span className="form-section-number">11</span>
            <h2>{t("profile.sectionFiles")}</h2>
            <span className="field-hint">{t("profile.sectionFilesHint")}</span>
          </div>
          <DocumentsEditor value={form.documents} kinds={reference.documentKinds} onChange={(v) => set("documents", v)} />
        </section>

        <section className="form-section">
          <div className="form-section-header">
            <span className="form-section-number">12</span>
            <h2>{t("profile.sectionSummary")}</h2>
            <span className="field-hint">{t("profile.sectionSummaryHint")}</span>
          </div>
          <div className="field">
            <textarea
              className="input"
              rows={4}
              value={form.summary}
              onChange={(e) => set("summary", e.target.value)}
              placeholder={t("profile.summaryPlaceholder")}
            />
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-header">
            <span className="form-section-number">13</span>
            <h2>{t("profile.sectionPrompts")}</h2>
            <span className="field-hint">{t("profile.sectionPromptsHint")}</span>
          </div>
          <p className="field-hint" style={{ maxWidth: "60ch", marginBottom: "var(--space-4)" }}>
            {t("profile.promptsIntro")}
          </p>
          <div className="field">
            <label htmlFor="promptWhyField">{t("profile.promptWhyField")}</label>
            <textarea
              id="promptWhyField"
              className="input"
              rows={3}
              value={form.coverLetterPrompts.whyThisField}
              onChange={(e) => setCoverLetterPrompt("whyThisField", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="promptStrength">{t("profile.promptStrength")}</label>
            <textarea
              id="promptStrength"
              className="input"
              rows={3}
              value={form.coverLetterPrompts.provenStrength}
              onChange={(e) => setCoverLetterPrompt("provenStrength", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="promptStyle">{t("profile.promptStyle")}</label>
            <textarea
              id="promptStyle"
              className="input"
              rows={3}
              value={form.coverLetterPrompts.workingStyle}
              onChange={(e) => setCoverLetterPrompt("workingStyle", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="promptGoals">{t("profile.promptGoals")}</label>
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
            <h2>{t("profile.sectionVisibility")}</h2>
            <span className="field-hint">{t("profile.sectionVisibilityHint")}</span>
          </div>
          <label className="present-toggle" style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>
            <input
              type="checkbox"
              checked={form.discoverable}
              onChange={(e) => set("discoverable", e.target.checked)}
            />
            {t("profile.discoverable")}
          </label>
          <p className="field-hint" style={{ marginTop: 6, maxWidth: "56ch" }}>
            {t("profile.discoverableHint")}
          </p>
        </section>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button type="submit" className="btn btn-secondary" disabled={saving}>
            {saving ? t("common.saving") : t("profile.save")}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => save(true)} disabled={saving}>
            {t("profile.saveAndBrowse")}
          </button>
          {saved && <span style={{ fontSize: 13, color: "var(--ok)" }}>{t("profile.saved")}</span>}
          {saveError && <span style={{ fontSize: 13, color: "var(--blocked)" }}>{saveError}</span>}
          <Link to="/profile/resume" className="btn btn-ghost" style={{ marginLeft: "auto" }}>
            {t("profile.downloadResume")}
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
  const { t, ref, countryName, locale } = useI18n();
  return (
    <div className="field">
      <label>{label}</label>
      <select
        className="input"
        value={value ?? ""}
        onChange={(e) => onChange((e.target.value || null) as CountryCode | null)}
      >
        <option value="">{t("profile.selectCountry")}</option>
        {reference.regions.map((region) => (
          <optgroup key={region.code} label={ref("region", region.name)}>
            {region.countries
              .map((c) => ({ code: c.code, name: countryName(c.code) }))
              .sort((a, b) => a.name.localeCompare(b.name, locale))
              .map((c) => (
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
