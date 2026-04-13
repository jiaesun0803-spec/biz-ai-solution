import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Company, ConsultantProfile, Report } from "@/shared/types";
import type { DbCompany, DbReport } from "@/drizzle/schema";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";

const PROFILE_KEY = "bizconsult_profile";

// ── DB 타입 ↔ 앱 타입 변환 헬퍼 ──────────────────────────────────────────────
function dbCompanyToApp(c: DbCompany): Company {
  return {
    ...c,
    id: String(c.id),
    industry: c.industry ?? "",
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : String(c.createdAt),
    updatedAt: c.updatedAt instanceof Date ? c.updatedAt.toISOString() : String(c.updatedAt),
  } as Company;
}

function dbReportToApp(r: DbReport): Report {
  return {
    id: String(r.id),
    companyId: String(r.companyId),
    companyName: r.companyName,
    type: r.type as Report["type"],
    title: r.title,
    sections: r.sectionsJson ? JSON.parse(r.sectionsJson) : [],
    matchingSummary: r.matchingSummaryJson ? JSON.parse(r.matchingSummaryJson) : undefined,
    companySummary: r.companySummaryJson ? JSON.parse(r.companySummaryJson) : undefined,
    status: (r.status ?? "completed") as Report["status"],
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt),
  };
}

interface DataContextValue {
  companies: Company[];
  reports: Report[];
  profile: ConsultantProfile;
  addCompany: (company: Omit<Company, "id" | "createdAt" | "updatedAt">) => Promise<Company>;
  updateCompany: (id: string, data: Partial<Company>) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;
  addReport: (report: Omit<Report, "id" | "createdAt" | "updatedAt">) => Promise<Report>;
  updateReport: (id: string, data: Partial<Report>) => Promise<void>;
  deleteReport: (id: string) => Promise<void>;
  updateProfile: (data: Partial<ConsultantProfile>) => Promise<void>;
  refetchCompanies: () => void;
  refetchReports: () => void;
  isLoading: boolean;
}

const defaultProfile: ConsultantProfile = {
  name: "",
  company: "",
  title: "경영컨설턴트",
  phone: "",
  email: "",
};

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<ConsultantProfile>(defaultProfile);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // ── tRPC 쿼리 ───────────────────────────────────────────────────────────────────────
  const companiesQuery = trpc.clients.list.useQuery(undefined, {
    retry: 1,
    staleTime: 30_000,
  });
  const reportsQuery = trpc.dbReports.list.useQuery(undefined, {
    retry: 1,
    staleTime: 30_000,
  });

  // ── tRPC Mutation ─────────────────────────────────────────────────────────────────────
  const createCompanyMut = trpc.clients.create.useMutation();
  const updateCompanyMut = trpc.clients.update.useMutation();
  const deleteCompanyMut = trpc.clients.delete.useMutation();
  const createReportMut = trpc.dbReports.create.useMutation();
  const deleteReportMut = trpc.dbReports.delete.useMutation();

  // ── 프로필 로드 (AsyncStorage) ───────────────────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(PROFILE_KEY).then((json) => {
      if (json) setProfile({ ...defaultProfile, ...JSON.parse(json) });
      setProfileLoaded(true);
    }).catch(() => setProfileLoaded(true));
  }, []);

  // ── 파생 데이터 ───────────────────────────────────────────────────────────────────────
  const companies: Company[] = (companiesQuery.data?.data ?? []).map(dbCompanyToApp);
  const reports: Report[] = (reportsQuery.data?.data ?? []).map(dbReportToApp);
  const isLoading = !profileLoaded || companiesQuery.isLoading || reportsQuery.isLoading;

  // ── CRUD 함수 ────────────────────────────────────────────────────────────────────────
  const addCompany = useCallback(async (data: Omit<Company, "id" | "createdAt" | "updatedAt">) => {
    const res = await createCompanyMut.mutateAsync(data as any);
    companiesQuery.refetch();
    if (!res.success || !res.data) throw new Error("업체 등록 실패");
    return dbCompanyToApp(res.data);
  }, [createCompanyMut, companiesQuery]);

  const updateCompany = useCallback(async (id: string, data: Partial<Company>) => {
    await updateCompanyMut.mutateAsync({ id: Number(id), ...data } as any);
    companiesQuery.refetch();
  }, [updateCompanyMut, companiesQuery]);

  const deleteCompany = useCallback(async (id: string) => {
    await deleteCompanyMut.mutateAsync({ id: Number(id) });
    companiesQuery.refetch();
    reportsQuery.refetch();
  }, [deleteCompanyMut, companiesQuery, reportsQuery]);

  const addReport = useCallback(async (data: Omit<Report, "id" | "createdAt" | "updatedAt">) => {
    const res = await createReportMut.mutateAsync({
      companyId: Number(data.companyId),
      companyName: data.companyName,
      type: data.type,
      title: data.title,
      sectionsJson: JSON.stringify(data.sections),
      matchingSummaryJson: data.matchingSummary ? JSON.stringify(data.matchingSummary) : undefined,
      companySummaryJson: data.companySummary ? JSON.stringify(data.companySummary) : undefined,
      status: data.status,
    });
    reportsQuery.refetch();
    if (!res.success || !res.data) throw new Error("보고서 저장 실패");
    return dbReportToApp(res.data);
  }, [createReportMut, reportsQuery]);

  const updateReport = useCallback(async (_id: string, _data: Partial<Report>) => {
    // TODO: dbReports.update 프로시저 추가 후 연동
    reportsQuery.refetch();
  }, [reportsQuery]);

  const deleteReport = useCallback(async (id: string) => {
    await deleteReportMut.mutateAsync({ id: Number(id) });
    reportsQuery.refetch();
  }, [deleteReportMut, reportsQuery]);

  const updateProfile = useCallback(async (data: Partial<ConsultantProfile>) => {
    const updated = { ...profile, ...data };
    setProfile(updated);
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
  }, [profile]);

  const refetchCompanies = useCallback(() => companiesQuery.refetch(), [companiesQuery]);
  const refetchReports = useCallback(() => reportsQuery.refetch(), [reportsQuery]);

  // ── 로그인 완료 시 데이터 즉시 동기화 ──────────────────────────────────────────────
  const { isAuthenticated } = useAuth({ autoFetch: false });
  const prevAuthRef = useRef<boolean | null>(null);

  useEffect(() => {
    // 미인증 → 인증 상태로 전환된 경우에만 즉시 리페치
    if (prevAuthRef.current === false && isAuthenticated === true) {
      companiesQuery.refetch();
      reportsQuery.refetch();
    }
    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <DataContext.Provider
      value={{
        companies,
        reports,
        profile,
        addCompany,
        updateCompany,
        deleteCompany,
        addReport,
        updateReport,
        deleteReport,
        updateProfile,
        refetchCompanies,
        refetchReports,
        isLoading,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
