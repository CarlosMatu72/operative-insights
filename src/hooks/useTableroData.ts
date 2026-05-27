import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export function useGlosadores() {
  return useQuery({
    queryKey: ["glosadores-with-stats-v2"],
    queryFn: async () => {
      // Get users with glosa or admin role
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const glosadorIds = (roles ?? [])
        .filter((r) => r.role === "glosa" || r.role === "admin")
        .map((r) => r.user_id);
      if (glosadorIds.length === 0) return [];

      const { data: profiles } = await supabase
        .rpc("get_profiles_display", { _user_ids: glosadorIds });

      // Get active sessions
      const { data: activeSessions } = await supabase
        .from("review_sessions")
        .select("user_id")
        .eq("session_status", "active");

      const activeUserIds = new Set((activeSessions ?? []).map((s) => s.user_id));

      // Monthly stats - approved cases this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: monthCases } = await supabase
        .from("review_cases")
        .select("assigned_glosador_user_id, document_type_id, status, remesas_count")
        .in("assigned_glosador_user_id", glosadorIds)
        .gte("approved_at", startOfMonth.toISOString());

      const { data: docTypes } = await supabase.from("document_types").select("id, code");
      const docTypeMap = Object.fromEntries((docTypes ?? []).map((d) => [d.id, d.code]));

      // Also count EN_REVISION cases per glosador this month
      const { data: allMonthCases } = await supabase
        .from("review_cases")
        .select("assigned_glosador_user_id, document_type_id, status, approved_at, remesas_count")
        .in("assigned_glosador_user_id", glosadorIds)
        .not("status", "eq", "APROBADO") // APROBADO already in monthCases, avoid double fetch
        .is("deleted_at", null);

      // Build stats from ALL assigned cases (approved this month + all active)
      // This gives the true workload distribution across glosadores
      const allCasesForStats = [
        ...(monthCases ?? []),
        ...(allMonthCases ?? []).filter(c => c.status !== "APROBADO"), // avoid double-counting
      ];
      const statsMap: Record<string, {
        pedimentos: number;
        consolidados: number;
        remesas: number;
      }> = {};
      for (const c of allCasesForStats) {
        const uid = c.assigned_glosador_user_id;
        if (!uid) continue;
        if (!statsMap[uid]) statsMap[uid] = { pedimentos: 0, consolidados: 0, remesas: 0 };
        const code = docTypeMap[c.document_type_id!];
        if (code === "REMESA") {
          statsMap[uid].remesas += (c as any).remesas_count ?? 1;
        } else if (code === "CONSOLIDADO") {
          statsMap[uid].consolidados++;
        } else if (code !== "ALTA_REMESA") {
          // Exclude ALTA_REMESA — they are administrative records, not real glosas
          statsMap[uid].pedimentos++;
        }
      }


      // Total across ALL glosadores = denominator for true proportion
      const totalWorkload = Math.max(
        1,
        Object.values(statsMap).reduce(
          (sum, s) => sum + s.pedimentos + s.consolidados + s.remesas, 0
        )
      );

      return (profiles ?? []).filter(p => p.activo)
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .map((p) => ({
          ...p,
          isActive: activeUserIds.has(p.id),
          pedimentos: statsMap[p.id]?.pedimentos ?? 0,
          consolidados: statsMap[p.id]?.consolidados ?? 0,
          remesas: statsMap[p.id]?.remesas ?? 0,
          pedConsolidados: (statsMap[p.id]?.pedimentos ?? 0) + (statsMap[p.id]?.consolidados ?? 0),
          cargaPct: Math.round(
            ((statsMap[p.id]?.pedimentos ?? 0) +
             (statsMap[p.id]?.consolidados ?? 0) +
             (statsMap[p.id]?.remesas ?? 0)) / totalWorkload * 100
          ),
        }));
    },
    refetchInterval: 15000,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

export function usePendientes(sortAsc = true) {
  return useQuery({
    queryKey: ["pendientes", sortAsc],
    queryFn: async () => {
      // Get ALTA_REMESA doc type id to exclude from queue
      const { data: docTypes } = await supabase.from("document_types").select("id, code");
      const altaRemesaId = docTypes?.find(d => d.code === "ALTA_REMESA")?.id;

      let query = supabase
        .from("review_cases")
        .select(`
          *,
          document_types(code, name),
          branches(nombre),
          executives(nombre),
          glosador:profiles!review_cases_glosador_profile_fkey(nombre)
        `)
        .in("status", ["REGISTRADO", "ASIGNADO"])
        .is("deleted_at", null)
        .order("registered_at", { ascending: sortAsc });

      if (altaRemesaId) {
        query = query.neq("document_type_id", altaRemesaId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 15000,
  });
}

export function useKPIs() {
  return useQuery({
    queryKey: ["tablero-kpis"],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // Get ALTA_REMESA id to exclude from pendientes count
      const { data: docTypes } = await supabase.from("document_types").select("id, code");
      const altaRemesaId = docTypes?.find(d => d.code === "ALTA_REMESA")?.id;

      let pendQuery = supabase.from("review_cases").select("id", { count: "exact", head: true }).in("status", ["REGISTRADO", "ASIGNADO"]).is("deleted_at", null);
      if (altaRemesaId) {
        pendQuery = pendQuery.neq("document_type_id", altaRemesaId);
      }

      const [pendRes, revRes, aprobRes, allApproved, pausRes, rechRes, totalRes] = await Promise.all([
        pendQuery,
        supabase.from("review_cases").select("id", { count: "exact", head: true }).eq("status", "EN_REVISION").is("deleted_at", null),
        supabase.from("review_cases").select("id, document_type_id", { count: "exact" }).eq("status", "APROBADO").is("deleted_at", null).gte("approved_at", startOfMonth.toISOString()),
        supabase.from("review_cases").select("document_type_id, remesas_count").eq("status", "APROBADO").is("deleted_at", null).gte("approved_at", startOfMonth.toISOString()),
        supabase.from("review_cases").select("id", { count: "exact", head: true }).in("status", ["PAUSADO", "CORRECCION_PENDIENTE", "EN_CORRECCION"]).is("deleted_at", null),
        supabase.from("review_cases").select("id", { count: "exact", head: true }).eq("status", "RECHAZADO").is("deleted_at", null),
        (() => {
          let q = supabase.from("review_cases")
            .select("id", { count: "exact", head: true })
            .is("deleted_at", null);
          if (altaRemesaId) q = q.neq("document_type_id", altaRemesaId);
          return q;
        })(),
      ]);

      const docTypeMap = Object.fromEntries((docTypes ?? []).map((d) => [d.id, d.code]));

      let remesasMes = 0;
      let pedConMes = 0;
      for (const c of allApproved.data ?? []) {
        if (docTypeMap[c.document_type_id!] === "REMESA") {
          remesasMes += (c as any).remesas_count ?? 1;
        } else {
          pedConMes++;
        }
      }
      const aprobadosMesReal = pedConMes + remesasMes;

      return {
        pendientes: pendRes.count ?? 0,
        enRevision: revRes.count ?? 0,
        aprobadosMes: aprobadosMesReal,
        remesasMes,
        pedConMes,
        pausados: pausRes.count ?? 0,
        rechazados: rechRes.count ?? 0,
        total: totalRes.count ?? 0,
      };
    },
    refetchInterval: 30000,
  });
}

export function useRealtimeSessions() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const channel = supabase
      .channel("session-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "review_sessions" }, () => {
        setTick((t) => t + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);
}
