import { Link } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";
import { T, useI18n } from "../i18n";
import { LanguageMenu } from "../components/LanguageMenu";

export function Landing() {
  const { theme, toggle } = useTheme();
  const { t } = useI18n();

  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-header-inner">
          <span className="wordmark">
            Intern<span>EZ</span>
          </span>
          <div className="landing-header-actions">
            <Link to="/signup?role=company" className="landing-header-link">
              {t("landing.forCompanies")}
            </Link>
            <Link to="/login" className="landing-header-link">
              {t("landing.logIn")}
            </Link>
            <button type="button" className="theme-toggle" onClick={toggle} aria-label={t("landing.toggleTheme")}>
              {theme === "light" ? t("landing.themeDark") : t("landing.themeLight")}
            </button>
            <LanguageMenu />
          </div>
        </div>
      </header>

      <section className="landing-hero">
        <p className="landing-hero-kicker">{t("landing.kicker")}</p>
        <h1>
          <T k="landing.title" tags={{ em: <span className="highlight" /> }} />
        </h1>
        <p className="landing-hero-sub">{t("landing.subtitle")}</p>
        <div className="landing-hero-actions">
          <Link to="/signup?role=applicant" className="btn btn-primary landing-cta">
            {t("landing.cta")}
          </Link>
          <Link to="/signup?role=company" className="landing-hero-secondary">
            {t("landing.ctaCompany")}
          </Link>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-heading">
          <h2>{t("landing.howItWorks")}</h2>
        </div>
        <div className="landing-steps">
          <div className="landing-step">
            <span className="landing-step-number">01</span>
            <h3>{t("landing.step1Title")}</h3>
            <p>{t("landing.step1Body")}</p>
          </div>
          <div className="landing-step">
            <span className="landing-step-number">02</span>
            <h3>{t("landing.step2Title")}</h3>
            <p>{t("landing.step2Body")}</p>
          </div>
          <div className="landing-step">
            <span className="landing-step-number">03</span>
            <h3>{t("landing.step3Title")}</h3>
            <p>{t("landing.step3Body")}</p>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-alt">
        <div className="landing-section-heading">
          <h2>{t("landing.aboutTitle")}</h2>
        </div>
        <div className="landing-about">
          <p>{t("landing.about1")}</p>
          <p>{t("landing.about2")}</p>
          <p className="landing-about-focus">{t("landing.about3")}</p>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-for-companies">
          <div>
            <h2>{t("landing.companiesTitle")}</h2>
            <p>{t("landing.companiesBody")}</p>
          </div>
          <Link to="/signup?role=company" className="btn btn-secondary">
            {t("landing.postListing")}
          </Link>
        </div>
      </section>

      <footer className="landing-footer">
        <span className="wordmark">
          Intern<span>EZ</span>
        </span>
        <span className="landing-footer-note">
          {t("landing.footer")} <Link to="/terms">{t("landing.terms")}</Link> ·{" "}
          <Link to="/privacy">{t("landing.privacy")}</Link>
        </span>
      </footer>
    </div>
  );
}
