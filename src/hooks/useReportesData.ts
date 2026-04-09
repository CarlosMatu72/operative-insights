import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  branchId?: string;
  executiveId?: string;
  glosadorId?: string;
  clientId?: string;
  documentTypeId?: string;
  status?: string;
}

export function useReportData(filters: ReportFilters) {
  return useQuery({
    queryKey: ["report-data", filters],
    queryFn: async () => {
      let query = supabase
        .from("review_cases")
        .select(`
          *,
          document_types(code, name),
          branches(nombre),
          executives(nombre),
          clients(nombre),
          glosador:profiles!review_cases_glosador_profile_fkey(nombre)
        `)
        .order("registered_at", { ascending: false });

      if (filters.dateFrom) query = query.gte("registered_at", filters.dateFrom);
      if (filters.dateTo) query = query.lte("registered_at", filters.dateTo + "T23:59:59");
      if (filters.branchId) query = query.eq("branch_id", filters.branchId);
      if (filters.executiveId) query = query.eq("executive_id", filters.executiveId);
      if (filters.glosadorId) query = query.eq("assigned_glosador_user_id", filters.glosadorId);
      if (filters.clientId) query = query.eq("client_id", filters.clientId);
      if (filters.documentTypeId) query = query.eq("document_type_id", filters.documentTypeId);
      if (filters.status) query = query.eq("status", filters.status as Database["public"]["Enums"]["review_status"]);

      // Fetch all rows (handle >1000 limit)
      type CaseRow = Awaited<ReturnType<typeof query.range>>["data"];
      let allData: NonNullable<CaseRow> = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data: page, error } = await query.range(from, from + pageSize - 1);
        if (error) throw error;
        allData = allData.concat(page ?? []);
        if (!page || page.length < pageSize) break;
        from += pageSize;
        // Re-create query for next page
        let nextQuery = supabase
          .from("review_cases")
          .select(`*, document_types(code, name), branches(nombre), executives(nombre), clients(nombre), glosador:profiles!review_cases_glosador_profile_fkey(nombre)`)
          .order("registered_at", { ascending: false });
        if (filters.dateFrom) nextQuery = nextQuery.gte("registered_at", filters.dateFrom);
        if (filters.dateTo) nextQuery = nextQuery.lte("registered_at", filters.dateTo + "T23:59:59");
        if (filters.branchId) nextQuery = nextQuery.eq("branch_id", filters.branchId);
        if (filters.executiveId) nextQuery = nextQuery.eq("executive_id", filters.executiveId);
        if (filters.glosadorId) nextQuery = nextQuery.eq("assigned_glosador_user_id", filters.glosadorId);
        if (filters.clientId) nextQuery = nextQuery.eq("client_id", filters.clientId);
        if (filters.documentTypeId) nextQuery = nextQuery.eq("document_type_id", filters.documentTypeId);
        if (filters.status) nextQuery = nextQuery.eq("status", filters.status as Database["public"]["Enums"]["review_status"]);
        query = nextQuery;
      }
      return allData;
    },
  });
}

export function useReportScores(caseIds: string[]) {
  return useQuery({
    queryKey: ["report-scores", caseIds],
    queryFn: async () => {
      if (caseIds.length === 0) return [];
      const { data } = await supabase
        .from("review_scores")
        .select("*")
        .in("review_case_id", caseIds);
      return data ?? [];
    },
    enabled: caseIds.length > 0,
  });
}

export function useReportFindings(caseIds: string[]) {
  return useQuery({
    queryKey: ["report-findings", caseIds],
    queryFn: async () => {
      if (caseIds.length === 0) return [];
      const { data } = await supabase
        .from("review_findings")
        .select("*, observation_errors(descripcion, codigo_error), observation_categories(nombre)")
        .in("review_case_id", caseIds);
      return data ?? [];
    },
    enabled: caseIds.length > 0,
  });
}

export function useReportSessions(caseIds: string[]) {
  return useQuery({
    queryKey: ["report-sessions", caseIds],
    queryFn: async () => {
      if (caseIds.length === 0) return [];
      const { data } = await supabase
        .from("review_sessions")
        .select("*")
        .in("review_case_id", caseIds);
      return data ?? [];
    },
    enabled: caseIds.length > 0,
  });
}
