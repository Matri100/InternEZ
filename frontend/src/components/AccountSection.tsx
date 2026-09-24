import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n";

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
  const { t } = useI18n();

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await onDeleteAccount();
      await logout();
      navigate("/");
    } catch (e) {
      setError(t("account.deleteError"));
      setDeleting(false);
    }
  }

  return (
    <section className="form-section">
      <div className="form-section-header">
        <h2>{t("account.title")}</h2>
      </div>
      <p className="field-hint" style={{ maxWidth: "56ch", marginBottom: "var(--space-4)" }}>
        {t("account.intro")}
      </p>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <a href={exportUrl} className="btn btn-secondary btn-sm">
          {t("account.download")}
        </a>
        {confirming ? (
          <>
            <span style={{ fontSize: 13, color: "var(--blocked)" }}>{t("account.confirm")}</span>
            <button type="button" className="btn btn-sm" style={{ borderColor: "var(--blocked)", color: "var(--blocked)" }} onClick={handleDelete} disabled={deleting}>
              {deleting ? t("account.deleting") : t("account.yesDelete")}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)} disabled={deleting}>
              {t("common.cancel")}
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-ghost btn-sm" style={{ color: "var(--blocked)" }} onClick={() => setConfirming(true)}>
            {t("account.delete")}
          </button>
        )}
      </div>
      {error && <p style={{ color: "var(--blocked)", fontSize: 12.5, marginTop: 8 }}>{error}</p>}
    </section>
  );
}
