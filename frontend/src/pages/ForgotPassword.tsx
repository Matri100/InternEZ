import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { LanguageMenu } from "../components/LanguageMenu";
import { useI18n } from "../i18n";
import { errorText } from "../i18n/errors";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(errorText(err, t));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="corner-controls">
        <LanguageMenu />
      </div>
      <Link to="/" className="wordmark">
        Intern<span>EZ</span>
      </Link>

      <div className="auth-card form-section">
        <p className="eyebrow">{t("auth.resetEyebrow")}</p>
        <h1 style={{ marginBottom: 20 }}>{t("auth.forgotTitle")}</h1>

        {sent ? (
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            {t("auth.resetSent")}
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">{t("auth.email")}</label>
              <input
                id="email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                required
              />
            </div>

            {error && <p style={{ color: "var(--blocked)", fontSize: 13, marginBottom: 16 }}>{error}</p>}

            <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={submitting}>
              {submitting ? t("auth.sending") : t("auth.sendLink")}
            </button>
          </form>
        )}

        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 16, textAlign: "center" }}>
          <Link to="/login">{t("auth.backToLogin")}</Link>
        </p>
      </div>
    </div>
  );
}
