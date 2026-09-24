import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useI18n } from "../i18n";
import { AccessibilityMenu } from "./AccessibilityMenu";
import { LanguageMenu } from "./LanguageMenu";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

// Wraps the entire app (see App.tsx) — nothing else mounts, and no other
// request fires, until a valid key is proven. Backed entirely by a cookie
// the server sets on /unlock (24h, see routes/earlyAccess.ts) — nothing
// tracked on this side beyond credentials: "include". Client-side storage
// (sessionStorage, then localStorage with a manual expiry) was tried
// first and dropped: unreliable on mobile, where backgrounding the
// browser could silently clear it. Known accepted limitation: unlocking
// still isn't fully reliable on mobile even with the cookie — partners
// use desktop for now. The gate itself still blocks mobile visitors
// correctly; it just doesn't always let an authorized one back in.
export function EarlyAccessGate({ children }: { children: ReactNode }) {
  const [granted, setGranted] = useState<boolean | null>(null);
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkFailed, setCheckFailed] = useState(false);
  const { t } = useI18n();

  // A failed check (rate limited, server down, offline) is not a "no": it
  // used to fall through to the key screen, so an already-authorized
  // visitor was asked for the key again. It now says so and offers a retry.
  function checkAccess() {
    setCheckFailed(false);
    setGranted(null);
    fetch(`${API_BASE}/early-access/status`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error(`Status check failed: ${res.status}`);
        return res.json();
      })
      .then((data) => setGranted(Boolean(data.granted)))
      .catch(() => setCheckFailed(true));
  }

  useEffect(checkAccess, []);

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
        throw new Error(res.status === 401 ? t("gate.wrongKey") : body.error ?? t("common.somethingWrong"));
      }
      setGranted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.somethingWrong"));
    } finally {
      setSubmitting(false);
    }
  }

  if (checkFailed) {
    return (
      <div className="gate-page">
        <div className="corner-controls">
          <AccessibilityMenu />
          <LanguageMenu />
        </div>
        <div className="gate-panel">
          <span className="wordmark">
            Intern<span>EZ</span>
          </span>
          <div className="gate-form">
            <p className="gate-error">{t("gate.unreachable")}</p>
            <button type="button" className="gate-submit" onClick={checkAccess}>
              {t("gate.tryAgain")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (granted === null) {
    return (
      <div className="page">
        <p style={{ color: "var(--text-secondary)" }}>{t("common.loading")}</p>
      </div>
    );
  }

  if (!granted) {
    return (
      <div className="gate-page">
        <div className="corner-controls">
          <AccessibilityMenu />
          <LanguageMenu />
        </div>
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
              placeholder={t("gate.keyPlaceholder")}
              aria-label={t("gate.keyPlaceholder")}
            />
            {error && <p className="gate-error">{error}</p>}
            <button type="submit" className="gate-submit" disabled={submitting}>
              {submitting ? t("gate.verifying") : t("gate.authorize")}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
