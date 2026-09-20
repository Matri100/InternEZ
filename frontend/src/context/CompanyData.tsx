import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../api/client";
import type { Company } from "../types/domain";

interface CompanyDataValue {
  company: Company | null;
  loading: boolean;
  refreshCompany: () => Promise<void>;
}

const CompanyDataContext = createContext<CompanyDataValue | null>(null);

export function CompanyDataProvider({ children }: { children: React.ReactNode }) {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshCompany = useCallback(async () => {
    const c = await api.getCompany();
    setCompany(c);
  }, []);

  useEffect(() => {
    refreshCompany().finally(() => setLoading(false));
  }, [refreshCompany]);

  return (
    <CompanyDataContext.Provider value={{ company, loading, refreshCompany }}>{children}</CompanyDataContext.Provider>
  );
}

export function useCompanyData() {
  const ctx = useContext(CompanyDataContext);
  if (!ctx) throw new Error("useCompanyData must be used within CompanyDataProvider");
  return ctx;
}
