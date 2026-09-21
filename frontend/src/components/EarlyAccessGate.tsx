import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { LockIcon } from "./icons";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

// Wraps the entire app (see App.tsx) — nothing else mounts, and no other
// request fires, until the backend says this session has the early access
// flag (see middleware/earlyAccess.ts). When EARLY_ACCESS_KEY isn't set on
// the backend, /status reports granted immediately and this is invisible.
export function EarlyAccessGate({ children }: { children: ReactNode }) {
  const [granted, setGranted] = useState<boolean | null>(null);
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/early-access/status`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setGranted(Boolean(data.granted)))
      .catch(() => setGranted(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/early-access/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ key }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Incorrect key");
      }
      setGranted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (granted === null) {
    return (
      <div className="page">
        <p style={{ color: "var(--text-secondary)" }}>Loading…</p>
      </div>
    );
  }

  if (!granted) {
    return (
      <div className="gate-page">
        <header className="landing-header">
          <div className="landing-header-inner" style={{ justifyContent: "center" }}>
            <span className="wordmark">
              Intern<span>EZ</span>
            </span>
          </div>
        </header>
        <div className="gate-hero">
          <div className="gate-card">
            <div className="gate-kicker">
              <LockIcon />
              <span>Early access</span>
            </div>
            <h1>InternEZ isn't public yet.</h1>
            <p className="gate-copy">
              You're seeing this because the site is still in private early access. If someone gave you a key,
              enter it below to continue.
            </p>
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="early-access-key">Access key</label>
                <input
                  id="early-access-key"
                  type="password"
                  className="input"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  autoComplete="off"
                  autoFocus
                  required
                />
              </div>
              {error && <p style={{ color: "var(--blocked)", fontSize: 13, marginBottom: 16 }}>{error}</p>}
              <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={submitting}>
                {submitting ? "Checking…" : "Continue"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
