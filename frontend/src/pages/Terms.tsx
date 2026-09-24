import { Link } from "react-router-dom";
import { AccessibilityMenu } from "../components/AccessibilityMenu";
import { LanguageMenu } from "../components/LanguageMenu";
import { useI18n } from "../i18n";

const EFFECTIVE_DATE = "21 September 2026";

// Legal text stays in English only — a machine translation shouldn't be
// what anyone relies on. Other languages get a note saying so.
export function Terms() {
  const { t, locale } = useI18n();
  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-header-inner">
          <Link to="/" className="wordmark">
            Intern<span>EZ</span>
          </Link>
          <div className="landing-header-actions">
            <Link to="/" className="landing-header-link">
              {t("legal.backHome")}
            </Link>
            <AccessibilityMenu />
            <LanguageMenu />
          </div>
        </div>
      </header>

      <section className="legal-page">
        <h1>Terms of Service</h1>
        <p className="legal-updated">Effective {EFFECTIVE_DATE}</p>
        {locale !== "en" && (
          <p className="banner" lang={locale}>
            {t("common.englishOnly")}
          </p>
        )}

        <p>
          These terms cover your use of internez.eu and the Envoy browser extension (together, "InternEZ"). By
          creating an account, you agree to them. If you don't agree, please don't use the service.
        </p>

        <h2>What InternEZ is</h2>
        <p>
          InternEZ is a platform for standardized internship applications across the EU/EEA. It lets applicants
          build one profile and apply to multiple listings without re-entering the same information, and lets
          companies post listings and review applicants who meet their criteria.
        </p>
        <p>
          Some listings are posted directly by companies on InternEZ ("direct" listings); others are aggregated
          from third-party sources and link out to apply elsewhere. For non-direct listings, we can't see or
          confirm your application status after you leave our site — that's why those applications are marked
          "applied via 3rd party" rather than tracked through the usual status stages.
        </p>

        <h2>Who can use it</h2>
        <p>
          You must be at least 16 years old to create an account. You're responsible for the accuracy of the
          information in your profile and for keeping your login credentials confidential.
        </p>

        <h2>Applicant and company responsibilities</h2>
        <ul className="legal-list">
          <li>Applicants are responsible for the accuracy of their profile and application answers.</li>
          <li>Companies are responsible for the accuracy and legality of the listings they post, and for how they use applicant data they receive through InternEZ.</li>
          <li>Neither party may use InternEZ to discriminate in violation of applicable EU or national law.</li>
        </ul>

        <h2>Acceptable use</h2>
        <p>You agree not to:</p>
        <ul className="legal-list">
          <li>Scrape, bulk-download, or systematically extract data from InternEZ outside normal use of the product;</li>
          <li>Post fake listings or create fake applicant/company accounts;</li>
          <li>Use messaging to harass, spam, or solicit outside the purpose of an internship application;</li>
          <li>Attempt to circumvent eligibility checks or misrepresent your citizenship, residence, or qualifications;</li>
          <li>Interfere with the security or normal operation of the platform.</li>
        </ul>

        <h2>The Envoy browser extension</h2>
        <p>
          Envoy autofills your InternEZ profile data into application forms on other websites. It's a
          deterministic autofill tool — it doesn't submit anything on your behalf, and you're responsible for
          reviewing every field before you submit a form on a third-party site. InternEZ isn't responsible for
          errors, outages, or form changes on websites we don't operate.
        </p>

        <h2>No guarantee of outcomes</h2>
        <p>
          InternEZ helps you apply faster and more accurately; it doesn't guarantee an interview, an offer, or any
          particular outcome. Decisions about who to interview or hire are made entirely by the companies posting
          listings, not by InternEZ.
        </p>

        <h2>Fees</h2>
        <p>
          InternEZ is currently free to use. If we introduce paid plans in the future, additional terms will apply
          to those plans, and you'll be told what you're paying for before you're ever charged.
        </p>

        <h2>Account termination</h2>
        <p>
          You can delete your account at any time from Profile → Your data — this is immediate and permanent. We
          may suspend or terminate an account that violates these terms, with notice where practical.
        </p>

        <h2>Disclaimers</h2>
        <p>
          InternEZ is provided "as is." We work to keep listing information, eligibility checks, and match scores
          accurate, but we can't guarantee they're error-free, and we're not liable for decisions made based on
          them. To the extent permitted by law, our liability for any claim arising from your use of InternEZ is
          limited to direct damages.
        </p>

        <h2>Governing law</h2>
        <p className="legal-placeholder">
          [To be finalized once InternEZ's legal entity and registered jurisdiction are confirmed.]
        </p>

        <h2>Changes to these terms</h2>
        <p>
          If we make material changes, we'll update the effective date above and, where the changes are
          significant, let you know directly.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these terms: <a href="mailto:legal@internez.eu">legal@internez.eu</a>.
        </p>
      </section>

      <footer className="landing-footer">
        <Link to="/" className="wordmark">
          Intern<span>EZ</span>
        </Link>
        <span className="landing-footer-note">
          <Link to="/terms">Terms of Service</Link> · <Link to="/privacy">Privacy Policy</Link>
        </span>
      </footer>
    </div>
  );
}
