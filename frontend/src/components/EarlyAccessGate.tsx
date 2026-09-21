import { useEffect, useState, type FormEvent, type ReactNode } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

// Wraps the entire app (see App.tsx) — nothing else mounts, and no other
// request fires, until a valid key is proven. Backed by a cookie the
// server sets on /unlock (24h, see routes/earlyAccess.ts) rather than
// anything tracked here — tried sessionStorage (per-tab, but iOS Safari
// can clear a backgrounded tab's copy when switching apps) and then
// localStorage with a manual expiry before landing on a cookie, which is
// the one mechanism mobile browsers are actually careful not to break on
// backgrounding. credentials: "include" is doing the real work below;
// there's nothing to read or store on this side any more.
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
        <div className="gate-panel">
          <span className="wordmark">
            Intern<span>EZ</span>
          </span>

          <form className="gate-form" onSubmit={handleSubmit}>
            <input
              id="early-access-key"
              type="password"
              className="gate-input"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              autoComplete="off"
              autoFocus
              required
              placeholder="Access key"
              aria-label="Access key"
            />
            {error && <p className="gate-error">{error}</p>}
            <button type="submit" className="gate-submit" disabled={submitting}>
              {submitting ? "Verifying…" : "Authorize"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
