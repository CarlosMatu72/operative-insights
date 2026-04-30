import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCatalogs } from "@/hooks/useCatalogs";
import {
  useReviewCase, useReviewDetails, useReviewClassifications,
  useReviewDocumentation, useReviewFindings, useClassificationFeatures,
  useClassificationRules, useObservationCatalog, useItemRanges,
  useCustomsKeys, useReviewActions, useReviewRounds, useReviewComments,
} from "@/hooks/useReviewDetail";
import { toast } from "sonner";

export type ReviewPanelState = ReturnType<typeof useReviewPanelState>;

export function useReviewPanelState(caseId: string, onClose: () => void) {
  const { isAdmin, user } = useAuth();
  const queryClient = useQueryClient();

  const reviewCaseQ = useReviewCase(caseId);
  const { data: reviewCase, isLoading } = reviewCaseQ;
  const { data: details } = useReviewDetails(caseId);
  const { data: classifications = [] } = useReviewClassifications(caseId);
  const { data: documentation } = useReviewDocumentation(caseId);
  const { data: findings = [] } = useReviewFindings(caseId);
  const { data: features = [] } = useClassificationFeatures();
  const { data: rules = [] } = useClassificationRules();
  const { categories, subcategories, errors: obsErrors } = useObservationCatalog();
  const { data: itemRanges = [] } = useItemRanges();
  const { data: customsKeys = [] } = useCustomsKeys();
  const { data: rounds = [] } = useReviewRounds(caseId);
  const { data: generalCommentsList = [] } = useReviewComments(caseId);
  const { branches, clients, executives } = useCatalogs();
  const actions = useReviewActions(caseId);

  // Form state
  const [branchId, setBranchId] = useState("");
  const [clientId, setClientId] = useState("");
  const [executiveId, setExecutiveId] = useState("");
  const [customsKeyId, setCustomsKeyId] = useState("");
  const [partidas, setPartidas] = useState("");
  const [comments, setComments] = useState("");
  const [classValues, setClassValues] = useState<Record<string, boolean>>({});
  const [docStatus, setDocStatus] = useState("COMPLETO");
  const [docComment, setDocComment] = useState("");

  // Observation form
  const [showObsForm, setShowObsForm] = useState(false);
  const [manuallyChanged, setManuallyChanged] = useState<Set<string>>(new Set());
  const [obsCategoryId, setObsCategoryId] = useState("");
  const [obsSubcategoryId, setObsSubcategoryId] = useState("");
  const [obsErrorId, setObsErrorId] = useState("");
  const [obsSearch, setObsSearch] = useState("");
  const [obsComment, setObsComment] = useState("");
  const [errorPopoverOpen, setErrorPopoverOpen] = useState(false);

  // Status update dialog
  const [statusUpdateFinding, setStatusUpdateFinding] = useState<string | null>(null);
  const [statusUpdateValue, setStatusUpdateValue] = useState("");
  const [statusUpdateComment, setStatusUpdateComment] = useState("");

  // Other dialogs
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectMotivo, setRejectMotivo] = useState("");
  const [generalComment, setGeneralComment] = useState("");
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentCategory, setCommentCategory] = useState("");
  const [commentSubcategory, setCommentSubcategory] = useState("");
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [newClientNombre, setNewClientNombre] = useState("");
  const [savingNewClient, setSavingNewClient] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");

  // Edit finding states
  const [editingFindingId, setEditingFindingId] = useState<string | null>(null);
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editSubcategoryId, setEditSubcategoryId] = useState("");
  const [editErrorId, setEditErrorId] = useState("");
  const [editErrorSearch, setEditErrorSearch] = useState("");
  const [editComment, setEditComment] = useState("");

  // Edit comment states
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");

  // Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Lote remesa
  const [loteInput, setLoteInput] = useState(reviewCase?.remesa_lote_descripcion ?? "");
  const [savingLote, setSavingLote] = useState(false);

  const status = reviewCase?.status ?? "";
  const isReadOnly = ["APROBADO", "RECHAZADO"].includes(status);
  const isCorrection = ["EN_CORRECCION"].includes(status);
  const needsCorrection = ["CORRECCION_PENDIENTE", "CONSULTA_PENDIENTE"].includes(status);
  const isReopened = status === "REABIERTO";
  const isActiveReview = ["EN_REVISION", "EN_CORRECCION", "DOCUMENTO_PENDIENTE"].includes(status);

  const pauseSession = useMutation({
    mutationFn: async () => {
      const { data: activeSessions } = await supabase
        .from("review_sessions")
        .select("id, started_at, paused_at, duration_seconds")
        .eq("review_case_id", caseId)
        .eq("session_status", "active");

      for (const s of activeSessions ?? []) {
        const resumedAt = s.paused_at ?? s.started_at;
        const newElapsed = Math.floor(
          (Date.now() - new Date(resumedAt).getTime()) / 1000
        );
        await supabase.from("review_sessions").update({
          session_status: "paused",
          paused_at: new Date().toISOString(),
          duration_seconds: (s.duration_seconds ?? 0) + newElapsed,
        }).eq("id", s.id);
      }
      await supabase.from("review_cases").update({
        status: "PAUSADO" as const,
        paused_at: new Date().toISOString(),
        updated_by: user!.id,
      }).eq("id", caseId);
    },
    onSuccess: () => {
      toast.success("Revisión pausada");
      queryClient.invalidateQueries({ queryKey: ["review-case-detail", caseId] });
      queryClient.invalidateQueries({ queryKey: ["glosa-cases"] });
    },
    onError: () => toast.error("Error al pausar"),
  });

  const { data: scoreDetail } = useQuery({
    queryKey: ["review-score-detail", caseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("review_scores")
        .select("*")
        .eq("review_case_id", caseId)
        .maybeSingle();
      return data;
    },
    enabled: status === "APROBADO",
  });

  // Init from case
  useEffect(() => {
    if (reviewCase) {
      setBranchId(reviewCase.branch_id ?? "");
      setClientId(reviewCase.client_id ?? "");
      setExecutiveId(reviewCase.executive_id ?? "");
    }
  }, [reviewCase]);

  useEffect(() => {
    if (details) {
      setCustomsKeyId(details.customs_key_id ?? "");
      setPartidas(details.partidas?.toString() ?? "");
      setComments(details.comments_generales ?? "");
    }
  }, [details]);

  useEffect(() => {
    if (documentation) {
      setDocStatus(documentation.documentation_status ?? "COMPLETO");
      setDocComment(documentation.documentation_comment ?? "");
    }
  }, [documentation]);

  useEffect(() => {
    if (features.length === 0) return;
    const vals: Record<string, boolean> = {};
    for (const f of features) {
      const existing = classifications.find((c) => c.classification_feature_id === f.id);
      if (existing) {
        vals[f.id] = existing.value_boolean;
      } else if (manuallyChanged.has(f.id)) {
        vals[f.id] = classValues[f.id] ?? false;
      } else {
        const ruleForBranch = rules.find(r => r.classification_feature_id === f.id && r.sucursal_id && r.sucursal_id === branchId && !r.cliente_id && !r.customs_key_id);
        const ruleForClient = rules.find(r => r.classification_feature_id === f.id && r.cliente_id && r.cliente_id === clientId && !r.sucursal_id && !r.customs_key_id);
        const ruleForKey = rules.find(r => r.classification_feature_id === f.id && r.customs_key_id && r.customs_key_id === customsKeyId && !r.sucursal_id && !r.cliente_id);
        const ruleDefault = rules.find(r => r.classification_feature_id === f.id && !r.sucursal_id && !r.cliente_id && !r.customs_key_id);
        const matchedRule = ruleForBranch ?? ruleForClient ?? ruleForKey ?? ruleDefault;
        vals[f.id] = matchedRule?.default_value ?? false;
      }
    }
    setClassValues(vals);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [features, classifications, rules, branchId, clientId, customsKeyId]);

  const detectedRange = useMemo(() => {
    const p = parseInt(partidas);
    if (isNaN(p)) return null;
    return itemRanges.find((r) => p >= r.min_partidas && p <= r.max_partidas) ?? null;
  }, [partidas, itemRanges]);

  const activeErrors = useMemo(
    () => (obsErrors.data ?? []).filter((e) => e.activo),
    [obsErrors.data]
  );

  useEffect(() => {
    if (reviewCase?.remesa_lote_descripcion) {
      setLoteInput(reviewCase.remesa_lote_descripcion);
    }
  }, [reviewCase?.remesa_lote_descripcion]);

  // Auto-save on unmount
  const formStateRef = useRef({
    branchId, clientId, executiveId, customsKeyId, partidas, comments, docStatus, docComment,
  });
  useEffect(() => {
    formStateRef.current = {
      branchId, clientId, executiveId, customsKeyId, partidas, comments, docStatus, docComment,
    };
  });
  useEffect(() => {
    return () => {
      const s = formStateRef.current;
      if (isActiveReview && (s.branchId || s.clientId || s.executiveId || s.partidas || s.comments)) {
        const p = parseInt(s.partidas);
        actions.saveDetails.mutate({
          branch_id: s.branchId || undefined,
          client_id: s.clientId || undefined,
          executive_id: s.executiveId || undefined,
          customs_key_id: s.customsKeyId || undefined,
          partidas: isNaN(p) ? undefined : p,
          comments_generales: s.comments || undefined,
        });
        if (s.docStatus) {
          actions.saveDocumentation.mutate({ status: s.docStatus, comment: s.docComment });
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live timer — uses Date.now() diff, immune to tab throttling
  useEffect(() => {
    if (!reviewCase?.last_started_at || !["EN_REVISION", "EN_CORRECCION"].includes(status)) {
      setElapsedSeconds(0);
      return;
    }
    let baseSeconds = 0;
    let sessionStartMs = 0;
    const getAccumulated = async () => {
      const { data: sessions } = await supabase
        .from("review_sessions")
        .select("duration_seconds, session_status, started_at, paused_at")
        .eq("review_case_id", caseId);
      const completed = (sessions ?? [])
        .filter(s => s.session_status !== "active")
        .reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0);
      const active = (sessions ?? []).find(s => s.session_status === "active");
      if (active) {
        const resumedAt = active.paused_at ?? active.started_at;
        const activeAlready = Math.floor(
          (Date.now() - new Date(resumedAt).getTime()) / 1000
        );
        baseSeconds = completed;
        sessionStartMs = Date.now() - activeAlready * 1000;
        setElapsedSeconds(completed + activeAlready);
      } else {
        baseSeconds = completed;
        sessionStartMs = 0;
        setElapsedSeconds(completed);
      }
    };
    getAccumulated();
    // Use Date.now() diff on each tick — immune to tab throttling
    const interval = setInterval(() => {
      if (sessionStartMs > 0) {
        const elapsed = Math.floor((Date.now() - sessionStartMs) / 1000);
        setElapsedSeconds(baseSeconds + elapsed);
      }
    }, 1000);
    // Recalculate on tab focus to correct any drift
    const onFocus = () => { getAccumulated(); };
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [caseId, status, reviewCase?.last_started_at]);

  const formatTimer = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const openFindings = findings.filter((f) => f.is_open);
  const partidasNum = parseInt(partidas);
  const hasRequiredFields = !!(
    branchId &&
    clientId &&
    executiveId &&
    customsKeyId &&
    !isNaN(partidasNum) && partidasNum > 0
  );
  const canApprove = openFindings.length === 0
    && docStatus === "COMPLETO"
    && status !== "DOCUMENTO_PENDIENTE"
    && hasRequiredFields;

  const previousFindings = isCorrection ? findings.filter(f => f.current_status !== "open") : [];
  const newFindings = isCorrection ? findings.filter(f => f.current_status === "open") : [];

  // Handlers
  const handleSaveAll = async () => {
    if (!branchId || !clientId || !executiveId) {
      toast.warning("Recuerda completar Sucursal, Cliente y Ejecutivo antes de aprobar");
    }
    const p = parseInt(partidas);
    await actions.saveDetails.mutateAsync({
      branch_id: branchId || undefined, client_id: clientId || undefined,
      executive_id: executiveId || undefined, customs_key_id: customsKeyId || undefined,
      partidas: isNaN(p) ? undefined : p, item_range_id: detectedRange?.id ?? undefined,
      comments_generales: comments || undefined,
    });
    await actions.saveClassifications.mutateAsync(
      features.map((f) => ({ feature_id: f.id, value: classValues[f.id] ?? false }))
    );
    await actions.saveDocumentation.mutateAsync({ status: docStatus, comment: docComment });
    if (openFindings.length > 0) {
      await actions.saveWithObservations.mutateAsync();
    } else if (docStatus === "PENDIENTE_SI_SE_PUEDE_GLOSAR" && openFindings.length === 0) {
      await actions.saveAsDocumentoPendiente.mutateAsync();
    } else {
      // No open findings, no pending doc — check if there are open comments
      const openComments = generalCommentsList.filter(c => !c.is_closed);
      if (openComments.length > 0) {
        // Has comments pending resolution — set CONSULTA_PENDIENTE
        await supabase.from("review_cases").update({
          status: "CONSULTA_PENDIENTE" as const,
          updated_by: user?.id,
        }).eq("id", caseId);
        queryClient.invalidateQueries({ queryKey: ["glosa-cases"] });
        queryClient.invalidateQueries({ queryKey: ["review-case", caseId] });
        queryClient.invalidateQueries({ queryKey: ["review-case-detail", caseId] });
      }
    }
  };

  const handleAddFinding = async () => {
    if (!obsCategoryId || !obsSubcategoryId) {
      toast.error("Selecciona categoría y subcategoría");
      return;
    }
    await actions.addFinding.mutateAsync({
      observation_error_id: obsErrorId || undefined,
      comentario_inicial: obsComment,
      category_id: obsCategoryId || undefined,
      subcategory_id: obsSubcategoryId || undefined,
    });
    setObsErrorId(""); setObsComment(""); setObsSearch("");
    toast.success("Observación agregada", { duration: 1500 });
  };

  const handleStartCorrection = async () => {
    await actions.startCorrection.mutateAsync();
  };

  const handleUpdateFindingStatus = async () => {
    if (!statusUpdateFinding || !statusUpdateValue) return;
    await actions.updateFindingStatus.mutateAsync({
      findingId: statusUpdateFinding, newStatus: statusUpdateValue, comment: statusUpdateComment,
    });
    setStatusUpdateFinding(null); setStatusUpdateValue(""); setStatusUpdateComment("");
  };

  const handleReopen = async (rejectionId: string) => {
    await actions.reopenCase.mutateAsync(rejectionId);
  };

  const handleAddComment = async () => {
    if (!generalComment.trim()) { toast.error("El comentario no puede estar vacío"); return; }
    try {
      const { error } = await supabase.from("review_comments").insert({
        review_case_id: caseId,
        comment_text: generalComment.trim(),
        category_id: commentCategory || null,
        subcategory_id: commentSubcategory || null,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
      toast.success("Comentario agregado");
      setGeneralComment(""); setShowCommentForm(false);
      setCommentCategory(""); setCommentSubcategory("");
      queryClient.invalidateQueries({ queryKey: ["review-comments", caseId] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al agregar comentario");
    }
  };

  return {
    // identifiers
    caseId, onClose,
    // auth
    isAdmin, user,
    // queries
    reviewCase, isLoading, details, classifications, documentation, findings,
    features, rules, categories, subcategories, obsErrors, itemRanges, customsKeys,
    rounds, generalCommentsList, branches, clients, executives, scoreDetail,
    // actions / queryClient
    actions: { ...actions, pauseSession }, queryClient,
    // form state
    branchId, setBranchId, clientId, setClientId, executiveId, setExecutiveId,
    customsKeyId, setCustomsKeyId, partidas, setPartidas, comments, setComments,
    classValues, setClassValues, manuallyChanged, setManuallyChanged,
    docStatus, setDocStatus, docComment, setDocComment,
    // observation form
    showObsForm, setShowObsForm,
    obsCategoryId, setObsCategoryId, obsSubcategoryId, setObsSubcategoryId,
    obsErrorId, setObsErrorId, obsSearch, setObsSearch, obsComment, setObsComment,
    errorPopoverOpen, setErrorPopoverOpen,
    // status update dialog
    statusUpdateFinding, setStatusUpdateFinding,
    statusUpdateValue, setStatusUpdateValue,
    statusUpdateComment, setStatusUpdateComment,
    // dialogs
    showRejectDialog, setShowRejectDialog, rejectMotivo, setRejectMotivo,
    generalComment, setGeneralComment, showCommentForm, setShowCommentForm,
    commentCategory, setCommentCategory, commentSubcategory, setCommentSubcategory,
    showScoreBreakdown, setShowScoreBreakdown,
    showNewClientDialog, setShowNewClientDialog,
    newClientNombre, setNewClientNombre, savingNewClient, setSavingNewClient,
    showDeleteDialog, setShowDeleteDialog, deleteReason, setDeleteReason,
    // edit
    editingFindingId, setEditingFindingId,
    editCategoryId, setEditCategoryId, editSubcategoryId, setEditSubcategoryId,
    editErrorId, setEditErrorId, editErrorSearch, setEditErrorSearch,
    editComment, setEditComment,
    editingCommentId, setEditingCommentId,
    editCommentText, setEditCommentText,
    // timer
    elapsedSeconds, formatTimer,
    // lote
    loteInput, setLoteInput, savingLote, setSavingLote,
    // computed
    status, isReadOnly, isCorrection, needsCorrection, isReopened, isActiveReview,
    detectedRange, activeErrors, openFindings, hasRequiredFields, canApprove,
    previousFindings, newFindings,
    // handlers
    handleSaveAll, handleAddFinding, handleStartCorrection,
    handleUpdateFindingStatus, handleReopen, handleAddComment,
  };
}
