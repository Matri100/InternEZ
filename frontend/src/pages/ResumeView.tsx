import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppData";
import { useReferenceData } from "../context/ReferenceData";
import type { CountryCode } from "../types/domain";

function formatMonthYear(value: string): string {
  if (!value || value === "Present") return value || "";
  const [year, month] = value.split("-");
  if (!month) return year;
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export function ResumeView() {
  const { profile, loading } = useAppData();
  const { reference } = useReferenceData();
  const navigate = useNavigate();

  const countryName = useMemo(() => {
    const map = new Map<string, string>();
    reference?.regions.forEach((r) => r.countries.forEach((c) => map.set(c.code, c.name)));
    return (code: CountryCode | null | "") => (code ? map.get(code) ?? code : "");
  }, [reference]);

  // Printing needs the browser's own print dialog, not a click handler run
  // ahead of the page actually painting — a fresh mount is the signal.
  useEffect(() => {
    document.title = profile ? `${profile.name || "Resume"} — Resume` : "Resume";
    return () => {
      document.title = "InternEZ";
    };
  }, [profile]);

  if (loading || !profile || !reference) {
    return (
      <div className="page page-narrow">
        <p style={{ color: "var(--text-secondary)" }}>Loading…</p>
      </div>
    );
  }

  const primaryEducation = [...profile.education].sort((a, b) => b.endYear.localeCompare(a.endYear));

  return (
    <div className="page page-narrow resume-page">
      <div className="resume-toolbar no-print">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
          Back
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => window.print()}>
          Download as PDF
        </button>
      </div>

      <article className="resume-doc">
        <header className="resume-doc-header">
          <h1>{profile.name || "Unnamed applicant"}</h1>
          <p className="resume-doc-contact">
            {[profile.email, profile.phone, profile.portfolioUrl].filter(Boolean).join("  ·  ")}
          </p>
          <p className="resume-doc-contact">
            {[
              profile.residence ? `Based in ${countryName(profile.residence)}` : null,
              [profile.citizenship, profile.secondCitizenship].filter(Boolean).length > 0
                ? `${[profile.citizenship, profile.secondCitizenship]
                    .filter(Boolean)
                    .map((c) => countryName(c))
                    .join(" / ")} citizen`
                : null,
            ]
              .filter(Boolean)
              .join("  ·  ")}
          </p>
        </header>

        {profile.summary && (
          <section className="resume-doc-section">
            <p>{profile.summary}</p>
          </section>
        )}

        {primaryEducation.length > 0 && (
          <section className="resume-doc-section">
            <h2>Education</h2>
            {primaryEducation.map((e) => (
              <div className="resume-doc-entry" key={e.id}>
                <div className="resume-doc-entry-head">
                  <strong>
                    {e.level} in {e.field}
                  </strong>
                  <span>
                    {e.startYear}
                    {e.endYear ? `–${e.endYear}` : ""}
                  </span>
                </div>
                <p>
                  {e.institution}
                  {e.country ? `, ${countryName(e.country)}` : ""}
                </p>
              </div>
            ))}
          </section>
        )}

        {profile.workExperience.length > 0 && (
          <section className="resume-doc-section">
            <h2>Work experience</h2>
            {profile.workExperience.map((w) => (
              <div className="resume-doc-entry" key={w.id}>
                <div className="resume-doc-entry-head">
                  <strong>
                    {w.title} — {w.organization}
                  </strong>
                  <span>
                    {formatMonthYear(w.startDate)} – {formatMonthYear(w.endDate) || "Present"}
                  </span>
                </div>
                {w.skills.length > 0 && <p>{w.skills.join(", ")}</p>}
              </div>
            ))}
          </section>
        )}

        {profile.projects.length > 0 && (
          <section className="resume-doc-section">
            <h2>Projects</h2>
            {profile.projects.map((p) => (
              <div className="resume-doc-entry" key={p.id}>
                <div className="resume-doc-entry-head">
                  <strong>{p.title}</strong>
                  {p.link && <span>{p.link}</span>}
                </div>
                {p.description && <p>{p.description}</p>}
                {p.skills.length > 0 && <p>{p.skills.join(", ")}</p>}
              </div>
            ))}
          </section>
        )}

        {profile.certifications.length > 0 && (
          <section className="resume-doc-section">
            <h2>Certifications</h2>
            {profile.certifications.map((c) => (
              <div className="resume-doc-entry" key={c.id}>
                <div className="resume-doc-entry-head">
                  <strong>{c.name}</strong>
                  <span>{c.year}</span>
                </div>
                <p>{c.issuer}</p>
              </div>
            ))}
          </section>
        )}

        {profile.skills.length > 0 && (
          <section className="resume-doc-section">
            <h2>Skills</h2>
            <p>{profile.skills.join(", ")}</p>
          </section>
        )}

        {profile.languages.length > 0 && (
          <section className="resume-doc-section">
            <h2>Languages</h2>
            <p>{profile.languages.map((l) => `${l.language} (${l.level})`).join(", ")}</p>
          </section>
        )}
      </article>
    </div>
  );
}
