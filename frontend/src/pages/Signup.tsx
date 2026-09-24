import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AccessibilityMenu } from "../components/AccessibilityMenu";
import { LanguageMenu } from "../components/LanguageMenu";
import { T, useI18n } from "../i18n";
import { errorText } from "../i18n/errors";
import type { UserRole } from "../types/domain";

export function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [role, setRole] = useState<UserRole>(params.get("role") === "company" ? "company" : "applicant");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { t } = useI18n();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await signup({ email, password, role, name });
      navigate(user.role === "company" ? "/company" : "/profile");
    } catch (err) {
      setError(errorText(err, t));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="corner-controls">
        <AccessibilityMenu />
        <LanguageMenu />
      </div>
      <Link to="/" className="wordmark">
        Intern<span>EZ</span>
      </Link>

      <div className="auth-card form-section">
        <p className="eyebrow">{t("auth.signupEyebrow")}</p>
        <h1 style={{ marginBottom: 20 }}>{t("auth.signupTitle")}</h1>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>{t("auth.signingUpAs")}</label>
            <div className="chip-group">
              <button
                type="button"
                className={`chip ${role === "applicant" ? "selected" : ""}`}
                onClick={() => setRole("applicant")}
              >
                {t("auth.roleApplicant")}
              </button>
              <button
                type="button"
                className={`chip ${role === "company" ? "selected" : ""}`}
                onClick={() => setRole("company")}
              >
                {t("auth.roleCompany")}
              </button>
            </div>
          </div>

          <div className="field">
            <label htmlFor="name">{role === "company" ? t("auth.companyName") : t("auth.fullName")}</label>
            <input
              id="name"
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="email">{t("auth.email")}</label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">{t("auth.password")}</label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
            <span className="field-hint">{t("auth.passwordHint")}</span>
          </div>

          {error && <p style={{ color: "var(--blocked)", fontSize: 13, marginBottom: 16 }}>{error}</p>}

          <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={submitting}>
            {submitting ? t("auth.creating") : t("auth.createAccount")}
          </button>
        </form>

        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 16, textAlign: "center" }}>
          <T k="auth.haveAccount" tags={{ link: <Link to="/login" /> }} />
        </p>
      </div>
    </div>
  );
}
