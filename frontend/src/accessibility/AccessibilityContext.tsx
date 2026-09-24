import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import {
  applySettings,
  defaultSettings,
  loadSettings,
  saveSettings,
  type AccessibilitySettings,
} from "./settings";

interface AccessibilityValue {
  settings: AccessibilitySettings;
  update: (patch: Partial<AccessibilitySettings>) => void;
  reset: () => void;
}

const AccessibilityContext = createContext<AccessibilityValue | null>(null);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(loadSettings);

  const update = useCallback((patch: Partial<AccessibilitySettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      applySettings(next);
      saveSettings(next);
      return next;
    });
  }, []);

  // Back to the defaults, which follow the operating system again.
  const reset = useCallback(() => {
    const next = defaultSettings();
    applySettings(next);
    saveSettings(null);
    setSettings(next);
  }, []);

  return (
    <AccessibilityContext.Provider value={{ settings, update, reset }}>{children}</AccessibilityContext.Provider>
  );
}

export function useAccessibility(): AccessibilityValue {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error("useAccessibility must be used within AccessibilityProvider");
  return ctx;
}
