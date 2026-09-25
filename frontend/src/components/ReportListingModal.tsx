import { useEffect, useId, useRef, useState } from "react";
import { api } from "../api/client";
import { useI18n } from "../i18n";
import { errorText } from "../i18n/errors";
import type { ReportReason } from "../types/domain";

const REASONS: ReportReason[] = ["scam", "discriminatory", "inaccurate", "closed", "other"];
const MAX_NOTE_LENGTH = 2000;

interface Props {
  listingId: string;
  onClose: () => void;
  onReported: () => void;
}

// Flags a listing for InternEZ's moderators (see backend routes/moderation.ts).
export function ReportListingModal({ listingId, onClose, onReported }: Props) {
  const { t } = useI18n();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const titleId = useId();
  const noteId = useId();
  const firstReasonRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstReasonRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit() {
    if (!reason) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.reportListing(listingId, { reason, note: note.trim() });
      setDone(true);
      onReported();
    } catch (err) {
      setError(errorText(err, t));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal-header">
          <h2 id={titleId}>{t("report.open")}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label={t("common.close")}>
            ×
          </button>
        </div>

        {done ? (
          <>
            <p role="status" style={{ fontSize: 14 }}>
              {t("report.thanks")}
            </p>
            <div className="modal-actions">
              <button type="button" className="btn btn-primary" onClick={onClose}>
                {t("common.close")}
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 16 }}>{t("report.intro")}</p>

            <fieldset className="report-reasons">
              <legend>{t("report.reasonLabel")}</legend>
              {REASONS.map((r, i) => (
                <label key={r}>
                  <input
                    ref={i === 0 ? firstReasonRef : undefined}
                    type="radio"
                    name="report-reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                  />
                  {t(`report.reason.${r}`)}
                </label>
              ))}
            </fieldset>

            <div className="field" style={{ marginTop: 16, marginBottom: 0 }}>
              <label htmlFor={noteId}>{t("report.noteLabel")}</label>
              <textarea
                id={noteId}
                className="input"
                rows={3}
                maxLength={MAX_NOTE_LENGTH}
                placeholder={t("report.notePlaceholder")}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {error && (
              <p role="alert" style={{ fontSize: 13, color: "var(--blocked)", marginTop: 8 }}>
                {error}
              </p>
            )}

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                {t("common.cancel")}
              </button>
              <button type="button" className="btn btn-primary" onClick={submit} disabled={!reason || submitting}>
                {submitting ? t("report.sending") : t("report.submit")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
