import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
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
        <h1 style={{ marginBottom: 20 }}>Forgot password</h1>

        {sent ? (
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            If an account exists for that email, we've sent a link to reset your password. Check your inbox.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">Email</label>
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
              {submitting ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 16, textAlign: "center" }}>
          <Link to="/login">Back to log in</Link>
        </p>
      </div>
    </div>
  );
}
