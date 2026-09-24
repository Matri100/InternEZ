import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";
import { LOCALES, type Locale } from "../i18n/locales";
import { Flag } from "./Flag";

// The flag dropdown in the top corner of every page. A listbox: the arrow
// keys move through the languages, Enter picks one, Escape or a click
// outside closes it.
export function LanguageMenu() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  function openMenu() {
    setActive(Math.max(0, LOCALES.findIndex((l) => l.code === locale)));
    setOpen(true);
  }

  function choose(code: Locale) {
    setLocale(code);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function onListKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % LOCALES.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + LOCALES.length) % LOCALES.length);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(LOCALES.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(LOCALES[active].code);
    } else if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
      if (e.key === "Escape") buttonRef.current?.focus();
    }
  }

  return (
    <div className="language-menu" ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        className="language-menu-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t("language.choose")}: ${current.name}`}
        title={t("language.choose")}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            openMenu();
          }
        }}
      >
        <Flag code={current.flag} />
        <span className="language-menu-code">{current.code.toUpperCase()}</span>
        <svg className="language-menu-chevron" viewBox="0 0 10 6" aria-hidden="true">
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      {open && (
        <ul
          ref={listRef}
          className="language-menu-list"
          role="listbox"
          tabIndex={-1}
          aria-label={t("language.label")}
          aria-activedescendant={`language-option-${LOCALES[active].code}`}
          onKeyDown={onListKeyDown}
        >
          {LOCALES.map((option, i) => (
            <li
              key={option.code}
              id={`language-option-${option.code}`}
              role="option"
              lang={option.code}
              aria-selected={option.code === locale}
              className={`language-menu-option ${i === active ? "active" : ""} ${option.code === locale ? "selected" : ""}`}
              onClick={() => choose(option.code)}
              onPointerMove={() => setActive(i)}
            >
              <Flag code={option.flag} />
              <span>{option.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
