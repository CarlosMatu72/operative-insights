import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// ── Queries ──────────────────────────────────────────────

export function useReviewCase(caseId: string) {
  return useQuery({
    queryKey: ["review-case-detail", caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("review_cases")
        .select(`
          *,
          document_types(id, code, name),
          branches(id, nombre),
          executives(id, nombre),
          clients(id, nombre),
          glosador:profiles!review_cases_glosador_profile_fkey(nombre)
        `)
        .eq("id", caseId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!caseId,
  });
}

export function useReviewDetails(caseId: string) {
  return useQuery({
    queryKey: ["review-case-details", caseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("review_case_details")
        .select("*")
        .eq("review_case_id", caseId)
        .maybeSingle();
      return data;
    },
    enabled: !!caseId,
  });
}

export function useReviewClassifications(caseId: string) {
  return useQuery({
    queryKey: ["review-classifications", caseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("review_case_classifications")
        .select("*, classification_features(id, nombre)")
        .eq("review_case_id", caseId);
      return data ?? [];
    },
    enabled: !!caseId,
  });
}

export function useReviewDocumentation(caseId: string) {
  return useQuery({
    queryKey: ["review-documentation", caseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("review_case_documentation")
        .select("*")
        .eq("review_case_id", caseId)
        .maybeSingle();
      return data;
    },
    enabled: !!caseId,
  });
}

export function useReviewFindings(caseId: string) {
  return useQuery({
    queryKey: ["review-findings", caseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("review_findings")
        .select(`
          *,
          observation_categories(nombre),
          observation_subcategories(nombre),
          observation_errors(descripcion, codigo_error, descuento_puntos)
        `)
        .eq("review_case_id", caseId)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
    enabled: !!caseId,
  });
}

export function useClassificationFeatures() {
  return useQuery({
    queryKey: ["classification-features-active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("classification_features")
        .select("*")
        .eq("activo", true)
        .order("nombre");
      return data ?? [];
    },
  });
}

export function useClassificationRules() {
  return useQuery({
    queryKey: ["classification-rules"],
    queryFn: async () => {
      const { data } = await supabase.from("classification_feature_rules").select("*");
      return data ?? [];
    },
  });
}

export function useObservationCatalog() {
  const categories = useQuery({
    queryKey: ["obs-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("observation_categories").select("*").eq("activo", true).order("orden");
      return data ?? [];
    },
  });
  const subcategories = useQuery({
    queryKey: ["obs-subcategories"],
    queryFn: async () => {
      const { data } = await supabase.from("observation_subcategories").select("*").eq("activo", true).order("orden");
      return data ?? [];
    },
  });
  const errors = useQuery({
    queryKey: ["obs-errors"],
    queryFn: async () => {
      const { data } = await supabase.from("observation_errors").select("*").eq("activo", true).order("descripcion");
      return data ?? [];
    },
  });
  return { categories, subcategories, errors };
}

export function useItemRanges() {
  return useQuery({
    queryKey: ["item-ranges-active"],
    queryFn: async () => {
      const { data } = await supabase.from("item_ranges").select("*").eq("activo", true).order("min_partidas");
      return data ?? [];
    },
  });
}

export function useCustomsKeys() {
  return useQuery({
    queryKey: ["customs-keys-active"],
    queryFn: async () => {
      const { data } = await supabase.from("customs_keys").select("*").eq("activo", true).order("clave");
      return data ?? [];
    },
  });
}

// ── History queries ──────────────────────────────────────

export function useReviewRounds(caseId: string) {
  return useQuery({
    queryKey: ["review-rounds", caseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("review_rounds")
        .select("*, reviewer:profiles!review_rounds_reviewer_user_id_fkey(nombre)")
        .eq("review_case_id", caseId)
        .order("round_number", { ascending: true });
      return data ?? [];
    },
    enabled: !!caseId,
  });
}

export function useFindingHistories(caseId: string) {
  return useQuery({
    queryKey: ["finding-histories", caseId],
    queryFn: async () => {
      // Get all findings for this case first
      const { data: findings } = await supabase
        .from("review_findings")
        .select("id")
        .eq("review_case_id", caseId);
      const ids = (findings ?? []).map((f) => f.id);
      if (ids.length === 0) return [];

      const { data } = await supabase
        .from("finding_histories")
        .select("*, reviewer:profiles!finding_histories_created_by_fkey(nombre)")
        .in("finding_id", ids)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
    enabled: !!caseId,
  });
}

export function useRejectionHistories(caseId: string) {
  return useQuery({
    queryKey: ["rejection-histories", caseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("rejection_histories")
        .select("*, rejector:profiles!rejection_histories_rejected_by_fkey(nombre), reopener:profiles!rejection_histories_reopened_by_fkey(nombre)")
        .eq("review_case_id", caseId)
        .order("rejected_at", { ascending: true });
      return data ?? [];
    },
    enabled: !!caseId,
  });
}

// ── Actions ──────────────────────────────────────────────

export function useReviewActions(caseId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["review-case-detail", caseId] });
    queryClient.invalidateQueries({ queryKey: ["review-case-details", caseId] });
    queryClient.invalidateQueries({ queryKey: ["review-classifications", caseId] });
    queryClient.invalidateQueries({ queryKey: ["review-documentation", caseId] });
    queryClient.invalidateQueries({ queryKey: ["review-findings", caseId] });
    queryClient.invalidateQueries({ queryKey: ["review-rounds", caseId] });
    queryClient.invalidateQueries({ queryKey: ["finding-histories", caseId] });
    queryClient.invalidateQueries({ queryKey: ["rejection-histories", caseId] });
    queryClient.invalidateQueries({ queryKey: ["glosa-cases"] });
  };

  const saveDetails = useMutation({
    mutationFn: async (details: {
      branch_id?: string; client_id?: string; executive_id?: string;
      customs_key_id?: string; partidas?: number; item_range_id?: string;
      comments_generales?: string;
    }) => {
      const { data: existing } = await supabase
        .from("review_case_details").select("id").eq("review_case_id", caseId).maybeSingle();
      if (existing) {
        const { error } = await supabase.from("review_case_details").update(details).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("review_case_details").insert({ review_case_id: caseId, ...details });
        if (error) throw error;
      }
      const caseUpdate: any = { updated_by: user!.id };
      if (details.branch_id) caseUpdate.branch_id = details.branch_id;
      if (details.client_id) caseUpdate.client_id = details.client_id;
      if (details.executive_id) caseUpdate.executive_id = details.executive_id;
      await supabase.from("review_cases").update(caseUpdate).eq("id", caseId);
    },
    onSuccess: () => { toast.success("Datos guardados"); invalidate(); },
    onError: () => toast.error("Error al guardar datos"),
  });

  const saveClassifications = useMutation({
    mutationFn: async (classifications: { feature_id: string; value: boolean }[]) => {
      await supabase.from("review_case_classifications").delete().eq("review_case_id", caseId);
      if (classifications.length > 0) {
        const { error } = await supabase.from("review_case_classifications").insert(
          classifications.map((c) => ({
            review_case_id: caseId,
            classification_feature_id: c.feature_id,
            value_boolean: c.value,
          }))
        );
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Clasificación guardada"); invalidate(); },
    onError: () => toast.error("Error al guardar clasificación"),
  });

  const saveDocumentation = useMutation({
    mutationFn: async (doc: { status: string; comment: string }) => {
      const { data: existing } = await supabase
        .from("review_case_documentation").select("id").eq("review_case_id", caseId).maybeSingle();
      const payload = { documentation_status: doc.status, documentation_comment: doc.comment };
      if (existing) {
        await supabase.from("review_case_documentation").update(payload).eq("id", existing.id);
      } else {
        await supabase.from("review_case_documentation").insert({ review_case_id: caseId, ...payload });
      }
    },
    onSuccess: () => { toast.success("Documentación guardada"); invalidate(); },
    onError: () => toast.error("Error al guardar documentación"),
  });

  const addFinding = useMutation({
    mutationFn: async (finding: {
      category_id: string; subcategory_id: string;
      observation_error_id: string; comentario_inicial: string;
    }) => {
      const { data: rounds } = await supabase
        .from("review_rounds").select("id")
        .eq("review_case_id", caseId)
        .order("round_number", { ascending: false }).limit(1);
      const { error } = await supabase.from("review_findings").insert({
        review_case_id: caseId,
        review_round_id: rounds?.[0]?.id ?? null,
        category_id: finding.category_id,
        subcategory_id: finding.subcategory_id,
        observation_error_id: finding.observation_error_id,
        comentario_inicial: finding.comentario_inicial,
        created_by: user!.id,
        current_status: "open",
        is_open: true,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Observación registrada"); invalidate(); },
    onError: () => toast.error("Error al registrar observación"),
  });

  const removeFinding = useMutation({
    mutationFn: async (findingId: string) => {
      const { error } = await supabase
        .from("review_findings")
        .update({ current_status: "closed", is_open: false })
        .eq("id", findingId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Observación cerrada"); invalidate(); },
  });

  const updateFindingStatus = useMutation({
    mutationFn: async ({
      findingId, newStatus, comment,
    }: { findingId: string; newStatus: string; comment: string }) => {
      // Get current finding status
      const { data: finding } = await supabase
        .from("review_findings").select("current_status").eq("id", findingId).single();

      // Get current round
      const { data: rounds } = await supabase
        .from("review_rounds").select("id")
        .eq("review_case_id", caseId)
        .order("round_number", { ascending: false }).limit(1);

      // Create history entry
      await supabase.from("finding_histories").insert({
        finding_id: findingId,
        previous_status: finding?.current_status ?? null,
        new_status: newStatus,
        comment: comment || null,
        review_round_id: rounds?.[0]?.id ?? null,
        created_by: user!.id,
      });

      // Update finding
      const isOpen = newStatus !== "CORRECTED";
      await supabase
        .from("review_findings")
        .update({ current_status: newStatus, is_open: isOpen })
        .eq("id", findingId);
    },
    onSuccess: () => { toast.success("Estado de observación actualizado"); invalidate(); },
    onError: () => toast.error("Error al actualizar estado"),
  });

  const startCorrection = useMutation({
    mutationFn: async () => {
      // Pause any active session for this user first (single-session rule)
      const { data: activeSessions } = await supabase
        .from("review_sessions")
        .select("id, review_case_id, started_at, paused_at, duration_seconds")
        .eq("user_id", user!.id)
        .eq("session_status", "active");

      for (const session of activeSessions ?? []) {
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

        if (session.review_case_id !== caseId) {
          await supabase
            .from("review_cases")
            .update({ status: "PAUSADO" as any, paused_at: new Date().toISOString(), updated_by: user!.id })
            .eq("id", session.review_case_id);
        }
      }

      // Get max round number
      const { data: rounds } = await supabase
        .from("review_rounds").select("round_number")
        .eq("review_case_id", caseId)
        .order("round_number", { ascending: false }).limit(1);

      const nextRound = (rounds?.[0]?.round_number ?? 0) + 1;

      await supabase.from("review_rounds").insert({
        review_case_id: caseId,
        round_number: nextRound,
        round_type: "correction",
        reviewer_user_id: user!.id,
      });

      // Create active session
      await supabase.from("review_sessions").insert({
        review_case_id: caseId,
        user_id: user!.id,
        session_status: "active",
      });

      await supabase.from("review_cases").update({
        status: "EN_CORRECCION" as any,
        last_started_at: new Date().toISOString(),
        updated_by: user!.id,
      }).eq("id", caseId);
    },
    onSuccess: () => { toast.success("Revisión de corrección iniciada"); invalidate(); },
    onError: () => toast.error("Error al iniciar corrección"),
  });

  const approveCase = useMutation({
    mutationFn: async () => {
      const { data: rounds } = await supabase
        .from("review_rounds").select("id, round_number")
        .eq("review_case_id", caseId)
        .order("round_number", { ascending: false });
      if (rounds?.[0]) {
        await supabase.from("review_rounds")
          .update({ closed_at: new Date().toISOString(), result_status: "APPROVED" })
          .eq("id", rounds[0].id);
      }
      await supabase.from("review_sessions")
        .update({ session_status: "completed", ended_at: new Date().toISOString() })
        .eq("review_case_id", caseId).eq("session_status", "active");
      await supabase.from("review_cases").update({
        status: "APROBADO" as any, approved_at: new Date().toISOString(), updated_by: user!.id,
      }).eq("id", caseId);

      // Calculate and save score
      try {
        const correctionRounds = (rounds ?? []).filter((r: any) => r.round_number > 1).length;
        const { data: findings } = await supabase
          .from("review_findings").select("observation_error_id, is_open")
          .eq("review_case_id", caseId);
        const totalErrors = (findings ?? []).length;

        // Get active scoring rule
        const { data: scoringRules } = await supabase
          .from("scoring_rules").select("*").eq("activo", true).limit(1);
        const rule = scoringRules?.[0];
        const baseScore = rule?.valor_base ?? 100;
        const classWeight = Number(rule?.classification_weight ?? 0.2);
        const obsWeight = Number(rule?.observations_weight ?? 0.8);

        // Classification score: penalize by correction rounds
        const classScore = correctionRounds === 0 ? baseScore : Math.max(0, baseScore - correctionRounds * 15);

        // Observations score: penalize by error count
        let penaltyFromErrors = 0;
        if (rule && findings) {
          const errorIds = findings.map((f) => f.observation_error_id).filter(Boolean) as string[];
          if (errorIds.length > 0) {
            const { data: penalties } = await supabase
              .from("scoring_rule_error_penalties").select("observation_error_id, penalty_points")
              .eq("scoring_rule_id", rule.id).in("observation_error_id", errorIds);
            penaltyFromErrors = (penalties ?? []).reduce((sum, p) => sum + Number(p.penalty_points), 0);
          }
        }
        const obsScore = Math.max(0, baseScore - (totalErrors * 5) - penaltyFromErrors);

        const scoreTotal = Math.round(classScore * classWeight + obsScore * obsWeight);

        await supabase.from("review_scores").insert({
          review_case_id: caseId,
          score_total: scoreTotal,
          score_classification: Math.round(classScore),
          score_observations: Math.round(obsScore),
          total_errors: totalErrors,
          correction_rounds: correctionRounds,
          calculated_by: user!.id,
        });
      } catch (e) {
        console.error("Error calculating score:", e);
      }
      // Audit
      await (supabase as any).from("audit_logs").insert({
        action: "APROBAR_TRAMITE", table_name: "review_cases", record_id: caseId, user_id: user!.id,
      });
    },
    onSuccess: () => { toast.success("Trámite aprobado"); invalidate(); },
    onError: () => toast.error("Error al aprobar"),
  });

  const rejectCase = useMutation({
    mutationFn: async (motivo: string) => {
      const { data: rounds } = await supabase
        .from("review_rounds").select("id")
        .eq("review_case_id", caseId)
        .order("round_number", { ascending: false }).limit(1);
      if (rounds?.[0]) {
        await supabase.from("review_rounds")
          .update({ closed_at: new Date().toISOString(), result_status: "REJECTED" })
          .eq("id", rounds[0].id);
      }
      await supabase.from("rejection_histories").insert({
        review_case_id: caseId, review_round_id: rounds?.[0]?.id ?? null,
        motivo, rejected_by: user!.id,
      });
      await supabase.from("review_sessions")
        .update({ session_status: "completed", ended_at: new Date().toISOString() })
        .eq("review_case_id", caseId).eq("session_status", "active");
      await supabase.from("review_cases").update({
        status: "RECHAZADO" as any, rejected_at: new Date().toISOString(), updated_by: user!.id,
      }).eq("id", caseId);
      await (supabase as any).from("audit_logs").insert({
        action: "RECHAZAR_TRAMITE", table_name: "review_cases", record_id: caseId, user_id: user!.id, details: { motivo },
      });
    },
    onSuccess: () => { toast.success("Trámite rechazado"); invalidate(); },
    onError: () => toast.error("Error al rechazar"),
  });

  const saveWithObservations = useMutation({
    mutationFn: async () => {
      const { data: rounds } = await supabase
        .from("review_rounds").select("id")
        .eq("review_case_id", caseId)
        .order("round_number", { ascending: false }).limit(1);
      if (rounds?.[0]) {
        await supabase.from("review_rounds")
          .update({ closed_at: new Date().toISOString(), result_status: "WITH_OBSERVATIONS" })
          .eq("id", rounds[0].id);
      }
      await supabase.from("review_sessions")
        .update({ session_status: "completed", ended_at: new Date().toISOString() })
        .eq("review_case_id", caseId).eq("session_status", "active");
      await supabase.from("review_cases").update({
        status: "CORRECCION_PENDIENTE" as any, updated_by: user!.id,
      }).eq("id", caseId);
    },
    onSuccess: () => { toast.success("Guardado con observaciones pendientes"); invalidate(); },
    onError: () => toast.error("Error al guardar"),
  });

  const reopenCase = useMutation({
    mutationFn: async (rejectionId: string) => {
      await supabase.from("rejection_histories").update({
        reopened_by: user!.id, reopened_at: new Date().toISOString(),
      }).eq("id", rejectionId);
      await supabase.from("review_cases").update({
        status: "REABIERTO" as any, updated_by: user!.id,
      }).eq("id", caseId);
      await (supabase as any).from("audit_logs").insert({
        action: "REABRIR_TRAMITE", table_name: "review_cases", record_id: caseId, user_id: user!.id,
      });
    },
    onSuccess: () => { toast.success("Trámite reabierto"); invalidate(); },
    onError: () => toast.error("Error al reabrir"),
  });

  return {
    saveDetails, saveClassifications, saveDocumentation,
    addFinding, removeFinding, updateFindingStatus,
    startCorrection, approveCase, rejectCase, saveWithObservations, reopenCase,
  };
}
