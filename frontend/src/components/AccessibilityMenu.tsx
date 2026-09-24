import { useEffect, useId, useRef, useState } from "react";
import { useAccessibility } from "../accessibility/AccessibilityContext";
import { TEXT_SIZES, type AccessibilitySettings } from "../accessibility/settings";
import { useI18n } from "../i18n";
import type { MessageKey } from "../i18n/messages/en";
import { AccessibilityIcon } from "./icons";

type Toggle = "highContrast" | "underlineLinks" | "wideSpacing" | "reduceMotion";

const TOGGLES: { key: Toggle; label: MessageKey; hint: MessageKey }[] = [
  { key: "highContrast", label: "a11y.highContrast", hint: "a11y.highContrastHint" },
  { key: "underlineLinks", label: "a11y.underlineLinks", hint: "a11y.underlineLinksHint" },
  { key: "wideSpacing", label: "a11y.wideSpacing", hint: "a11y.wideSpacingHint" },
  { key: "reduceMotion", label: "a11y.reduceMotion", hint: "a11y.reduceMotionHint" },
];

const SIZE_LABELS: Record<AccessibilitySettings["textSize"], MessageKey> = {
  100: "a11y.sizeNormal",
  115: "a11y.sizeLarge",
  130: "a11y.sizeLarger",
};

// The accessibility button next to the language menu: contrast, text
// size and a few reading aids (see accessibility/settings.ts). A small
// non-modal dialog — Escape or a click outside closes it.
export function AccessibilityMenu() {
  const { settings, update, reset } = useAccessibility();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="a11y-menu" ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        className="a11y-menu-button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t("a11y.title")}
        title={t("a11y.title")}
        onClick={() => setOpen((v) => !v)}
      >
        <AccessibilityIcon />
      </button>
      {open && (
        <div ref={panelRef} className="a11y-panel" role="dialog" aria-labelledby={titleId} tabIndex={-1}>
          <p className="a11y-panel-title" id={titleId}>
            {t("a11y.title")}
          </p>

          <div className="a11y-row">
            <span className="a11y-label" id={`${titleId}-size`}>
              {t("a11y.textSize")}
            </span>
            <div className="a11y-sizes" role="radiogroup" aria-labelledby={`${titleId}-size`}>
              {TEXT_SIZES.map((size, i) => (
                <button
                  key={size}
                  type="button"
                  role="radio"
                  aria-checked={settings.textSize === size}
                  aria-label={t(SIZE_LABELS[size])}
                  title={t(SIZE_LABELS[size])}
                  className={`a11y-size ${settings.textSize === size ? "selected" : ""}`}
                  style={{ fontSize: 12 + i * 3 }}
                  onClick={() => update({ textSize: size })}
                >
                  A
                </button>
              ))}
            </div>
          </div>

          {TOGGLES.map(({ key, label, hint }) => (
            <label className="a11y-row a11y-toggle" key={key}>
              <span>
                <span className="a11y-label">{t(label)}</span>
                <span className="a11y-hint">{t(hint)}</span>
              </span>
              <input
                type="checkbox"
                role="switch"
                checked={settings[key]}
                onChange={(e) => update({ [key]: e.target.checked })}
              />
            </label>
          ))}

          <button type="button" className="btn btn-ghost btn-sm a11y-reset" onClick={reset}>
            {t("a11y.reset")}
          </button>
        </div>
      )}
    </div>
  );
}
