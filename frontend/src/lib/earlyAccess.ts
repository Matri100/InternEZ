// localStorage, not sessionStorage — sessionStorage turned out to be
// unreliable on mobile (iOS Safari and some Android browsers can tear
// down a backgrounded tab's sessionStorage when the OS reclaims memory,
// which showed up as randomly bouncing back to the gate after switching
// apps and returning). localStorage survives that. The trade-off is it's
// no longer strictly per-tab — traded for the expiry below instead, so a
// stored key still doesn't sit valid indefinitely on a shared device.
const STORAGE_KEY = "internez_ea";
const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

interface StoredEarlyAccess {
  key: string;
  storedAt: number;
}

export function getStoredEarlyAccessKey(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredEarlyAccess;
    if (typeof parsed.key !== "string" || typeof parsed.storedAt !== "number") {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (Date.now() - parsed.storedAt > EXPIRY_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed.key;
  } catch {
    return null;
  }
}

export function storeEarlyAccessKey(key: string): void {
  try {
    const record: StoredEarlyAccess = { key, storedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // localStorage can throw (private browsing, blocked/full storage) —
    // the key still works for this page load, it just won't be remembered.
  }
}

export function clearStoredEarlyAccessKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
