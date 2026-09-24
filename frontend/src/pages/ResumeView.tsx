import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppData";
import { useReferenceData } from "../context/ReferenceData";
import { useI18n } from "../i18n";

// The resume's headings and dates follow the interface language; what the
// applicant wrote (titles, descriptions, skills) is shown as written.
export function ResumeView() {
  const { profile, loading } = useAppData();
  const { reference } = useReferenceData();
  const navigate = useNavigate();
  const { t, ref, formatDate, countryName, languageName } = useI18n();

  const monthYear = (value: string): string => {
    if (!value) return "";
    if (value === "Present") return t("entry.present");
    const [year, month] = value.split("-");
    if (!month) return year;
    return formatDate(new Date(Number(year), Number(month) - 1), { month: "short", year: "numeric" });
  };

  // Printing needs the browser's own print dialog, not a click handler run
  // ahead of the page actually painting — a fresh mount is the signal.
  useEffect(() => {
    const title = t("resume.title");
    document.title = profile ? `${profile.name || title} — ${title}` : title;
    return () => {
      document.title = "InternEZ";
    };
  }, [profile, t]);

  if (loading || !profile || !reference) {
    return (
      <div className="page page-narrow">
        <p style={{ color: "var(--text-secondary)" }}>{t("common.loading")}</p>
      </div>
    );
  }

  const primaryEducation = [...profile.education].sort((a, b) => b.endYear.localeCompare(a.endYear));

  return (
    <div className="page page-narrow resume-page">
      <div className="resume-toolbar no-print">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
          {t("resume.back")}
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => window.print()}>
          {t("resume.download")}
        </button>
      </div>

      <article className="resume-doc">
        <header className="resume-doc-header">
          <h1>{profile.name || t("resume.unnamed")}</h1>
          <p className="resume-doc-contact">
            {[profile.email, profile.phone, profile.portfolioUrl].filter(Boolean).join("  ·  ")}
          </p>
          <p className="resume-doc-contact">
            {[
              profile.residence ? t("resume.basedIn", { country: countryName(profile.residence) }) : null,
              [profile.citizenship, profile.secondCitizenship].filter(Boolean).length > 0
                ? t("resume.citizen", {
                    countries: [profile.citizenship, profile.secondCitizenship]
                      .filter((c): c is NonNullable<typeof c> => Boolean(c))
                      .map((c) => countryName(c))
                      .join(" / "),
                  })
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
            <h2>{t("resume.education")}</h2>
            {primaryEducation.map((e) => (
              <div className="resume-doc-entry" key={e.id}>
                <div className="resume-doc-entry-head">
                  <strong>
                    {t("resume.degreeIn", { level: t(`education.${e.level}`), field: ref("field", e.field) })}
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
            <h2>{t("resume.work")}</h2>
            {profile.workExperience.map((w) => (
              <div className="resume-doc-entry" key={w.id}>
                <div className="resume-doc-entry-head">
                  <strong>
                    {w.title} — {w.organization}
                  </strong>
                  <span>
                    {monthYear(w.startDate)} – {monthYear(w.endDate) || t("entry.present")}
                  </span>
                </div>
                {w.skills.length > 0 && <p>{w.skills.join(", ")}</p>}
              </div>
            ))}
          </section>
        )}

        {profile.projects.length > 0 && (
          <section className="resume-doc-section">
            <h2>{t("resume.projects")}</h2>
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
            <h2>{t("resume.certifications")}</h2>
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
            <h2>{t("resume.skills")}</h2>
            <p>{profile.skills.join(", ")}</p>
          </section>
        )}

        {profile.languages.length > 0 && (
          <section className="resume-doc-section">
            <h2>{t("resume.languages")}</h2>
            <p>
              {profile.languages
                .map((l) => `${languageName(l.language)} (${t(`languageLevel.${l.level}`)})`)
                .join(", ")}
            </p>
          </section>
        )}
      </article>
    </div>
  );
}
