import { useEffect, useState, type FormEvent, type ReactNode } from "react";

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
        <div className="gate-doc">
          <span className="gate-corner-bl" />
          <span className="gate-corner-br" />
          <div className="gate-stamp">RESTRICTED</div>

          <div className="gate-doc-header">
            <span>
              CLASS: <b>PRE-LAUNCH</b>
            </span>
            <span>DIST: LIMITED</span>
          </div>

          <div className="gate-redactions" aria-hidden="true">
            <span style={{ width: "72%" }} />
            <span style={{ width: "91%" }} />
            <span style={{ width: "48%" }} />
          </div>

          <h1 className="gate-title">
            INTERNEZ<span className="cursor">_</span>
          </h1>
          <p className="gate-copy">
            This build is not for general distribution. If you've been issued a clearance key, enter it below to
            proceed.
          </p>

          <form onSubmit={handleSubmit}>
            <label htmlFor="early-access-key" className="gate-field-label">
              CLEARANCE KEY
            </label>
            <div className="gate-input-row">
              <span className="gate-prompt">&gt;</span>
              <input
                id="early-access-key"
                type="password"
                className="gate-input"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                autoComplete="off"
                autoFocus
                required
                placeholder="••••••••"
              />
            </div>
            {error && (
              <p className="gate-error">
                <b>ACCESS DENIED</b> — {error}
              </p>
            )}
            <button type="submit" className="gate-submit" disabled={submitting}>
              {submitting ? "Verifying…" : "Authenticate"}
            </button>
          </form>

          <div className="gate-doc-footer">
            <span>DOC-REF: IEZ-EA-004</span>
            <span>CLEARANCE: PARTNER</span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
