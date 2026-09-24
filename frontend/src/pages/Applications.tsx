import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useI18n } from "../i18n";
import type { ApplicationWithListing } from "../types/domain";

export function Applications() {
  const [applications, setApplications] = useState<ApplicationWithListing[] | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const [messaging, setMessaging] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t, formatDate } = useI18n();

  useEffect(() => {
    api.getApplications().then(setApplications);
  }, []);

  async function withdraw(id: string) {
    setWithdrawing(id);
    try {
      const updated = await api.withdrawApplication(id);
      setApplications((prev) => (prev ? prev.map((a) => (a.id === id ? { ...a, status: updated.status } : a)) : prev));
    } finally {
      setWithdrawing(null);
      setConfirmingId(null);
    }
  }

  async function message(companyId: string) {
    setMessaging(companyId);
    try {
      const conversation = await api.startConversation(companyId);
      navigate(`/messages?c=${conversation.id}`);
    } finally {
      setMessaging(null);
    }
  }

  if (!applications) {
    return (
      <div className="page">
        <p style={{ color: "var(--text-secondary)" }}>{t("common.loading")}</p>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="page">
        <div className="empty-state">
          <h3>{t("applications.emptyTitle")}</h3>
          <p style={{ marginBottom: 16 }}>{t("applications.emptyBody")}</p>
          <Link to="/browse" className="btn btn-primary">
            {t("common.browseListings")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{t("applications.title")}</h1>
          <p>{t("applications.count", { count: applications.length })}</p>
        </div>
      </div>

      <div className="application-list">
        {applications.map((app) => (
          <div className="application-row" key={app.id}>
            <div className="application-row-main">
              <h3>
                <Link to={`/listings/${app.listing.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                  {app.listing.title}
                </Link>
              </h3>
              <span className="company">{app.company.name}</span>
              {app.status === "appliedExternally" && (
                <p className="detail-block" style={{ fontSize: 13, color: "var(--text-faint)", maxWidth: "52ch" }}>
                  {t("applications.externalNote", { company: app.company.name })}
                </p>
              )}
              {app.extraAnswers.length > 0 && (
                <div className="application-answers detail-block detail-block-divider">
                  {app.extraAnswers.map((a) => (
                    <p key={a.key} style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 6, maxWidth: "52ch", lineHeight: 1.5 }}>
                      <strong style={{ color: "var(--text)" }}>{a.prompt}</strong> {a.answer}
                    </p>
                  ))}
                </div>
              )}

              {confirmingId === app.id ? (
                <div className="detail-block" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13.5, color: "var(--text-secondary)" }}>{t("applications.withdrawConfirm")}</span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => withdraw(app.id)}
                    disabled={withdrawing === app.id}
                  >
                    {withdrawing === app.id ? t("applications.withdrawing") : t("applications.yesWithdraw")}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmingId(null)}>
                    {t("common.cancel")}
                  </button>
                </div>
              ) : (
                <div className="detail-block" style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => message(app.company.id)}
                    disabled={messaging === app.company.id}
                  >
                    {messaging === app.company.id ? t("applications.opening") : t("applications.message")}
                  </button>
                  {app.status !== "withdrawn" && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmingId(app.id)}>
                      {t("applications.withdraw")}
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="application-row-meta">
              <span className={`status-badge ${app.status}`}>{t(`status.${app.status}`)}</span>
              {app.overridden && <span className="override-badge">{t("applications.overridden")}</span>}
              <span>{formatDate(new Date(app.submittedAt))}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
