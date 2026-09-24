import { useCallback } from "react";
import { useReferenceData } from "../context/ReferenceData";
import { useI18n } from "../i18n";

// A Browse city value ("Warsaw") in the interface language ("Warschau",
// "Warszawa"), from the reference data's city table (backend
// data/cities.ts). Cities not in the table show as the feed spells them.
export function useCityName(): (city: string) => string {
  const { reference } = useReferenceData();
  const { locale } = useI18n();
  return useCallback(
    (city: string) => (locale === "en" ? undefined : reference?.cityNames?.[city]?.[locale]) ?? city,
    [reference, locale]
  );
}
