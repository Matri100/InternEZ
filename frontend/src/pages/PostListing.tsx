import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useReferenceData } from "../context/ReferenceData";
import { api } from "../api/client";
import { SearchableMultiSelect } from "../components/SearchableMultiSelect";
import { ChipGroup } from "../components/ChipGroup";
import { MonthYearPicker, formatMonthYear } from "../components/MonthYearPicker";
import { RequiredLanguageEditor } from "../components/RequiredLanguageEditor";
import { TextListEditor } from "../components/TextListEditor";
import { ExtraQuestionsEditor } from "../components/ExtraQuestionsEditor";
import type {
  CountryCode,
  EducationLevel,
  InternshipLength,
  Listing,
  RegionCode,
  RequiredLanguage,
  WorkArrangement,
} from "../types/domain";

type FormState = Omit<Listing, "id" | "companyId" | "createdAt">;

function emptyForm(): FormState {
  return {
    title: "",
    location: "",
    country: null,
    origin: "direct",
    department: "",
    workArrangement: "On-site",
    requiredEducationLevel: "Bachelor",
    duration: "6 months",
    startDate: "",
    startLabel: "",
    endLabel: "",
    compensation: "",
    applicationDeadline: "",
    description: "",
    // Overwritten server-side from title+description on save (see
    // services/language.ts) — no form field for it, this default is only
    // ever seen if the request somehow fails before that.
    language: "English",
    requirements: [],
    skills: [],
    targetFields: [],
    requiredLanguages: [],
    industries: [],
    preferredQualifications: [],
    eligibility: {},
    extraQuestions: [],
  };
}

