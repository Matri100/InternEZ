import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setSubmitting(true);
    try {
      await api.resetPassword({ token, password });
      setDone(true);
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
        <p className="eyebrow">Reset your password</p>
        <h1 style={{ marginBottom: 20 }}>Choose a new password</h1>

        {!token ? (
          <p style={{ color: "var(--blocked)", fontSize: 14 }}>
            This reset link is missing its token. Request a new one from the{" "}
            <Link to="/forgot-password">forgot password</Link> page.
          </p>
        ) : done ? (
          <>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 16 }}>
              Your password has been updated.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: "100%" }}
              onClick={() => navigate("/login")}
            >
              Log in
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="password">New password</label>
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
              <label htmlFor="confirmPassword">Confirm password</label>
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
              {submitting ? "Updating…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
