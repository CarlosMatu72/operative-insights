import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
          glosador:profiles!review_cases_assigned_glosador_user_id_fkey(nombre)
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
      const { data } = await supabase
        .from("classification_feature_rules")
        .select("*");
      return data ?? [];
    },
  });
}

export function useObservationCatalog() {
  const categories = useQuery({
    queryKey: ["obs-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("observation_categories")
        .select("*")
        .eq("activo", true)
        .order("orden");
      return data ?? [];
    },
  });

  const subcategories = useQuery({
    queryKey: ["obs-subcategories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("observation_subcategories")
        .select("*")
        .eq("activo", true)
        .order("orden");
      return data ?? [];
    },
  });

  const errors = useQuery({
    queryKey: ["obs-errors"],
    queryFn: async () => {
      const { data } = await supabase
        .from("observation_errors")
        .select("*")
        .eq("activo", true)
        .order("descripcion");
      return data ?? [];
    },
  });

  return { categories, subcategories, errors };
}

export function useItemRanges() {
  return useQuery({
    queryKey: ["item-ranges-active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("item_ranges")
        .select("*")
        .eq("activo", true)
        .order("min_partidas");
      return data ?? [];
    },
  });
}

export function useCustomsKeys() {
  return useQuery({
    queryKey: ["customs-keys-active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("customs_keys")
        .select("*")
        .eq("activo", true)
        .order("clave");
      return data ?? [];
    },
  });
}

