// sessionStorage, not localStorage or a cookie — dies when the tab closes,
// on purpose. See EarlyAccessGate and api/client.ts for how it's used.
export const EARLY_ACCESS_STORAGE_KEY = "internez_ea_key";

export function getStoredEarlyAccessKey(): string | null {
  try {
    return sessionStorage.getItem(EARLY_ACCESS_STORAGE_KEY);
  } catch {
    return null;
  }
}
