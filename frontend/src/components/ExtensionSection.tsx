import { useEffect, useState } from "react";
import { api } from "../api/client";

// The companion browser extension autofills known application forms from
// this profile — it can't use the normal session cookie (it runs on
// whatever external site the applicant is applying on), so it pairs with
// a token generated here instead. The token is shown exactly once; only a
// connected/not-connected flag is ever fetched back after that.
export function ExtensionSection() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.getExtensionStatus().then((s) => setConnected(s.connected));
  }, []);

  async function generate() {
    setBusy(true);
    try {
      const { token } = await api.createExtensionToken();
      setToken(token);
      setConnected(true);
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    try {
      await api.revokeExtensionToken();
      setConnected(false);
      setToken(null);
    } finally {
      setBusy(false);
    }
  }

  async function copyToken() {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="form-section">
      <div className="form-section-header">
        <h2>Envoy</h2>
        <span className="field-hint">Browser extension</span>
      </div>
      <p className="field-hint" style={{ maxWidth: "56ch", marginBottom: "var(--space-4)" }}>
        Envoy is your InternEZ assistant for application forms on other companies' sites — it autofills what
        it recognizes (name, contact details, education, work history) from this profile, so you're not
        retyping it. It only fills fields; you still review and submit yourself.
      </p>

      {token ? (
        <div className="detail-block">
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            Your sync code (shown once — paste it into Envoy now):
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <code className="sync-code">{token}</code>
            <button type="button" className="btn btn-secondary btn-sm" onClick={copyToken}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      ) : connected === true ? (
        <div className="detail-block" style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span className="status-badge offer">Connected</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={generate} disabled={busy}>
            Generate new code
          </button>
          <button type="button" className="btn btn-ghost btn-sm" style={{ color: "var(--blocked)" }} onClick={disconnect} disabled={busy}>
            Disconnect
          </button>
        </div>
      ) : connected === false ? (
        <button type="button" className="btn btn-secondary btn-sm detail-block" onClick={generate} disabled={busy}>
          {busy ? "Generating…" : "Generate sync code"}
        </button>
      ) : null}
    </section>
  );
}
