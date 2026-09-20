import { Link } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";

export function Landing() {
  const { theme, toggle } = useTheme();

  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-header-inner">
          <span className="wordmark">
            Intern<span>EZ</span>
          </span>
          <div className="landing-header-actions">
            <Link to="/signup?role=company" className="landing-header-link">
              For companies
            </Link>
            <Link to="/login" className="landing-header-link">
              Log in
            </Link>
            <button type="button" className="theme-toggle" onClick={toggle} aria-label="Toggle color theme">
              {theme === "light" ? "Dark" : "Light"}
            </button>
          </div>
        </div>
      </header>

      <section className="landing-hero">
        <p className="landing-hero-kicker">Standardized internship applications, EU/EEA only</p>
        <h1>
          Apply to internships in <span className="highlight">minutes</span>, not hours.
        </h1>
        <p className="landing-hero-sub">
          Fill out one profile. Browse real listings across the EU/EEA with an honest eligibility check and a
          match score that explains itself. Apply without re-entering the same information every time.
        </p>
        <div className="landing-hero-actions">
          <Link to="/signup?role=applicant" className="btn btn-primary landing-cta">
            Start browsing
          </Link>
          <Link to="/signup?role=company" className="landing-hero-secondary">
            Hiring interns? Post a listing
          </Link>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-heading">
          <h2>How it works</h2>
        </div>
        <div className="landing-steps">
          <div className="landing-step">
            <span className="landing-step-number">01</span>
            <h3>Build your profile once</h3>
            <p>Education, skills, languages, work experience — structured, not a wall of free text. Fill it out once, reuse it everywhere.</p>
          </div>
          <div className="landing-step">
            <span className="landing-step-number">02</span>
            <h3>See where you actually fit</h3>
            <p>Every listing shows a match score with a plain-language reason, and an eligibility check based on your citizenship and residence — not a guess.</p>
          </div>
          <div className="landing-step">
            <span className="landing-step-number">03</span>
            <h3>Apply in minutes</h3>
            <p>No new account per company. Extra questions get pre-filled from what you've already answered before.</p>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-alt">
        <div className="landing-section-heading">
          <h2>About InternEZ</h2>
        </div>
        <div className="landing-about">
          <p>
            InternEZ isn't trying to be another networking site or a university-gated job board. It does one thing:
            fast, standardized internship applications, open to anyone — not gated behind a university partnership.
          </p>
          <p>
            Eligibility checking and match scoring are real, useful features, but they stay in the background. The
            point is that applying to an internship should take minutes, not an afternoon of retyping your resume
            into a different form for every company.
          </p>
          <p className="landing-about-focus">
            EZ stands for Easy — and European Zone. InternEZ covers the EU/EEA exclusively, and does that one
            region properly rather than spreading thin across the world.
          </p>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-for-companies">
          <div>
            <h2>Posting an internship?</h2>
            <p>
              List a role directly, set the eligibility rules and skills that actually matter, and see who applied —
              with the same structured profile data applicants filled in once.
            </p>
          </div>
          <Link to="/signup?role=company" className="btn btn-secondary">
            Post a listing
          </Link>
        </div>
      </section>

      <footer className="landing-footer">
        <span className="wordmark">
          Intern<span>EZ</span>
        </span>
        <span className="landing-footer-note">A standardized internship application platform for the EU/EEA.</span>
      </footer>
    </div>
  );
}
