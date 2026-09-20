import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const DEMO_APPLICANT = { email: "demo.applicant@internez.eu", password: "Demo1234!" };
const DEMO_COMPANY = { email: "demo.company@internez.eu", password: "Demo1234!" };

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function doLogin(creds: { email: string; password: string }) {
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(creds.email, creds.password);
      navigate(user.role === "company" ? "/company" : "/browse");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <Link to="/" className="wordmark">
        Intern<span>EZ</span>
      </Link>

      <div className="auth-card form-section">
        <p className="eyebrow">Welcome back</p>
        <h1 style={{ marginBottom: 20 }}>Log in</h1>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            doLogin({ email, password });
          }}
        >
          <div className="field">
            <label htmlFor="email">Email</label>
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
            <label htmlFor="password">Password</label>
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

          {error && <p style={{ color: "var(--blocked)", fontSize: 13, marginBottom: 16 }}>{error}</p>}

          <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={submitting}>
            {submitting ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 16, textAlign: "center" }}>
          New here? <Link to="/signup">Create an account</Link>
        </p>

        <div className="auth-demo">
          <p className="field-hint" style={{ marginBottom: 10 }}>Or explore with a pre-filled demo account</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ flex: 1 }}
              onClick={() => doLogin(DEMO_APPLICANT)}
              disabled={submitting}
            >
              Demo applicant
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ flex: 1 }}
              onClick={() => doLogin(DEMO_COMPANY)}
              disabled={submitting}
            >
              Demo company
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
