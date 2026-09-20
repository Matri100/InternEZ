import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface Props {
  exportUrl: string;
  onDeleteAccount: () => Promise<void>;
}

// Shared by both Profile (applicant) and CompanyProfile — a GDPR-style
// "download everything you have on me" plus account deletion, fitting
// given the whole product is scoped to the EU/EEA. Deletion cascades
// server-side (see store.ts deleteApplicantAccount/deleteCompanyAccount);
// this just drives the confirm step and signs the browser out after.
export function AccountSection({ exportUrl, onDeleteAccount }: Props) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await onDeleteAccount();
      await logout();
      navigate("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete your account");
      setDeleting(false);
    }
  }

  return (
    <section className="form-section">
      <div className="form-section-header">
        <h2>Your data</h2>
      </div>
      <p className="field-hint" style={{ maxWidth: "56ch", marginBottom: "var(--space-4)" }}>
        Download everything InternEZ has stored about your account, or permanently delete it. Deletion removes
        your profile, applications, messages, and saved items immediately and can't be undone.
      </p>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <a href={exportUrl} className="btn btn-secondary btn-sm">
          Download my data
        </a>
        {confirming ? (
          <>
            <span style={{ fontSize: 13, color: "var(--blocked)" }}>Delete your account? This can't be undone.</span>
            <button type="button" className="btn btn-sm" style={{ borderColor: "var(--blocked)", color: "var(--blocked)" }} onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Yes, delete my account"}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)} disabled={deleting}>
              Cancel
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-ghost btn-sm" style={{ color: "var(--blocked)" }} onClick={() => setConfirming(true)}>
            Delete my account
          </button>
        )}
      </div>
      {error && <p style={{ color: "var(--blocked)", fontSize: 12.5, marginTop: 8 }}>{error}</p>}
    </section>
  );
}
