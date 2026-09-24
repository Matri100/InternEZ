// Display settings from the accessibility menu (components/AccessibilityMenu).
// Each one is a data attribute on <html> that global.css reacts to, so no
// component needs to know about them. Stored per browser; applied in
// main.tsx before the first render, so a page never flashes in the wrong
// contrast or size.

export type TextSize = 100 | 115 | 130;

export interface AccessibilitySettings {
  highContrast: boolean;
  textSize: TextSize;
  underlineLinks: boolean;
  // WCAG 1.4.12-style spacing (line, letter and word) — easier to read for
  // many people with dyslexia or low vision.
  wideSpacing: boolean;
  reduceMotion: boolean;
}

export const TEXT_SIZES: TextSize[] = [100, 115, 130];

const STORAGE_KEY = "iez_a11y";

function prefers(query: string): boolean {
  try {
    return window.matchMedia(query).matches;
  } catch {
    return false;
  }
}

// Until someone changes a setting, contrast and motion follow the
// operating system's own accessibility preferences.
export function defaultSettings(): AccessibilitySettings {
  return {
    highContrast: prefers("(prefers-contrast: more)"),
    textSize: 100,
    underlineLinks: false,
    wideSpacing: false,
    reduceMotion: prefers("(prefers-reduced-motion: reduce)"),
  };
}

export function loadSettings(): AccessibilitySettings {
  const defaults = defaultSettings();
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (!stored || typeof stored !== "object") return defaults;
    return {
      highContrast: typeof stored.highContrast === "boolean" ? stored.highContrast : defaults.highContrast,
      textSize: TEXT_SIZES.includes(stored.textSize) ? stored.textSize : defaults.textSize,
      underlineLinks: typeof stored.underlineLinks === "boolean" ? stored.underlineLinks : defaults.underlineLinks,
      wideSpacing: typeof stored.wideSpacing === "boolean" ? stored.wideSpacing : defaults.wideSpacing,
      reduceMotion: typeof stored.reduceMotion === "boolean" ? stored.reduceMotion : defaults.reduceMotion,
    };
  } catch {
    return defaults;
  }
}

export function saveSettings(settings: AccessibilitySettings | null): void {
  try {
    if (settings) localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked — the settings still apply for this visit.
  }
}

function setFlag(root: HTMLElement, name: string, value: string | null) {
  if (value === null) root.removeAttribute(name);
  else root.setAttribute(name, value);
}

export function applySettings(settings: AccessibilitySettings): void {
  const root = document.documentElement;
  setFlag(root, "data-contrast", settings.highContrast ? "high" : null);
  setFlag(root, "data-text-size", settings.textSize === 100 ? null : String(settings.textSize));
  setFlag(root, "data-links", settings.underlineLinks ? "underline" : null);
  setFlag(root, "data-spacing", settings.wideSpacing ? "wide" : null);
  setFlag(root, "data-motion", settings.reduceMotion ? "reduce" : null);
}

// For code that animates on its own (smooth scrolling).
export function motionReduced(): boolean {
  return document.documentElement.getAttribute("data-motion") === "reduce" || prefers("(prefers-reduced-motion: reduce)");
}
