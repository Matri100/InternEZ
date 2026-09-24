import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LanguageMenu } from "../components/LanguageMenu";
import { T, useI18n } from "../i18n";
import { errorText } from "../i18n/errors";

const DEMO_APPLICANT = { email: "demo.applicant@internez.eu", password: "Demo1234!" };
const DEMO_COMPANY = { email: "demo.company@internez.eu", password: "Demo1234!" };

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { t } = useI18n();

  async function doLogin(creds: { email: string; password: string }) {
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(creds.email, creds.password);
      navigate(user.role === "company" ? "/company" : "/browse");
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
        <p className="eyebrow">{t("auth.loginEyebrow")}</p>
        <h1 style={{ marginBottom: 20 }}>{t("auth.loginTitle")}</h1>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            doLogin({ email, password });
          }}
        >
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
              autoComplete="current-password"
              required
            />
          </div>

          <p style={{ textAlign: "right", marginBottom: 16 }}>
            <Link to="/forgot-password" style={{ fontSize: 13 }}>
              {t("auth.forgotLink")}
            </Link>
          </p>

          {error && <p style={{ color: "var(--blocked)", fontSize: 13, marginBottom: 16 }}>{error}</p>}

          <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={submitting}>
            {submitting ? t("auth.loggingIn") : t("auth.logIn")}
          </button>
        </form>

        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 16, textAlign: "center" }}>
          <T k="auth.newHere" tags={{ link: <Link to="/signup" /> }} />
        </p>

        <div className="auth-demo">
          <p className="field-hint" style={{ marginBottom: 10 }}>
            {t("auth.demoHint")}
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ flex: 1 }}
              onClick={() => doLogin(DEMO_APPLICANT)}
              disabled={submitting}
            >
              {t("auth.demoApplicant")}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ flex: 1 }}
              onClick={() => doLogin(DEMO_COMPANY)}
              disabled={submitting}
            >
              {t("auth.demoCompany")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
