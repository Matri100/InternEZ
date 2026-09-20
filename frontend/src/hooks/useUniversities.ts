import { useEffect, useState } from "react";
import { api } from "../api/client";

// Module-level cache shared by every EduEntryForm instance, so switching a
// country back and forth (or having multiple entries for the same country)
// only ever fetches that country's list once per session.
const cache = new Map<string, string[]>();
const inFlight = new Map<string, Promise<string[]>>();

export function useUniversities(country: string): { universities: string[]; loading: boolean } {
  const [universities, setUniversities] = useState<string[]>(() => cache.get(country) ?? []);
  const [loading, setLoading] = useState(() => !!country && !cache.has(country));

  useEffect(() => {
    if (!country) {
      setUniversities([]);
      setLoading(false);
      return;
    }
    const cached = cache.get(country);
    if (cached) {
      setUniversities(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    let request = inFlight.get(country);
    if (!request) {
      request = api.getUniversities(country);
      inFlight.set(country, request);
    }
    let cancelled = false;
    request
      .then((list) => {
        cache.set(country, list);
        inFlight.delete(country);
        if (!cancelled) {
          setUniversities(list);
          setLoading(false);
        }
      })
      .catch(() => {
        inFlight.delete(country);
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [country]);

  return { universities, loading };
}
