import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface GlosaCaseRow {
  id: string;
  reference: string | null;
  internal_folio: string;
  status: string;
  registered_at: string;
  assigned_at: string | null;
  first_started_at: string | null;
  last_started_at: string | null;
  assigned_glosador_user_id: string | null;
  branch_id: string | null;
  executive_id: string | null;
  document_types: { code: string; name: string } | null;
  clients: { nombre: string } | null;
  branches: { nombre: string } | null;
  executives: { nombre: string } | null;
  glosador: { nombre: string } | null;
  findings_count: number;
  rounds_count: number;
  score_total: number | null;
  active_time_seconds: number;
  has_active_session: boolean;
}

export function useGlosaCases(filters: {
  ref: string;
  tipo: string;
  sucursal: string;
  estatus: string;
  ejecutivo: string;
  glosador: string;
  sortAsc: boolean;
}) {
  const { user, isAdmin } = useAuth();

  return useQuery({
    queryKey: ["glosa-cases", filters, user?.id, isAdmin],
    queryFn: async () => {
      let query = supabase
        .from("review_cases")
        .select(`
          *,
          document_types(code, name),
          clients(nombre),
          branches(nombre),
          executives(nombre),
          glosador:profiles!review_cases_glosador_profile_fkey(nombre)
        `)
        .not("status", "eq", "REGISTRADO")
        .is("deleted_at", null)
        .order("updated_at", { ascending: filters.sortAsc });

      if (!isAdmin) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayISO = todayStart.toISOString();
        query = query
          .eq("assigned_glosador_user_id", user!.id)
          .or(
            `and(status.neq.APROBADO,status.neq.RECHAZADO),` +
            `and(status.eq.APROBADO,updated_at.gte.${todayISO}),` +
            `and(status.eq.RECHAZADO,updated_at.gte.${todayISO})`
          );
      } else {
        // Admins see: all active cases + today's APROBADO/RECHAZADO
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayISO = todayStart.toISOString();
        // Active cases: everything except APROBADO and RECHAZADO
        // Today's closed cases: APROBADO or RECHAZADO updated today
        query = query.or(
          `and(status.neq.APROBADO,status.neq.RECHAZADO),` +
          `and(status.eq.APROBADO,updated_at.gte.${todayISO}),` +
          `and(status.eq.RECHAZADO,updated_at.gte.${todayISO})`
        );
      }

      const { data, error } = await query;
      if (error) throw error;

      const caseIds = (data ?? []).map((c) => c.id);
      if (caseIds.length === 0) return [];

      // Split IDs into chunks to avoid Supabase URL length limits
      const chunkSize = 100;
      const chunks: string[][] = [];
      for (let i = 0; i < caseIds.length; i += chunkSize) {
        chunks.push(caseIds.slice(i, i + chunkSize));
      }
      const fetchAll = async <T>(
        table: string,
        columns: string,
        idField: string
      ): Promise<T[]> => {
        const results = await Promise.all(
          chunks.map(chunk =>
            supabase.from(table as any).select(columns).in(idField, chunk)
          )
        );
        return results.flatMap(r => (r.data ?? []) as T[]);
      };

      const [findingsData, roundsData, scoresData, sessionsData] = await Promise.all([
        fetchAll<{ review_case_id: string }>(
          "review_findings",
          "review_case_id",
          "review_case_id"
        ),
        fetchAll<{ review_case_id: string }>(
          "review_rounds",
          "review_case_id",
          "review_case_id"
        ),
        fetchAll<{ review_case_id: string; score_total: number | null }>(
          "review_scores",
          "review_case_id, score_total",
          "review_case_id"
        ),
        fetchAll<{ review_case_id: string; duration_seconds: number | null; session_status: string; started_at: string; paused_at: string | null }>(
          "review_sessions",
          "review_case_id, duration_seconds, session_status, started_at, paused_at",
          "review_case_id"
        ),
      ]);

      const findingsMap: Record<string, number> = {};
      for (const f of findingsData) {
        findingsMap[f.review_case_id] = (findingsMap[f.review_case_id] ?? 0) + 1;
      }

      const roundsMap: Record<string, number> = {};
      for (const r of roundsData) {
        roundsMap[r.review_case_id] = (roundsMap[r.review_case_id] ?? 0) + 1;
      }

      const scoresMap: Record<string, number | null> = {};
      for (const s of scoresData) {
        scoresMap[s.review_case_id] = s.score_total;
      }

      const timeMap: Record<string, number> = {};
      const activeSessionMap: Record<string, boolean> = {};
      for (const s of sessionsData) {
        let secs = s.duration_seconds ?? 0;
        if (s.session_status === "active" && s.started_at) {
          const resumedAt = s.paused_at ?? s.started_at;
          secs += Math.floor((Date.now() - new Date(resumedAt).getTime()) / 1000);
          activeSessionMap[s.review_case_id] = true;
        }
        timeMap[s.review_case_id] = (timeMap[s.review_case_id] ?? 0) + secs;
      }

      let result: GlosaCaseRow[] = (data ?? []).map((c) => ({
        ...c,
        document_types: c.document_types,
        clients: c.clients,
        branches: c.branches,
        executives: c.executives,
        glosador: c.glosador,
        findings_count: findingsMap[c.id] ?? 0,
        rounds_count: roundsMap[c.id] ?? 0,
        score_total: scoresMap[c.id] ?? null,
        active_time_seconds: timeMap[c.id] ?? 0,
        has_active_session: activeSessionMap[c.id] ?? false,
      }));

      // Apply client-side filters
      if (filters.ref) {
        const q = filters.ref.toLowerCase();
        result = result.filter((c) =>
          c.reference?.toLowerCase().includes(q) || c.internal_folio.toLowerCase().includes(q)
        );
      }
      if (filters.tipo && filters.tipo !== "_all") {
        result = result.filter((c) => c.document_types?.code === filters.tipo);
      }
      if (filters.sucursal && filters.sucursal !== "_all") {
        result = result.filter((c) => c.branch_id === filters.sucursal);
      }
      if (filters.estatus && filters.estatus !== "_all") {
        result = result.filter((c) => c.status === filters.estatus);
      }
      if (filters.ejecutivo && filters.ejecutivo !== "_all") {
        result = result.filter((c) => c.executive_id === filters.ejecutivo);
      }
      if (filters.glosador && filters.glosador !== "_all") {
        result = result.filter((c) => c.assigned_glosador_user_id === filters.glosador);
      }

      return result;
    },
    refetchInterval: 30000,
    staleTime: 20000,
  });
}