export function useReviewActions(caseId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["review-case-detail", caseId] });
    queryClient.invalidateQueries({ queryKey: ["review-case-details", caseId] });
    queryClient.invalidateQueries({ queryKey: ["review-classifications", caseId] });
    queryClient.invalidateQueries({ queryKey: ["review-documentation", caseId] });
    queryClient.invalidateQueries({ queryKey: ["review-findings", caseId] });
    queryClient.invalidateQueries({ queryKey: ["glosa-cases"] });
  };

  const saveDetails = useMutation({
    mutationFn: async (details: {
      branch_id?: string;
      client_id?: string;
      executive_id?: string;
      customs_key_id?: string;
      partidas?: number;
      item_range_id?: string;
      comments_generales?: string;
    }) => {
      // Check if details exist
      const { data: existing } = await supabase
        .from("review_case_details")
        .select("id")
        .eq("review_case_id", caseId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("review_case_details")
          .update(details)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("review_case_details")
          .insert({ review_case_id: caseId, ...details });
        if (error) throw error;
      }

      // Also update review_cases with branch/client/executive if provided
      const caseUpdate: any = { updated_by: user!.id };
      if (details.branch_id) caseUpdate.branch_id = details.branch_id;
      if (details.client_id) caseUpdate.client_id = details.client_id;
      if (details.executive_id) caseUpdate.executive_id = details.executive_id;
      await supabase.from("review_cases").update(caseUpdate).eq("id", caseId);
    },
    onSuccess: () => {
      toast.success("Datos guardados");
      invalidate();
    },
    onError: () => toast.error("Error al guardar datos"),
  });

  const saveClassifications = useMutation({
    mutationFn: async (classifications: { feature_id: string; value: boolean }[]) => {
      // Delete existing and re-insert
      await supabase
        .from("review_case_classifications")
        .delete()
        .eq("review_case_id", caseId);

      if (classifications.length > 0) {
        const { error } = await supabase
          .from("review_case_classifications")
          .insert(
            classifications.map((c) => ({
              review_case_id: caseId,
              classification_feature_id: c.feature_id,
              value_boolean: c.value,
            }))
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Clasificación guardada");
      invalidate();
    },
    onError: () => toast.error("Error al guardar clasificación"),
  });

  const saveDocumentation = useMutation({
    mutationFn: async (doc: { status: string; comment: string }) => {
      const { data: existing } = await supabase
        .from("review_case_documentation")
        .select("id")
        .eq("review_case_id", caseId)
        .maybeSingle();

      const payload = {
        documentation_status: doc.status,
        documentation_comment: doc.comment,
      };

      if (existing) {
        await supabase.from("review_case_documentation").update(payload).eq("id", existing.id);
      } else {
        await supabase.from("review_case_documentation").insert({ review_case_id: caseId, ...payload });
      }
    },
    onSuccess: () => {
      toast.success("Documentación guardada");
      invalidate();
    },
    onError: () => toast.error("Error al guardar documentación"),
  });

  const addFinding = useMutation({
    mutationFn: async (finding: {
      category_id: string;
      subcategory_id: string;
      observation_error_id: string;
      comentario_inicial: string;
    }) => {
      // Get current round
      const { data: rounds } = await supabase
        .from("review_rounds")
        .select("id")
        .eq("review_case_id", caseId)
        .order("round_number", { ascending: false })
        .limit(1);

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
    onSuccess: () => {
      toast.success("Observación registrada");
      invalidate();
    },
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
    onSuccess: () => {
      toast.success("Observación cerrada");
      invalidate();
    },
  });

  const approveCase = useMutation({
    mutationFn: async () => {
      // Close current round
      const { data: rounds } = await supabase
        .from("review_rounds")
        .select("id")
        .eq("review_case_id", caseId)
        .order("round_number", { ascending: false })
        .limit(1);

      if (rounds?.[0]) {
        await supabase
          .from("review_rounds")
          .update({ closed_at: new Date().toISOString(), result_status: "APPROVED" })
          .eq("id", rounds[0].id);
      }

      // Close active sessions
      await supabase
        .from("review_sessions")
        .update({ session_status: "completed", ended_at: new Date().toISOString() })
        .eq("review_case_id", caseId)
        .eq("session_status", "active");

      // Update case
      await supabase
        .from("review_cases")
        .update({
          status: "APROBADO" as any,
          approved_at: new Date().toISOString(),
          updated_by: user!.id,
        })
        .eq("id", caseId);
    },
    onSuccess: () => {
      toast.success("Trámite aprobado");
      invalidate();
    },
    onError: () => toast.error("Error al aprobar"),
  });

  const rejectCase = useMutation({
    mutationFn: async (motivo: string) => {
      const { data: rounds } = await supabase
        .from("review_rounds")
        .select("id")
        .eq("review_case_id", caseId)
        .order("round_number", { ascending: false })
        .limit(1);

      if (rounds?.[0]) {
        await supabase
          .from("review_rounds")
          .update({ closed_at: new Date().toISOString(), result_status: "REJECTED" })
          .eq("id", rounds[0].id);
      }

      await supabase.from("rejection_histories").insert({
        review_case_id: caseId,
        review_round_id: rounds?.[0]?.id ?? null,
        motivo,
        rejected_by: user!.id,
      });

      await supabase
        .from("review_sessions")
        .update({ session_status: "completed", ended_at: new Date().toISOString() })
        .eq("review_case_id", caseId)
        .eq("session_status", "active");

      await supabase
        .from("review_cases")
        .update({
          status: "RECHAZADO" as any,
          rejected_at: new Date().toISOString(),
          updated_by: user!.id,
        })
        .eq("id", caseId);
    },
    onSuccess: () => {
      toast.success("Trámite rechazado");
      invalidate();
    },
    onError: () => toast.error("Error al rechazar"),
  });

  const saveWithObservations = useMutation({
    mutationFn: async () => {
      const { data: rounds } = await supabase
        .from("review_rounds")
        .select("id")
        .eq("review_case_id", caseId)
        .order("round_number", { ascending: false })
        .limit(1);

      if (rounds?.[0]) {
        await supabase
          .from("review_rounds")
          .update({ closed_at: new Date().toISOString(), result_status: "WITH_OBSERVATIONS" })
          .eq("id", rounds[0].id);
      }

      await supabase
        .from("review_sessions")
        .update({ session_status: "completed", ended_at: new Date().toISOString() })
        .eq("review_case_id", caseId)
        .eq("session_status", "active");

      await supabase
        .from("review_cases")
        .update({
          status: "CORRECCION_PENDIENTE" as any,
          updated_by: user!.id,
        })
        .eq("id", caseId);
    },
    onSuccess: () => {
      toast.success("Guardado con observaciones pendientes");
      invalidate();
    },
    onError: () => toast.error("Error al guardar"),
  });

  return {
    saveDetails,
    saveClassifications,
    saveDocumentation,
    addFinding,
    removeFinding,
    approveCase,
    rejectCase,
    saveWithObservations,
  };
}
