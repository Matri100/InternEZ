import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/client";
import type { ReferenceData as ReferenceDataShape } from "../types/domain";

interface ReferenceDataValue {
  reference: ReferenceDataShape | null;
  loading: boolean;
}

const ReferenceDataContext = createContext<ReferenceDataValue | null>(null);

// Reference data (countries, fields of study, skills, etc.) is static and
// needed by both applicant and company pages, so it's fetched once at the
// top of the app rather than duplicated inside each role's own provider.
export function ReferenceDataProvider({ children }: { children: React.ReactNode }) {
  const [reference, setReference] = useState<ReferenceDataShape | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getReference()
      .then(setReference)
      .finally(() => setLoading(false));
  }, []);

  return <ReferenceDataContext.Provider value={{ reference, loading }}>{children}</ReferenceDataContext.Provider>;
}

export function useReferenceData() {
  const ctx = useContext(ReferenceDataContext);
  if (!ctx) throw new Error("useReferenceData must be used within ReferenceDataProvider");
  return ctx;
}