export function useGlosaActions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["glosa-cases"] });
    queryClient.invalidateQueries({ queryKey: ["glosadores-with-stats"] });
    queryClient.invalidateQueries({ queryKey: ["tablero-kpis"] });
    queryClient.invalidateQueries({ queryKey: ["pendientes"] });
  };

  const pauseActiveSession = async () => {
    // Find any active session for this user and pause it
    const { data: activeSessions } = await supabase
      .from("review_sessions")
      .select("id, review_case_id, started_at, paused_at, duration_seconds")
      .eq("user_id", user!.id)
      .eq("session_status", "active");

    for (const session of activeSessions ?? []) {
      // Calculate elapsed since last resume/start, add to previously accumulated duration
      const resumedAt = session.paused_at ?? session.started_at;
      const newElapsed = Math.floor(
        (Date.now() - new Date(resumedAt).getTime()) / 1000
      );
      const totalDuration = (session.duration_seconds ?? 0) + newElapsed;
      await supabase
        .from("review_sessions")
        .update({
          session_status: "paused",
          paused_at: new Date().toISOString(),
          duration_seconds: totalDuration,
        })
        .eq("id", session.id);

      // Update case status to PAUSADO
      await supabase
        .from("review_cases")
        .update({
          status: "PAUSADO" as const,
          paused_at: new Date().toISOString(),
          updated_by: user!.id,
        })
        .eq("id", session.review_case_id);
    }
  };

  const startGlosa = useMutation({
    mutationFn: async (caseId: string) => {
      // 1. Pause any active session first
      await pauseActiveSession();

      // 2. Create review_round if none exists
      const { data: existingRounds } = await supabase
        .from("review_rounds")
        .select("id")
        .eq("review_case_id", caseId);

      if (!existingRounds || existingRounds.length === 0) {
        await supabase.from("review_rounds").insert({
          review_case_id: caseId,
          round_number: 1,
          round_type: "initial",
          reviewer_user_id: user!.id,
        });
      }

      // 3. Create active session
      await supabase.from("review_sessions").insert({
        review_case_id: caseId,
        user_id: user!.id,
        session_status: "active",
      });

      // 4. Update case
      const now = new Date().toISOString();
      const { data: caseData } = await supabase
        .from("review_cases")
        .select("first_started_at")
        .eq("id", caseId)
        .single();

      await supabase
        .from("review_cases")
        .update({
          status: "EN_REVISION" as const,
          first_started_at: caseData?.first_started_at ?? now,
          last_started_at: now,
          updated_by: user!.id,
        })
        .eq("id", caseId);
    },
    onSuccess: () => {
      toast.success("Revisión iniciada");
      invalidateAll();
    },
    onError: () => toast.error("Error al iniciar revisión"),
  });

  const continueGlosa = useMutation({
    mutationFn: async (caseId: string) => {
      await pauseActiveSession();

      await supabase.from("review_sessions").insert({
        review_case_id: caseId,
        user_id: user!.id,
        session_status: "active",
      });

      // Check if the case was in correction mode before pausing
      // by looking at finding_histories or review_rounds count
      const { data: caseData } = await supabase
        .from("review_cases")
        .select("correction_started_at")
        .eq("id", caseId)
        .single();

      // If correction was started (has a round after first), resume EN_CORRECCION
      const { count: roundCount } = await supabase
        .from("review_rounds")
        .select("id", { count: "exact", head: true })
        .eq("review_case_id", caseId);

      const resumeStatus = (roundCount ?? 0) > 1
        ? "EN_CORRECCION" as const
        : "EN_REVISION" as const;

      await supabase
        .from("review_cases")
        .update({
          status: resumeStatus,
          last_started_at: new Date().toISOString(),
          paused_at: null,
          updated_by: user!.id,
        })
        .eq("id", caseId);
    },
    onSuccess: () => {
      toast.success("Revisión reanudada");
      invalidateAll();
    },
    onError: () => toast.error("Error al continuar revisión"),
  });

  const pauseGlosa = useMutation({
    mutationFn: async (caseId: string) => {
    const { data: activeSessions } = await supabase
        .from("review_sessions")
        .select("id, started_at, paused_at, duration_seconds")
        .eq("review_case_id", caseId)
        .eq("user_id", user!.id)
        .eq("session_status", "active");

      for (const s of activeSessions ?? []) {
        const resumedAt = s.paused_at ?? s.started_at;
        const newElapsed = Math.floor((Date.now() - new Date(resumedAt).getTime()) / 1000);
        await supabase
          .from("review_sessions")
          .update({
            session_status: "paused",
            paused_at: new Date().toISOString(),
            duration_seconds: (s.duration_seconds ?? 0) + newElapsed,
          })
          .eq("id", s.id);
      }

      await supabase
        .from("review_cases")
        .update({
          status: "PAUSADO" as const,
          paused_at: new Date().toISOString(),
          updated_by: user!.id,
        })
        .eq("id", caseId);
    },
    onSuccess: () => {
      toast.success("Revisión pausada");
      invalidateAll();
    },
    onError: () => toast.error("Error al pausar"),
  });

  return { startGlosa, continueGlosa, pauseGlosa };
}

export function useDeletedCases() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["deleted-cases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("review_cases")
        .select(`
          id, reference, internal_folio, status, registered_at,
          deleted_at, delete_reason,
          document_types(name)
        `)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}
