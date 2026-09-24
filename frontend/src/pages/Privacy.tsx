import { Link } from "react-router-dom";
import { LanguageMenu } from "../components/LanguageMenu";
import { useI18n } from "../i18n";

const EFFECTIVE_DATE = "21 September 2026";

// Legal text stays in English only — a machine translation shouldn't be
// what anyone relies on. Other languages get a note saying so.
export function Privacy() {
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
            <LanguageMenu />
          </div>
        </div>
      </header>

      <section className="legal-page">
        <h1>Privacy policy</h1>
        <p className="legal-updated">Effective {EFFECTIVE_DATE}</p>
        {locale !== "en" && (
          <p className="banner" lang={locale}>
            {t("common.englishOnly")}
          </p>
        )}

        <p>
          InternEZ ("we", "us") runs internez.eu, a platform for standardized internship applications across the
          EU/EEA. This page explains what personal data we collect, why, and what rights you have over it. It
          applies to applicants, companies, and anyone using the Envoy browser extension.
        </p>

        <h2>What we collect</h2>
        <p>What we collect depends on whether you sign up as an applicant or a company.</p>

        <h3>Account data (everyone)</h3>
        <p>Email address and a hashed password. We never store your password in plain text.</p>

        <h3>Applicant profile data</h3>
        <p>
          Name, phone, portfolio link, citizenship (including a second citizenship if you have dual nationality),
          place of birth, country of residence, availability, preferred internship length and locations, work
          arrangement preference, languages, skills, interests, qualifications, a summary, education history, work
          experience, projects, certifications, and any documents you upload (CV, transcripts, ID documents — up
          to 10 files). We also ask a few open-ended cover-letter prompts, entirely optional, meant to help
          pre-fill applications more accurately.
        </p>

        <h3>Voluntary disclosures</h3>
        <p>
          Some companies request gender identity, race/ethnicity, veteran status, or disability status for
          diversity reporting. These fields are always optional, kept in a separate part of our database from the
          rest of your profile, and are never included in autofill or shared with the Envoy extension unless you
          separately turn on that setting. Filling them in is not itself consent to share them — sharing requires
          the explicit autofill toggle in your profile.
        </p>

        <h3>Company profile data</h3>
        <p>Company name, description, website, logo, headquarters, size, and the listings you post.</p>

        <h3>Usage data</h3>
        <p>
          Applications you submit, messages exchanged between applicants and companies, interview proposals,
          saved listings and searches, and in-app notifications. Notifications are in-app only — we don't currently
          email or push notify you.
        </p>

        <h3>Cookies</h3>
        <p>
          We set exactly one cookie: a session cookie that keeps you signed in. It's strictly necessary for the
          site to function, can't be used to track you across other sites, and isn't shared with any advertiser or
          analytics service — because we don't use any. We don't run analytics, ad tracking, or any third-party
          tracking scripts on internez.eu, so there's nothing here that needs a cookie consent banner. If that ever
          changes, this policy — and the site — will change with it.
        </p>

        <h2>Why we process it, and on what basis</h2>
        <ul className="legal-list">
          <li><strong>To provide the service</strong> — your profile, applications, and messages exist because they're the service (contractual necessity).</li>
          <li><strong>Voluntary disclosures</strong> — processed only with your explicit consent, which you can withdraw at any time by clearing the fields.</li>
          <li><strong>Security</strong> — rate limiting and abuse prevention, on the basis of our legitimate interest in keeping the platform usable for everyone.</li>
        </ul>

        <h2>The Envoy browser extension</h2>
        <p>
          Envoy is our companion browser extension that autofills your InternEZ profile data into internship
          application forms on other websites. It authenticates with a long-lived token you generate from your
          Profile page, not your regular login. Envoy only ever fills fields — it reads your profile data to do
          that, but doesn't send anything you didn't already store in your InternEZ profile, and doesn't transmit
          page content back to us beyond what's needed to make the token work.
        </p>

        <h2>Who we share data with</h2>
        <p>
          When you apply to a listing, the company sees the profile data relevant to that application, the same
          way it would if you'd submitted it directly to them. We don't sell personal data, and we don't share it
          with advertisers, data brokers, or anyone outside the operation of the platform itself.
        </p>
        <p>We use a small number of infrastructure providers to run InternEZ, each acting as a processor on our behalf:</p>
        <ul className="legal-list">
          <li><strong>Railway</strong> — hosts our backend application and database.</li>
          <li><strong>Cloudflare</strong> — hosts our frontend and handles DNS for internez.eu.</li>
        </ul>
        <p>
          Where a provider processes data outside the EU/EEA, we rely on the safeguards required by GDPR (such as
          Standard Contractual Clauses) to cover that transfer.
        </p>

        <h2>How long we keep it</h2>
        <p>
          We keep your data while your account is active. If you delete your account from Profile → Your data, the
          deletion is immediate and permanent — your profile, applications, messages, and saved items are removed
          right away, not on some future cleanup schedule.
        </p>

        <h2>Your rights</h2>
        <p>Under GDPR, you have the right to:</p>
        <ul className="legal-list">
          <li>Access the personal data we hold about you</li>
          <li>Correct inaccurate data</li>
          <li>Erase your data</li>
          <li>Restrict or object to certain processing</li>
          <li>Receive your data in a portable format</li>
          <li>Withdraw consent for anything processed on that basis (like voluntary disclosures)</li>
        </ul>
        <p>
          You can exercise most of these yourself, immediately, from your Profile page: <strong>Download my
          data</strong> gives you a full export, and <strong>Delete my account</strong> erases everything. For
          anything else, contact us at{" "}
          <a href="mailto:privacy@internez.eu">privacy@internez.eu</a>.
        </p>

        <h2>Children</h2>
        <p>
          InternEZ is intended for internship applicants, typically university students and recent graduates. It
          isn't directed at children, and we don't knowingly collect data from anyone under 16.
        </p>

        <h2>Changes to this policy</h2>
        <p>
          If we make material changes to this policy, we'll update the effective date above and, where the
          changes are significant, let you know directly.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about this policy or your data: <a href="mailto:privacy@internez.eu">privacy@internez.eu</a>.
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
