import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { LanguageMenu } from "../components/LanguageMenu";
import { T, useI18n } from "../i18n";
import { errorText } from "../i18n/errors";

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const { t } = useI18n();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t("auth.passwordsDontMatch"));
      return;
    }

    setSubmitting(true);
    try {
      await api.resetPassword({ token, password });
      setDone(true);
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
        <h1 style={{ marginBottom: 20 }}>{t("auth.newPasswordTitle")}</h1>

        {!token ? (
          <p style={{ color: "var(--blocked)", fontSize: 14 }}>
            <T k="auth.missingToken" tags={{ link: <Link to="/forgot-password" /> }} />
          </p>
        ) : done ? (
          <>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 16 }}>
              {t("auth.passwordUpdated")}
            </p>
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: "100%" }}
              onClick={() => navigate("/login")}
            >
              {t("auth.logIn")}
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="password">{t("auth.newPassword")}</label>
              <input
                id="password"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
            <div className="field">
              <label htmlFor="confirmPassword">{t("auth.confirmPassword")}</label>
              <input
                id="confirmPassword"
                type="password"
                className="input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>

            {error && <p style={{ color: "var(--blocked)", fontSize: 13, marginBottom: 16 }}>{error}</p>}

            <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={submitting}>
              {submitting ? t("auth.updating") : t("auth.updatePassword")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