export function PostListing() {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { reference, loading: refLoading } = useReferenceData();

  const [form, setForm] = useState<FormState>(emptyForm());
  const [loaded, setLoaded] = useState(!isEditing);
  const [endDate, setEndDate] = useState("");
  const [flexibleStart, setFlexibleStart] = useState(false);
  const [eligibilityType, setEligibilityType] = useState<"regions" | "citizen">("regions");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing || !id) return;
    api.getCompanyListing(id).then((listing) => {
      const { id: _id, companyId: _cid, createdAt: _createdAt, ...rest } = listing as Listing;
      setForm(rest);
      setFlexibleStart(listing.startDate === "flexible");
      setEligibilityType(listing.eligibility.citizenOnly ? "citizen" : "regions");
      setLoaded(true);
    });
  }, [id, isEditing]);

  if (refLoading || !reference || !loaded) {
    return (
      <div className="page page-narrow">
        <p style={{ color: "var(--text-secondary)" }}>Loading…</p>
      </div>
    );
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const fieldOptions = reference!.fieldGroups.map((g) => ({ category: g.category, options: g.fields }));
  const skillOptions = reference!.skillGroups.map((g) => ({ category: g.category, options: g.skills }));

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const startLabel = flexibleStart ? "Flexible" : formatMonthYear(form.startDate);
      const endLabel = endDate ? formatMonthYear(endDate) : form.endLabel;
      // InternEZ is EU/EEA-only, so "region-based" eligibility only ever
      // means one region — no picker needed, just the one allowed value.
      const eligibility =
        eligibilityType === "citizen"
          ? { citizenOnly: form.eligibility.citizenOnly, clearance: form.eligibility.clearance }
          : { allowedRegions: ["EU" as RegionCode] };

      const payload: FormState = {
        ...form,
        startDate: flexibleStart ? "flexible" : form.startDate,
        startLabel,
        endLabel,
        eligibility,
        extraQuestions: form.extraQuestions.filter((q) => q.prompt.trim()),
      };

      if (isEditing && id) {
        await api.updateListing(id, payload);
      } else {
        await api.createListing(payload);
      }
      navigate("/company/listings");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save this listing");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page page-narrow">
      <div className="page-header">
        <div>
          <h1>{isEditing ? "Edit listing" : "Post a listing"}</h1>
          <p>Every field here feeds the eligibility check and match score applicants see — be specific.</p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <section className="form-section">
          <div className="form-section-header">
            <span className="form-section-number">01</span>
            <h2>Basics</h2>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Title</label>
              <input className="input" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Software Engineering Intern" />
            </div>
            <div className="field">
              <label>Department</label>
              <input className="input" value={form.department} onChange={(e) => set("department", e.target.value)} placeholder="Perception & Navigation" />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Location (displayed text)</label>
              <input className="input" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Copenhagen, Denmark" />
            </div>
            <div className="field">
              <label>Country (for matching)</label>
              <select
                className="input"
                value={form.country ?? ""}
                onChange={(e) => set("country", (e.target.value || null) as CountryCode | null)}
              >
                <option value="">Remote / no fixed base</option>
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
          </div>
          <div className="field">
            <label>Work arrangement</label>
            <ChipGroup
              options={reference.workArrangements}
              selected={[form.workArrangement]}
              onToggle={(v) => set("workArrangement", v as WorkArrangement)}
            />
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-header">
            <span className="form-section-number">02</span>
            <h2>Role requirements</h2>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Minimum education level</label>
              <select className="input" value={form.requiredEducationLevel} onChange={(e) => set("requiredEducationLevel", e.target.value as EducationLevel)}>
                {reference.educationLevels.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Duration</label>
              <select className="input" value={form.duration} onChange={(e) => set("duration", e.target.value as InternshipLength)}>
                {reference.internshipLengths.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Target fields of study</label>
            <SearchableMultiSelect groups={fieldOptions} selected={form.targetFields} onChange={(v) => set("targetFields", v)} placeholder="Search fields…" />
          </div>
          <div className="field">
            <label>Relevant skills</label>
            <SearchableMultiSelect groups={skillOptions} selected={form.skills} onChange={(v) => set("skills", v)} placeholder="Search skills…" />
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-header">
            <span className="form-section-number">03</span>
            <h2>Dates &amp; compensation</h2>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Start</label>
              {flexibleStart ? (
                <div className="input month-picker-trigger" style={{ color: "var(--text-secondary)" }}>Flexible</div>
              ) : (
                <MonthYearPicker value={form.startDate} onChange={(v) => set("startDate", v)} />
              )}
              <label className="present-toggle">
                <input type="checkbox" checked={flexibleStart} onChange={(e) => setFlexibleStart(e.target.checked)} />
                Flexible start date
              </label>
            </div>
            <div className="field">
              <label>End (for display only)</label>
              <MonthYearPicker value={endDate} onChange={setEndDate} placeholder="Select end month" />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Application deadline</label>
              <input type="date" className="input" value={form.applicationDeadline} onChange={(e) => set("applicationDeadline", e.target.value)} />
            </div>
            <div className="field">
              <label>Compensation</label>
              <input className="input" value={form.compensation} onChange={(e) => set("compensation", e.target.value)} placeholder="2,000 EUR / month" />
            </div>
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-header">
            <span className="form-section-number">04</span>
            <h2>Description &amp; requirements</h2>
          </div>
          <div className="field">
            <label>Description</label>
            <textarea className="input" rows={5} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What will this intern actually work on?" />
          </div>
          <div className="field">
            <label>Requirements</label>
            <TextListEditor value={form.requirements} onChange={(v) => set("requirements", v)} placeholder="e.g. Currently pursuing a degree in..." addLabel="+ Add requirement" />
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-header">
            <span className="form-section-number">05</span>
            <h2>Eligibility</h2>
            <span className="field-hint">Drives the eligibility flag applicants see</span>
          </div>
          <div className="field">
            <ChipGroup
              options={["Open to any EU/EEA applicant", "Citizens of one country only"]}
              selected={[eligibilityType === "regions" ? "Open to any EU/EEA applicant" : "Citizens of one country only"]}
              onToggle={(v) => setEligibilityType(v === "Citizens of one country only" ? "citizen" : "regions")}
            />
          </div>
          {eligibilityType === "regions" ? (
            <p className="field-hint">
              Any applicant with citizenship, residence, education, or birth connected to the EU/EEA can apply.
            </p>
          ) : (
            <div className="field-row">
              <div className="field">
                <label>Citizenship required</label>
                <select
                  className="input"
                  value={form.eligibility.citizenOnly ?? ""}
                  onChange={(e) => set("eligibility", { ...form.eligibility, citizenOnly: (e.target.value || undefined) as CountryCode | undefined })}
                >
                  <option value="">Select country</option>
                  {reference.regions.flatMap((r) => r.countries).map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="present-toggle" style={{ marginTop: 28 }}>
                  <input
                    type="checkbox"
                    checked={!!form.eligibility.clearance}
                    onChange={(e) => set("eligibility", { ...form.eligibility, clearance: e.target.checked })}
                  />
                  Also requires security clearance eligibility
                </label>
              </div>
            </div>
          )}
        </section>

        <section className="form-section">
          <div className="form-section-header">
            <span className="form-section-number">06</span>
            <h2>Language requirements</h2>
            <span className="field-hint">Optional</span>
          </div>
          <RequiredLanguageEditor
            value={form.requiredLanguages}
            languages={reference.languages}
            levels={reference.languageLevels}
            onChange={(v: RequiredLanguage[]) => set("requiredLanguages", v)}
          />
        </section>

        <section className="form-section">
          <div className="form-section-header">
            <span className="form-section-number">07</span>
            <h2>Industries &amp; preferred qualifications</h2>
          </div>
          <div className="field">
            <label>Industries</label>
            <ChipGroup
              options={reference.interests}
              selected={form.industries}
              onToggle={(v) => set("industries", form.industries.includes(v) ? form.industries.filter((i) => i !== v) : [...form.industries, v])}
            />
          </div>
          <div className="field">
            <label>Preferred qualifications</label>
            <ChipGroup
              options={reference.qualifications}
              selected={form.preferredQualifications}
              onToggle={(v) => set("preferredQualifications", form.preferredQualifications.includes(v) ? form.preferredQualifications.filter((q) => q !== v) : [...form.preferredQualifications, v])}
            />
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-header">
            <span className="form-section-number">08</span>
            <h2>Extra questions</h2>
            <span className="field-hint">Optional — asked in the apply flow, any mix of types</span>
          </div>
          <ExtraQuestionsEditor value={form.extraQuestions} onChange={(v) => set("extraQuestions", v)} />
        </section>

        {error && <p style={{ color: "var(--blocked)", fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <div style={{ display: "flex", gap: 12 }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : isEditing ? "Save changes" : "Post listing"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate("/company/listings")}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
