import { useEffect, useState } from "react";
import type { ListingWithComputed } from "../types/domain";
import { api } from "../api/client";
import { EligibilityFlag } from "./EligibilityFlag";
import { MetaRow } from "./MetaRow";
import { ChipGroup } from "./ChipGroup";

interface Props {
  listing: ListingWithComputed;
  onClose: () => void;
  onSubmitted: () => void;
}

export function ApplyModal({ listing, onClose, onSubmitted }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [reusedKeys, setReusedKeys] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError("Please answer every required question before submitting.");
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
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header">
          <div>
            <h2>Apply</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>
              <MetaRow items={[listing.title, listing.company.name]} />
            </p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {listing.eligibilityResult.level !== "ok" && (
          <div style={{ marginBottom: 16 }}>
            <EligibilityFlag result={listing.eligibilityResult} />
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 8 }}>
              You can still apply — this is just a heads-up, not a block.
            </p>
          </div>
        )}

        {isSourced ? (
          <div>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 12 }}>
              This listing comes from {listing.company.name}'s own hiring system — InternEZ doesn't have a
              pipeline on our end for it. Apply directly on their site, then mark it as applied below so it
              shows up in your Applications.
            </p>
            <a
              href={listing.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ display: "inline-block" }}
            >
              Open application on {listing.company.name}'s site ↗
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
                  <span className="reuse-hint">Prefilled from a previous application — edit if needed</span>
                )}
                {q.type === "yes_no" && (
                  <ChipGroup
                    options={["Yes", "No"]}
                    selected={answers[q.key] ? [answers[q.key]] : []}
                    onToggle={(v) => setAnswer(q.key, v)}
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
            Nothing extra needed — your profile covers everything this listing asks for.
          </p>
        )}

        {error && (
          <p style={{ fontSize: 13, color: "var(--blocked)", marginTop: 8 }}>{error}</p>
        )}
        {!error && !canSubmit && (
          <p style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 8 }}>
            Answer every question marked * to submit.
          </p>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={submitting || !canSubmit}>
            {submitting ? "Saving…" : isSourced ? "I've applied — mark as applied" : "Submit application"}
          </button>
        </div>
      </div>
    </div>
  );
}
