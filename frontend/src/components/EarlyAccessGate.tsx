import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { EARLY_ACCESS_STORAGE_KEY, getStoredEarlyAccessKey } from "../lib/earlyAccess";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

function storeEarlyAccessKey(value: string) {
  try {
    sessionStorage.setItem(EARLY_ACCESS_STORAGE_KEY, value);
  } catch {
    // sessionStorage can throw (private browsing, blocked storage) — the
    // key still works for this request, it just won't survive a reload.
  }
}

// Wraps the entire app (see App.tsx) — nothing else mounts, and no other
// request fires, until a valid key is proven. Deliberately keyed off
// sessionStorage, not a cookie: a cookie would be shared across every tab
// in the browser and would silently skip the gate on a new tab, which is
// exactly the persistence this was asked not to have. sessionStorage dies
// with the tab, so a new tab (or a reopened browser) always asks again.
export function EarlyAccessGate({ children }: { children: ReactNode }) {
  const [granted, setGranted] = useState<boolean | null>(null);
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const stored = getStoredEarlyAccessKey();
    if (!stored) {
      setGranted(false);
      return;
    }
    fetch(`${API_BASE}/early-access/status`, { headers: { "X-Early-Access-Key": stored } })
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
        body: JSON.stringify({ key }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Incorrect key");
      }
      storeEarlyAccessKey(key);
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
