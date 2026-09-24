import { useEffect, useState } from "react";
import type { ListingSummary } from "../types/domain";
import { api } from "../api/client";
import { EligibilityFlag } from "./EligibilityFlag";
import { MetaRow } from "./MetaRow";
import { ChipGroup } from "./ChipGroup";
import { useI18n } from "../i18n";
import { errorText } from "../i18n/errors";

interface Props {
  listing: ListingSummary;
  onClose: () => void;
  onSubmitted: () => void;
}

export function ApplyModal({ listing, onClose, onSubmitted }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [reusedKeys, setReusedKeys] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();

  const questions = listing.extraQuestions;
  // A "sourced" listing's real hiring pipeline lives on the employer's own
  // ATS, not InternEZ's — there's nothing here to submit an application
  // into. Applying means linking out to the real page; the button below
  // just records that the applicant went and did that (see
  // createApplication's "appliedExternally" status in store.ts).
  const isSourced = listing.origin === "sourced";

  useEffect(() => {
    if (questions.length === 0) return;
    api.getReusedAnswers(listing.id).then((reused) => {
      const keys = Object.keys(reused);
      if (keys.length === 0) return;
      setAnswers((prev) => ({ ...reused, ...prev }));
      setReusedKeys(new Set(keys));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const needsOverride = listing.eligibilityResult.level !== "ok";

  function setAnswer(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setReusedKeys((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }

  const missingRequired = questions.filter((q) => q.required && !(answers[q.key] ?? "").trim());
  const canSubmit = missingRequired.length === 0;

  async function submit() {
    if (!canSubmit) {
      setError(t("apply.answerRequired"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.submitApplication({
        listingId: listing.id,
        overridden: needsOverride,
        answers: questions
          .map((q) => ({ key: q.key, answer: (answers[q.key] ?? "").trim() }))
          .filter((a) => a.answer),
      });
      onSubmitted();
    } catch (e) {
      setError(errorText(e, t));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header">
          <div>
            <h2>{t("apply.title")}</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>
              <MetaRow items={[listing.title, listing.company.name]} />
            </p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label={t("common.close")}>
            ×
          </button>
        </div>

        {listing.eligibilityResult.level !== "ok" && (
          <div style={{ marginBottom: 16 }}>
            <EligibilityFlag result={listing.eligibilityResult} />
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 8 }}>
              {t("apply.stillCanApply")}
            </p>
          </div>
        )}

        {isSourced ? (
          <div>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 12 }}>
              {t("apply.externalBody", { company: listing.company.name })}
            </p>
            <a
              href={listing.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ display: "inline-block" }}
            >
              {t("apply.openExternal", { company: listing.company.name })}
            </a>
          </div>
        ) : questions.length > 0 ? (
          <div className="apply-questions">
            {questions.map((q) => (
              <div className="field" key={q.key}>
                <label>
                  {q.prompt}
                  {q.required && <span className="required-mark"> *</span>}
                </label>
                {reusedKeys.has(q.key) && (
                  <span className="reuse-hint">{t("apply.reused")}</span>
                )}
                {q.type === "yes_no" && (
                  <ChipGroup
                    options={["Yes", "No"]}
                    selected={answers[q.key] ? [answers[q.key]] : []}
                    onToggle={(v) => setAnswer(q.key, v)}
                    label={(v) => (v === "Yes" ? t("common.yes") : t("common.no"))}
                  />
                )}
                {q.type === "short_text" && (
                  <input
                    className="input"
                    value={answers[q.key] ?? ""}
                    onChange={(e) => setAnswer(q.key, e.target.value)}
                  />
                )}
                {q.type === "long_text" && (
                  <textarea
                    className="input"
                    rows={4}
                    value={answers[q.key] ?? ""}
                    onChange={(e) => setAnswer(q.key, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            {t("apply.nothingExtra")}
          </p>
        )}

        {error && (
          <p style={{ fontSize: 13, color: "var(--blocked)", marginTop: 8 }}>{error}</p>
        )}
        {!error && !canSubmit && (
          <p style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 8 }}>
            {t("apply.requiredHint")}
          </p>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={submitting || !canSubmit}>
            {submitting ? t("common.saving") : isSourced ? t("apply.markApplied") : t("apply.submit")}
          </button>
        </div>
      </div>
    </div>
  );
}
