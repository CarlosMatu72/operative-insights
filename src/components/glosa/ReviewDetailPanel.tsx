import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCatalogs } from "@/hooks/useCatalogs";
import {
  useReviewCase, useReviewDetails, useReviewClassifications,
  useReviewDocumentation, useReviewFindings, useClassificationFeatures,
  useClassificationRules, useObservationCatalog, useItemRanges,
  useCustomsKeys, useReviewActions, useReviewRounds, useReviewComments,
} from "@/hooks/useReviewDetail";
import { HistoryTabs } from "@/components/glosa/HistoryTabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Save, Copy, FileDown, CheckCircle, XCircle, Plus, X, RotateCcw, AlertTriangle, FileCheck, MessageSquare, Search } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const correctionStatuses = [
  { value: "CORRECTED", label: "Corregido", color: "text-success" },
  { value: "NOT_CORRECTED", label: "No corregido", color: "text-destructive" },
  { value: "PARTIALLY_CORRECTED", label: "Parcialmente", color: "text-warning" },
];

const findingStatusLabels: Record<string, { label: string; className: string }> = {
  open: { label: "Abierta", className: "bg-warning/10 text-warning border-warning/20" },
  closed: { label: "Cerrada", className: "bg-muted text-muted-foreground border-border" },
  CORRECTED: { label: "Corregido", className: "bg-success/10 text-success border-success/20" },
  NOT_CORRECTED: { label: "No corregido", className: "bg-destructive/10 text-destructive border-destructive/20" },
  PARTIALLY_CORRECTED: { label: "Parcialmente", className: "bg-warning/10 text-warning border-warning/20" },
};

interface Props {
  caseId: string;
  onClose: () => void;
}

function ScoreBadgeInline({ caseId }: { caseId: string }) {
  const { data: score } = useQuery({
    queryKey: ["review-score-badge", caseId],
    queryFn: async () => {
      const { data } = await supabase.from("review_scores").select("score_total").eq("review_case_id", caseId).maybeSingle();
      return data;
    },
  });
  if (!score?.score_total) return null;
  const val = Number(score.score_total);
  const color = val >= 85 ? "text-success bg-success/10 border-success/20" : val >= 70 ? "text-warning bg-warning/10 border-warning/20" : "text-destructive bg-destructive/10 border-destructive/20";
  return (
    <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-sm font-bold ${color}`}>
      {val}/100
    </span>
  );
}

const ReviewDetailPanel = ({ caseId, onClose }: Props) => {
  const { isAdmin, user } = useAuth();

  const { data: reviewCase, isLoading } = useReviewCase(caseId);
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
  const queryClient = useQueryClient();

  const [branchId, setBranchId] = useState("");
  const [clientId, setClientId] = useState("");
  const [executiveId, setExecutiveId] = useState("");
  const [customsKeyId, setCustomsKeyId] = useState("");
  const [partidas, setPartidas] = useState("");
  const [comments, setComments] = useState("");
  const [classValues, setClassValues] = useState<Record<string, boolean>>({});
  const [docStatus, setDocStatus] = useState("COMPLETO");
  const [docComment, setDocComment] = useState("");

  const [showObsForm, setShowObsForm] = useState(false);
  const [manuallyChanged, setManuallyChanged] = useState<Set<string>>(new Set());
  const [obsCategoryId, setObsCategoryId] = useState("");
  const [obsSubcategoryId, setObsSubcategoryId] = useState("");
  const [obsErrorId, setObsErrorId] = useState("");
  const [obsSearch, setObsSearch] = useState("");
  const [obsComment, setObsComment] = useState("");

  const [statusUpdateFinding, setStatusUpdateFinding] = useState<string | null>(null);
  const [statusUpdateValue, setStatusUpdateValue] = useState("");
  const [statusUpdateComment, setStatusUpdateComment] = useState("");

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

  const status = reviewCase?.status ?? "";
  const isReadOnly = ["APROBADO", "RECHAZADO"].includes(status);
  const isCorrection = ["EN_CORRECCION"].includes(status);
  const needsCorrection = status === "CORRECCION_PENDIENTE";
  const isReopened = status === "REABIERTO";
  const isActiveReview = ["EN_REVISION", "EN_CORRECCION", "DOCUMENTO_PENDIENTE"].includes(status);

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

  const [loteInput, setLoteInput] = useState(reviewCase?.remesa_lote_descripcion ?? "");
  const [savingLote, setSavingLote] = useState(false);

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

  // Auto-save general info when component unmounts during active review
  useEffect(() => {
    return () => {
      if (isActiveReview && (branchId || clientId || executiveId || partidas || comments)) {
        const p = parseInt(partidas);
        actions.saveDetails.mutate({
          branch_id: branchId || undefined,
          client_id: clientId || undefined,
          executive_id: executiveId || undefined,
          customs_key_id: customsKeyId || undefined,
          partidas: isNaN(p) ? undefined : p,
          item_range_id: detectedRange?.id ?? undefined,
          comments_generales: comments || undefined,
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openFindings = findings.filter((f) => f.is_open);
  const hasRequiredFields = !!(branchId && clientId && executiveId);
  const canApprove = openFindings.length === 0
    && docStatus !== "PENDIENTE_NO_SE_PUEDE_GLOSAR"
    && status !== "DOCUMENTO_PENDIENTE"
    && hasRequiredFields;

  const handleSaveAll = async () => {
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
    setObsCategoryId(""); setObsSubcategoryId("");
    setObsErrorId(""); setObsComment(""); setObsSearch("");
    setShowObsForm(false);
    toast.success("Observación agregada");
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

  const handleCopyText = () => {
    if (!reviewCase) { toast.error("No hay datos para copiar"); return; }
    const dsl: Record<string, string> = {
      COMPLETO: "✓ Completo",
      PENDIENTE_SI_SE_PUEDE_GLOSAR: "⚠ Pendiente — se puede glosar",
      PENDIENTE_NO_SE_PUEDE_GLOSAR: "✗ Pendiente — NO se puede glosar",
    };
    let t = "";
    // ── INFORMACIÓN GENERAL ──
    t += "┌─ INFORMACIÓN GENERAL ─────────────────────────────┐\n";
    t += `│ Referencia:      ${reviewCase.reference || reviewCase.internal_folio}\n`;
    t += `│ Cliente:         ${reviewCase.clients?.nombre || "—"}\n`;
    t += `│ Ejecutivo:       ${reviewCase.executives?.nombre || "—"}\n`;
    t += `│ Glosador:        ${reviewCase.glosador?.nombre || "Sin asignar"}\n`;
    t += "└──────────────────────────────────────────────────────┘\n\n";
    // ── DOCUMENTACIÓN (only if not COMPLETO or has comment) ──
    if (documentation && (documentation.documentation_status !== "COMPLETO" || documentation.documentation_comment)) {
      t += "┌─ DOCUMENTACIÓN ────────────────────────────────────┐\n";
      t += `│ Estado: ${dsl[documentation.documentation_status ?? ""] || documentation.documentation_status}\n`;
      if (documentation.documentation_comment) {
        t += `│ Comentario: ${documentation.documentation_comment}\n`;
      }
      t += "└──────────────────────────────────────────────────────┘\n\n";
    }
    // ── OBSERVACIONES grouped by category ──
    t += ">> Observaciones <<\n";
    const copyFindings = findings.filter(f => f.current_status !== "CORRECTED");
    if (copyFindings.length === 0) {
      t += "  Sin observaciones pendientes.\n";
    } else {
      const byCategory: Record<string, typeof findings> = {};
      const catOrder: string[] = [];
      for (const f of copyFindings) {
        const catName = f.observation_categories?.nombre || "Sin categoría";
        if (!byCategory[catName]) {
          byCategory[catName] = [];
          catOrder.push(catName);
        }
        byCategory[catName].push(f);
      }
      let counter = 1;
      for (const catName of catOrder) {
        t += `\n  Categoría = ${catName}\n`;
        for (const f of byCategory[catName]) {
          const sub = f.observation_subcategories?.nombre || "";
          const comentario = f.comentario_inicial ? ` — ${f.comentario_inicial}` : "";
          t += `${counter}.\t ${sub ? sub + " --> " : ""}${comentario}\n`;
          counter++;
        }
      }
    }
    // ── COMENTARIOS GENERALES (only open ones, no author) ──
    const openComments = generalCommentsList.filter(c => !c.is_closed);
    if (openComments.length > 0) {
      t += "\n     >>Comentarios<<\n";
      openComments.forEach((c, i) => {
        t += `        ${i + 1}. ${c.comment_text}\n`;
      });
    }
    navigator.clipboard
      .writeText(t)
      .then(() => toast.success("Texto copiado al portapapeles"))
      .catch(() => toast.error("Error al copiar"));
  };

  const handleGeneratePDF = () => {
    const ref = reviewCase?.reference ?? reviewCase?.internal_folio ?? "";
    const tipo = reviewCase?.document_types?.name ?? "";
    const suc = reviewCase?.branches?.nombre ?? "";
    const ejec = reviewCase?.executives?.nombre ?? "";
    const cli = reviewCase?.clients?.nombre ?? "";

    let html = `<html><head><title>Revisión ${ref}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:40px;font-size:13px;color:#1a1a1a}
      h1{font-size:18px;border-bottom:2px solid #0077F9;padding-bottom:8px;color:#111126}
      h2{font-size:14px;margin-top:24px;color:#111126}
      table{width:100%;border-collapse:collapse;margin:8px 0}
      td,th{border:1px solid #E2E2E2;padding:6px 10px;text-align:left}
      th{background:#f5f5f5;font-weight:600;color:#2D2D2D}
      .obs-item{margin:6px 0;padding:8px;background:#f8f9fa;border-left:3px solid #F59E0B}
      .corrected{border-left-color:#16a34a} .not-corrected{border-left-color:#dc2626}
    </style></head><body>`;
    html += `<h1>Revisión de Glosa — ${ref}</h1>`;
    html += `<h2>Datos Generales</h2>`;
    html += `<table><tr><th>Referencia</th><td>${ref}</td><th>Tipo</th><td>${tipo}</td></tr>`;
    html += `<tr><th>Sucursal</th><td>${suc}</td><th>Ejecutivo</th><td>${ejec}</td></tr>`;
    html += `<tr><th>Cliente</th><td>${cli}</td><th>Partidas</th><td>${partidas || "—"}</td></tr></table>`;
    html += `<h2>Clasificación</h2><table><tr><th>Característica</th><th>Valor</th></tr>`;
    for (const f of features) {
      html += `<tr><td>${f.nombre}</td><td>${classValues[f.id] ? "Sí" : "No"}</td></tr>`;
    }
    html += `</table>`;
    html += `<h2>Documentación</h2><p><strong>Estado:</strong> ${docStatus}</p>`;
    if (docComment) html += `<p><strong>Comentario:</strong> ${docComment}</p>`;
    html += `<h2>Observaciones (${findings.length})</h2>`;
    for (const f of findings) {
      const cat = f.observation_categories?.nombre ?? "";
      const sub = f.observation_subcategories?.nombre ?? "";
      const err = f.observation_errors?.descripcion ?? "";
      const cls = f.current_status === "CORRECTED" ? "corrected" : f.current_status === "NOT_CORRECTED" ? "not-corrected" : "";
      html += `<div class="obs-item ${cls}"><strong>${cat} &gt; ${sub}</strong> — <em>${f.current_status}</em><br/>${err}`;
      if (f.comentario_inicial) html += `<br/><small>${f.comentario_inicial}</small>`;
      html += `</div>`;
    }
    html += `<h2>Revisiones (${rounds.length})</h2><table><tr><th>#</th><th>Tipo</th><th>Resultado</th></tr>`;
    for (const r of rounds) {
      html += `<tr><td>${r.round_number}</td><td>${r.round_type ?? "—"}</td><td>${r.result_status ?? "En curso"}</td></tr>`;
    }
    html += `</table>`;
    if (generalCommentsList.length > 0) {
      html += `<h2>Comentarios Generales (${generalCommentsList.length})</h2>`;
      html += `<table><tr><th>Usuario</th><th>Fecha</th><th>Comentario</th></tr>`;
      for (const c of generalCommentsList) {
        const autor = (c as unknown as { profiles?: { nombre?: string } }).profiles?.nombre || "Usuario";
        const fecha = new Date(c.created_at).toLocaleDateString("es-MX");
        html += `<tr><td>${autor}</td><td>${fecha}</td><td>${c.comment_text}</td></tr>`;
      }
      html += `</table>`;
    }
    html += `</body></html>`;

    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!reviewCase) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
        <AlertTriangle className="h-10 w-10 opacity-30" />
        <p className="text-sm font-medium">Trámite no encontrado</p>
        <Button variant="outline" size="sm" onClick={onClose} className="mt-2">Cerrar</Button>
      </div>
    );
  }

  const previousFindings = isCorrection ? findings.filter(f => f.current_status !== "open") : [];
  const newFindings = isCorrection ? findings.filter(f => f.current_status === "open") : [];

  return (
    <div className="space-y-5 p-6 pb-28">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-foreground tracking-tight truncate">
              {reviewCase.reference ?? reviewCase.internal_folio}
            </h1>
             <StatusBadge status={status} />
             {status === "APROBADO" && reviewCase && (
               <ScoreBadgeInline caseId={caseId} />
             )}
             {status === "APROBADO" && (
               <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground gap-1"
                 onClick={() => setShowScoreBreakdown(true)}>
                 Ver cálculo
               </Button>
             )}
          </div>
          <p className="text-sm text-muted-foreground">
            {reviewCase.document_types?.name} — Folio: {reviewCase.internal_folio}
            {rounds.length > 0 && ` — Ronda ${rounds.length}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button variant="ghost" size="sm" onClick={handleCopyText} className="h-8 gap-1.5 text-xs">
            <Copy className="h-3.5 w-3.5" /> Copiar
          </Button>
          <Button variant="ghost" size="sm" onClick={handleGeneratePDF} className="h-8 gap-1.5 text-xs">
            <FileDown className="h-3.5 w-3.5" /> PDF
          </Button>
        </div>
      </div>

      {/* Correction banner */}
      {needsCorrection && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-warning/30 bg-warning/[0.08] px-4 py-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Observaciones pendientes de corrección</p>
              <p className="text-xs text-muted-foreground">Inicia la revisión de corrección para evaluar los errores</p>
            </div>
          </div>
          <Button onClick={handleStartCorrection} disabled={actions.startCorrection.isPending} className="gap-1.5 shrink-0">
            <RotateCcw className="h-4 w-4" /> Iniciar revisión de correcciones →
          </Button>
        </div>
      )}

      {isReopened && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-accent bg-accent/30 px-4 py-3">
          <div className="flex items-center gap-3">
            <RotateCcw className="h-5 w-5 text-accent-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Trámite reabierto</p>
              <p className="text-xs text-muted-foreground">Puedes iniciar una nueva revisión de corrección</p>
            </div>
          </div>
          <Button onClick={handleStartCorrection} disabled={actions.startCorrection.isPending} className="gap-1.5 shrink-0">
            <RotateCcw className="h-4 w-4" /> Iniciar Corrección
          </Button>
        </div>
      )}

      {/* General Info */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold tracking-tight">Información General</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Referencia</Label>
              <Input value={reviewCase.reference ?? ""} disabled className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Sucursal</Label>
              <Select value={branchId} onValueChange={setBranchId} disabled={isReadOnly}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{(branches.data ?? []).map((b) => <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Ejecutivo</Label>
              <Select value={executiveId} onValueChange={setExecutiveId} disabled={isReadOnly}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{(executives.data ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Muestra todos los ejecutivos activos</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Cliente</Label>
              <Select value={clientId} onValueChange={setClientId} disabled={isReadOnly}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{(clients.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}</SelectContent>
              </Select>
              {!isReadOnly && (
                <button
                  type="button"
                  className="text-xs text-primary underline underline-offset-2 hover:no-underline mt-0.5 text-left"
                  onClick={() => setShowNewClientDialog(true)}
                >
                  + Registrar nuevo cliente
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Clave Aduanera</Label>
              <Select value={customsKeyId} onValueChange={setCustomsKeyId} disabled={isReadOnly}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{customsKeys.map((k) => <SelectItem key={k.id} value={k.id}>{k.clave} — {k.descripcion}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Partidas</Label>
              <div className="flex gap-2">
                <Input type="number" value={partidas} onChange={(e) => setPartidas(e.target.value)} disabled={isReadOnly} className="h-9 text-sm flex-1" placeholder="0" />
                {detectedRange && <Badge variant="outline" className="text-[10px] whitespace-nowrap self-center">{detectedRange.nombre_rango}</Badge>}
              </div>
            </div>
          </div>
          {!isReadOnly && (
            <div className="mt-4 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Comentarios generales</Label>
              <Textarea value={comments} onChange={(e) => setComments(e.target.value)} className="text-sm" rows={2} placeholder="Comentarios sobre el trámite..." />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lote de Remesas (REMESA type only) */}
      {reviewCase?.document_types?.code === "REMESA" && reviewCase?.remesa_lote_descripcion && !isReadOnly && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold tracking-tight">Lote de Remesas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs text-muted-foreground">Números de remesas en este lote</Label>
                <Input
                  value={loteInput}
                  onChange={e => setLoteInput(e.target.value)}
                  placeholder="Ej: 1-10, 13, 25-27"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Actual: <span className="font-mono">{reviewCase.remesa_lote_descripcion}</span>
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-9"
                disabled={!loteInput.trim() || savingLote}
                onClick={async () => {
                  setSavingLote(true);
                  try {
                    await supabase.from("review_cases").update({
                      remesa_lote_descripcion: loteInput.trim(),
                      updated_by: user?.id,
                    }).eq("id", caseId);
                    toast.success("Lote actualizado");
                    queryClient.invalidateQueries({ queryKey: ["review-case-detail", caseId] });
                  } catch {
                    toast.error("Error al actualizar lote");
                  } finally { setSavingLote(false); }
                }}
              >
                {savingLote ? "..." : "Actualizar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold tracking-tight">Clasificación</CardTitle></CardHeader>
          <CardContent>
            {features.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay características configuradas</p>
            ) : (
              <div className="space-y-2.5">
                {features.map((f) => (
                  <div key={f.id} className="flex items-center gap-2.5">
                    <Checkbox id={`cl-${f.id}`} checked={classValues[f.id] ?? false}
                      onCheckedChange={(v) => {
                        setManuallyChanged(prev => new Set(prev).add(f.id));
                        setClassValues((p) => ({ ...p, [f.id]: !!v }));
                      }}
                      disabled={isReadOnly} />
                    <label htmlFor={`cl-${f.id}`} className="text-sm cursor-pointer select-none flex-1">{f.nombre}</label>
                    {f.descripcion && <span className="text-[10px] text-muted-foreground shrink-0">({f.descripcion})</span>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold tracking-tight flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-muted-foreground" /> Documentación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={docStatus} onValueChange={setDocStatus} disabled={isReadOnly}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="COMPLETO">Completo</SelectItem>
                <SelectItem value="PENDIENTE_SI_SE_PUEDE_GLOSAR">Pendiente — se puede glosar</SelectItem>
                <SelectItem value="PENDIENTE_NO_SE_PUEDE_GLOSAR">Pendiente — NO se puede glosar</SelectItem>
              </SelectContent>
            </Select>
            {docStatus !== "COMPLETO" && (
              <Textarea placeholder="Comentario sobre documentación..." value={docComment}
                onChange={(e) => setDocComment(e.target.value)} disabled={isReadOnly} className="text-sm" rows={2} />
            )}
            {docStatus === "PENDIENTE_NO_SE_PUEDE_GLOSAR" && !docComment && (
              <p className="text-xs text-destructive flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3" /> Comentario obligatorio para este estado
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Observations */}
      <Card id="obs-section">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold tracking-tight">
            Observaciones
            {openFindings.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-[10px]">{openFindings.length} abiertas</Badge>
            )}
            {findings.length > 0 && openFindings.length === 0 && (
              <Badge variant="secondary" className="ml-2 text-[10px]">{findings.length} total</Badge>
            )}
          </CardTitle>
          {isActiveReview && !needsCorrection && (
            <Button size="sm" variant={showObsForm ? "secondary" : "outline"} className="h-7 text-xs gap-1"
              onClick={() => setShowObsForm(!showObsForm)}>
              {showObsForm ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
              {showObsForm ? "Cerrar" : "Agregar"}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {showObsForm && (
            <div className="rounded-lg border border-primary/20 bg-primary/[0.02] p-4 space-y-3">
              {/* Step 1: Category */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Categoría *</Label>
                <Select value={obsCategoryId} onValueChange={(v) => {
                  setObsCategoryId(v);
                  setObsSubcategoryId("");
                  setObsErrorId("");
                  setObsSearch("");
                }}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar categoría..." /></SelectTrigger>
                  <SelectContent>
                    {(categories.data ?? []).map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Step 2: Subcategory */}
              {obsCategoryId && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Subcategoría *</Label>
                  <Select value={obsSubcategoryId} onValueChange={(v) => {
                    setObsSubcategoryId(v);
                    setObsErrorId("");
                    setObsSearch("");
                  }}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar subcategoría..." /></SelectTrigger>
                    <SelectContent>
                      {(subcategories.data ?? [])
                        .filter(s => s.category_id === obsCategoryId)
                        .map(sub => (
                          <SelectItem key={sub.id} value={sub.id}>{sub.nombre}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {/* Step 3: Error (optional) */}
              {obsSubcategoryId && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Error específico <span className="text-muted-foreground">(opcional)</span></Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input value={obsSearch} onChange={(e) => { setObsSearch(e.target.value); setObsErrorId(""); }}
                      placeholder="Buscar error o dejar vacío..." className="h-9 text-sm pl-9" />
                  </div>
                  {obsSearch.length > 1 && (
                    <div className="rounded-md border bg-card shadow-sm max-h-40 overflow-y-auto divide-y">
                      {activeErrors.filter(e =>
                        e.descripcion.toLowerCase().includes(obsSearch.toLowerCase()) ||
                        (e.codigo_error && e.codigo_error.toLowerCase().includes(obsSearch.toLowerCase()))
                      ).slice(0, 8).map(error => (
                        <button key={error.id} type="button"
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors ${obsErrorId === error.id ? "bg-primary/5 text-primary" : ""}`}
                          onClick={() => { setObsErrorId(error.id); setObsSearch(error.descripcion); }}>
                          {error.codigo_error && <span className="text-xs text-muted-foreground mr-1.5">[{error.codigo_error}]</span>}
                          {error.descripcion}
                          {error.descuento_puntos && <span className="ml-2 text-xs text-destructive">−{error.descuento_puntos} pts</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {obsErrorId && (
                    <div className="flex items-center gap-2 rounded-md bg-primary/5 border border-primary/20 px-3 py-1.5">
                      <span className="text-xs text-primary font-medium flex-1 truncate">{obsSearch}</span>
                      <button type="button" onClick={() => { setObsErrorId(""); setObsSearch(""); }}>
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  )}
                </div>
              )}
              {/* Comment */}
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Comentario</Label>
                  <Input value={obsComment} onChange={(e) => setObsComment(e.target.value)}
                    placeholder="Comentario de la observación..." className="h-8 text-xs mt-1" />
                </div>
                <Button variant="outline" size="sm" className="h-8 text-xs"
                  onClick={() => { setShowObsForm(false); setObsCategoryId(""); setObsSubcategoryId(""); setObsErrorId(""); setObsSearch(""); setObsComment(""); }}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleAddFinding}
                  disabled={actions.addFinding.isPending || !obsCategoryId || !obsSubcategoryId}
                  className="h-8 text-xs gap-1 shrink-0">
                  <Plus className="h-3 w-3" /> Agregar
                </Button>
              </div>
            </div>
          )}

          {/* Previous findings (correction mode) */}
          {isCorrection && previousFindings.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Errores de rondas anteriores</p>
              {previousFindings.map((f) => {
                const st = findingStatusLabels[f.current_status] ?? findingStatusLabels.open;
                return (
                  <div key={f.id} className={`rounded-lg border p-3 text-sm space-y-1 ${
                    f.current_status === "CORRECTED" ? "border-success/20 bg-success/[0.03]" :
                    f.current_status === "NOT_CORRECTED" ? "border-destructive/20 bg-destructive/[0.03]" :
                    "border-warning/20 bg-warning/[0.03]"
                  }`}>
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <p className="font-semibold text-sm leading-tight">{f.observation_categories?.nombre || "—"}</p>
                        {f.observation_subcategories?.nombre && (
                          <p className="text-sm text-foreground/80 leading-tight">{f.observation_subcategories.nombre}</p>
                        )}
                        {f.comentario_inicial && (
                          <p className="text-sm text-muted-foreground italic leading-snug">{f.comentario_inicial}</p>
                        )}
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                          {f.observation_errors?.descripcion && (
                            <span className="text-[11px] text-muted-foreground">
                              {f.observation_errors.codigo_error ? `[${f.observation_errors.codigo_error}] ` : ""}{f.observation_errors.descripcion}
                            </span>
                          )}
                          {f.observation_errors?.descuento_puntos && (
                            <span className="text-[10px] font-medium text-destructive bg-destructive/5 px-1.5 py-0.5 rounded">−{f.observation_errors.descuento_puntos} pts</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${st.className}`}>{st.label}</span>
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2"
                          onClick={() => { setStatusUpdateFinding(f.id); setStatusUpdateValue(""); setStatusUpdateComment(""); }}>
                          Evaluar
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {isCorrection && newFindings.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-primary uppercase tracking-wider">Nuevos errores (esta ronda)</p>
            </div>
          )}

          {(isCorrection ? newFindings : findings).length === 0 && !isCorrection ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <FileCheck className="h-8 w-8 opacity-20 mb-2" />
              <p className="text-sm">Sin observaciones registradas</p>
              {isActiveReview && <p className="text-xs mt-1">Usa el botón "Agregar" para capturar observaciones</p>}
            </div>
          ) : (
            <div className="space-y-2">
              {(isCorrection ? newFindings : findings).map((f) => {
                const st = findingStatusLabels[f.current_status] ?? findingStatusLabels.open;
                return (
                  <div key={f.id} className={`rounded-lg border p-3 text-sm space-y-1 ${
                    f.is_open ? "border-warning/30 bg-warning/[0.03]" :
                    f.current_status === "CORRECTED" ? "border-success/20 bg-success/[0.03]" :
                    f.current_status === "NOT_CORRECTED" ? "border-destructive/20 bg-destructive/[0.03]" :
                    "border-muted bg-muted/5"
                  }`}>
                    {editingFindingId === f.id ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">Categoría</Label>
                            <Select value={editCategoryId} onValueChange={v => { setEditCategoryId(v); setEditSubcategoryId(""); setEditErrorId(""); setEditErrorSearch(""); }}>
                              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {(categories.data ?? []).map(cat => (
                                  <SelectItem key={cat.id} value={cat.id}>{cat.nombre}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {editCategoryId && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Subcategoría</Label>
                              <Select value={editSubcategoryId} onValueChange={v => { setEditSubcategoryId(v); setEditErrorId(""); setEditErrorSearch(""); }}>
                                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {(subcategories.data ?? []).filter(s => s.category_id === editCategoryId).map(sub => (
                                    <SelectItem key={sub.id} value={sub.id}>{sub.nombre}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                        {editSubcategoryId && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Error (opcional)</Label>
                            <Input value={editErrorSearch}
                              onChange={e => { setEditErrorSearch(e.target.value); setEditErrorId(""); }}
                              placeholder="Buscar error..." className="h-8 text-xs mt-1" />
                            {editErrorSearch.length > 1 && (
                              <div className="rounded border bg-card mt-1 max-h-32 overflow-y-auto divide-y">
                                {activeErrors.filter(e => e.descripcion.toLowerCase().includes(editErrorSearch.toLowerCase())).slice(0, 6).map(err => (
                                  <button key={err.id} type="button"
                                    className={`w-full text-left px-2 py-1.5 text-xs hover:bg-muted/50 ${editErrorId === err.id ? "bg-primary/5" : ""}`}
                                    onClick={() => { setEditErrorId(err.id); setEditErrorSearch(err.descripcion); }}>
                                    {err.descripcion} {err.descuento_puntos ? <span className="text-destructive">−{err.descuento_puntos}pts</span> : null}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        <Input value={editComment} onChange={e => setEditComment(e.target.value)}
                          placeholder="Comentario..." className="h-8 text-xs" />
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            onClick={() => setEditingFindingId(null)}>Cancelar</Button>
                          <Button size="sm" className="h-7 text-xs"
                            disabled={!editCategoryId || !editSubcategoryId || actions.editFinding.isPending}
                            onClick={async () => {
                              await actions.editFinding.mutateAsync({
                                findingId: f.id, category_id: editCategoryId,
                                subcategory_id: editSubcategoryId,
                                observation_error_id: editErrorId || null,
                                comentario_inicial: editComment,
                              });
                              setEditingFindingId(null);
                            }}>Guardar</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <p className="font-semibold text-sm leading-tight">{f.observation_categories?.nombre || "—"}</p>
                          {f.observation_subcategories?.nombre && (
                            <p className="text-sm text-foreground/80 leading-tight">{f.observation_subcategories.nombre}</p>
                          )}
                          {f.comentario_inicial && (
                            <p className="text-sm text-muted-foreground italic leading-snug">{f.comentario_inicial}</p>
                          )}
                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            {f.observation_errors?.descripcion && (
                              <span className="text-[11px] text-muted-foreground">
                                {f.observation_errors.codigo_error ? `[${f.observation_errors.codigo_error}] ` : ""}{f.observation_errors.descripcion}
                              </span>
                            )}
                            {f.observation_errors?.descuento_puntos && (
                              <span className="text-[10px] font-medium text-destructive bg-destructive/5 px-1.5 py-0.5 rounded">−{f.observation_errors.descuento_puntos} pts</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${st.className}`}>{st.label}</span>
                          <div className="flex gap-1">
                            {isCorrection && f.current_status !== "closed" && (
                              <Button size="sm" variant="outline" className="h-6 text-[10px] px-2"
                                onClick={() => { setStatusUpdateFinding(f.id); setStatusUpdateValue(""); setStatusUpdateComment(""); }}>Evaluar</Button>
                            )}
                            {!isReadOnly && f.is_open && (
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0"
                                title="Duplicar observación"
                                onClick={() => actions.duplicateFinding.mutate(f.id)}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                              </Button>
                            )}
                            {!isReadOnly && f.is_open && (
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" title="Editar"
                                onClick={() => {
                                  setEditingFindingId(f.id);
                                  setEditCategoryId(f.category_id ?? "");
                                  setEditSubcategoryId(f.subcategory_id ?? "");
                                  setEditErrorId(f.observation_error_id ?? "");
                                  setEditErrorSearch(f.observation_errors?.descripcion ?? "");
                                  setEditComment(f.comentario_inicial ?? "");
                                }}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              </Button>
                            )}
                            {!isCorrection && f.is_open && !isReadOnly && (
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive/60 hover:text-destructive"
                                title="Eliminar observación"
                                onClick={async () => {
                                  await supabase.from("review_findings").delete().eq("id", f.id);
                                  queryClient.invalidateQueries({ queryKey: ["review-findings", caseId] });
                                  toast.success("Observación eliminada");
                                }}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* General Comments */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold tracking-tight flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            Comentarios Generales
            {generalCommentsList.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px]">{generalCommentsList.length}</Badge>
            )}
          </CardTitle>
          {isActiveReview && !showCommentForm && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowCommentForm(true)}>
              <Plus className="h-3 w-3" /> Agregar
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Comentarios informativos que no afectan la calificación</p>

          {showCommentForm && (
            <div className="rounded-lg border border-info/30 bg-info/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-info">
                  Comentario general — no afecta calificación
                </span>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0"
                  onClick={() => { setShowCommentForm(false); setCommentCategory(""); setCommentSubcategory(""); setGeneralComment(""); }}>
                  <X className="h-3 w-3" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Categoría</Label>
                  <Select value={commentCategory} onValueChange={v => { setCommentCategory(v); setCommentSubcategory(""); }}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      {(categories.data ?? []).map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {commentCategory && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Subcategoría</Label>
                    <Select value={commentSubcategory} onValueChange={setCommentSubcategory}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        {(subcategories.data ?? []).filter(s => s.category_id === commentCategory).map(sub => (
                          <SelectItem key={sub.id} value={sub.id}>{sub.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <Textarea
                value={generalComment}
                onChange={e => setGeneralComment(e.target.value)}
                placeholder="Escribe el comentario general..."
                rows={2}
                className="text-sm"
              />
              <div className="flex justify-end">
                <Button size="sm" onClick={handleAddComment}
                  disabled={!generalComment.trim()} className="gap-1 text-xs">
                  <Plus className="h-3 w-3" /> Agregar
                </Button>
              </div>
            </div>
          )}

          {generalCommentsList.length === 0 && !showCommentForm ? (
            <p className="text-xs text-muted-foreground text-center py-4">Sin comentarios generales</p>
          ) : (
            <div className="space-y-2">
              {generalCommentsList.map((c) => (
                <div key={c.id} className={`rounded-lg border p-3 space-y-1.5 ${
                  c.is_closed ? "border-muted bg-muted/5 opacity-60" : "border-info/30 bg-info/5"
                }`}>
                  {editingCommentId === c.id ? (
                    <div className="space-y-2">
                      <Textarea value={editCommentText} onChange={e => setEditCommentText(e.target.value)}
                        rows={2} className="text-sm" />
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" className="h-7 text-xs"
                          onClick={() => setEditingCommentId(null)}>Cancelar</Button>
                        <Button size="sm" className="h-7 text-xs"
                          disabled={!editCommentText.trim()}
                          onClick={async () => {
                            try {
                              await supabase.from("review_comments")
                                .update({ comment_text: editCommentText.trim() })
                                .eq("id", c.id);
                              toast.success("Comentario actualizado");
                              setEditingCommentId(null);
                              queryClient.invalidateQueries({ queryKey: ["review-comments", caseId] });
                            } catch { toast.error("Error al actualizar"); }
                          }}>Guardar</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0 space-y-0.5">
                        {c.observation_categories?.nombre ? (
                          <p className="font-semibold text-sm leading-tight">
                            {c.observation_categories.nombre}
                          </p>
                        ) : null}
                        {c.observation_subcategories?.nombre && (
                          <p className="text-sm text-foreground/80 leading-tight">
                            {c.observation_subcategories.nombre}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground leading-snug whitespace-pre-wrap">
                          {c.comment_text}
                        </p>
                        <span className="inline-flex items-center text-[10px] text-info bg-info/5 px-1.5 py-0.5 rounded border border-info/20">
                          no afecta calificación
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {c.is_closed && (
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            Cerrado
                          </span>
                        )}
                        {isActiveReview && !c.is_closed && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] px-1.5 text-warning"
                              title="Mover a observaciones"
                              onClick={async () => {
                                setObsCategoryId(c.category_id ?? "");
                                setObsSubcategoryId(c.subcategory_id ?? "");
                                setObsComment(c.comment_text);
                                setObsErrorId("");
                                setObsSearch("");
                                setShowObsForm(true);
                                try {
                                  await supabase.from("review_comments").delete().eq("id", c.id);
                                  queryClient.invalidateQueries({ queryKey: ["review-comments", caseId] });
                                  toast.success("Comentario movido a observaciones");
                                } catch { /* silent */ }
                                document.getElementById("obs-section")?.scrollIntoView({ behavior: "smooth" });
                              }}>↑ Obs</Button>
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] px-1.5"
                              title="Duplicar comentario"
                              onClick={() => actions.duplicateComment.mutate(c.id)}>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0"
                              onClick={() => { setEditingCommentId(c.id); setEditCommentText(c.comment_text); }}>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] px-1.5 text-muted-foreground"
                              onClick={async () => {
                                await supabase.from("review_comments")
                                  .update({ is_closed: true, closed_at: new Date().toISOString() })
                                  .eq("id", c.id);
                                queryClient.invalidateQueries({ queryKey: ["review-comments", caseId] });
                              }}>✓</Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive/60 hover:text-destructive"
                              title="Eliminar comentario"
                              onClick={async () => {
                                await supabase.from("review_comments").delete().eq("id", c.id);
                                queryClient.invalidateQueries({ queryKey: ["review-comments", caseId] });
                                toast.success("Comentario eliminado");
                              }}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <HistoryTabs caseId={caseId} onReopen={isReadOnly && status === "RECHAZADO" && isAdmin ? handleReopen : undefined} />

      {/* Update Finding Status Dialog */}
      <Dialog open={!!statusUpdateFinding} onOpenChange={(o) => { if (!o) setStatusUpdateFinding(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Evaluar Observación</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {correctionStatuses.map((s) => (
                <Button key={s.value} variant={statusUpdateValue === s.value ? "default" : "outline"} size="sm"
                  className={`h-9 text-xs ${statusUpdateValue === s.value ? "" : s.color}`}
                  onClick={() => setStatusUpdateValue(s.value)}>
                  {s.label}
                </Button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Comentario</Label>
              <Textarea value={statusUpdateComment} onChange={(e) => setStatusUpdateComment(e.target.value)} className="text-sm" rows={2} placeholder="Comentario sobre la corrección..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusUpdateFinding(null)}>Cancelar</Button>
            <Button onClick={handleUpdateFindingStatus} disabled={!statusUpdateValue || actions.updateFindingStatus.isPending}>
              Guardar Estado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rechazar Trámite</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label className="text-xs">Motivo del rechazo</Label>
            <Textarea value={rejectMotivo} onChange={(e) => setRejectMotivo(e.target.value)}
              placeholder="Describe el motivo del rechazo..." rows={3} className="text-sm" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={async () => {
              if (!rejectMotivo.trim()) { toast.error("El motivo es obligatorio"); return; }
              await actions.rejectCase.mutateAsync(rejectMotivo);
              setShowRejectDialog(false); onClose();
            }} disabled={actions.rejectCase.isPending}>Confirmar Rechazo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sticky Action Bar inside Sheet */}
      {isActiveReview && !needsCorrection && !isReopened && (
        <div className="fixed bottom-0 right-0 z-50 w-full sm:max-w-3xl lg:max-w-4xl border-t border-border bg-card/95 backdrop-blur-sm shadow-lg">
          <div className="flex items-center justify-between px-6 py-3">
            <Button onClick={handleSaveAll} disabled={
              actions.saveDetails.isPending || (docStatus === "PENDIENTE_NO_SE_PUEDE_GLOSAR" && !docComment.trim())
            } className="gap-1.5 h-9 min-w-[100px]">
              {actions.saveDetails.isPending ? (
                <><div className="h-3.5 w-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> Guardando</>
              ) : (
                <><Save className="h-4 w-4" /> Guardar</>
              )}
            </Button>
            <div className="flex items-center gap-2">
              {!hasRequiredFields && (
                <p className="text-xs text-destructive mr-2">
                  Completa Sucursal, Cliente y Ejecutivo para aprobar
                </p>
              )}
              <Button variant="default" className="gap-1.5 h-9 bg-success hover:bg-success/90 text-success-foreground"
                disabled={!canApprove || actions.approveCase.isPending}
                onClick={async () => { await actions.approveCase.mutateAsync(); onClose(); }}>
                <CheckCircle className="h-4 w-4" /> Aprobar
              </Button>
              <Button variant="destructive" className="gap-1.5 h-9" onClick={() => setShowRejectDialog(true)}>
                <XCircle className="h-4 w-4" /> Rechazar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* New Client Dialog */}
      <Dialog open={showNewClientDialog} onOpenChange={setShowNewClientDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nuevo Cliente</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Nombre del cliente</Label>
            <Input
              value={newClientNombre}
              onChange={e => setNewClientNombre(e.target.value)}
              placeholder="Nombre de la empresa o persona"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewClientDialog(false)}>Cancelar</Button>
            <Button
              disabled={!newClientNombre.trim() || savingNewClient}
              onClick={async () => {
                setSavingNewClient(true);
                try {
                  const { data, error } = await supabase.from("clients").insert({ nombre: newClientNombre.trim() }).select().single();
                  if (error) throw error;
                  toast.success("Cliente registrado");
                  setClientId(data.id);
                  setNewClientNombre("");
                  setShowNewClientDialog(false);
                  queryClient.invalidateQueries({ queryKey: ["clients-active"] });
                } catch (e: unknown) {
                  toast.error(e instanceof Error ? e.message : "Error al crear cliente");
                } finally {
                  setSavingNewClient(false);
                }
              }}
            >
              {savingNewClient ? "Guardando..." : "Crear cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Score Breakdown Dialog */}
      <Dialog open={showScoreBreakdown} onOpenChange={setShowScoreBreakdown}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cálculo de Calificación</DialogTitle></DialogHeader>
          {scoreDetail ? (
            <div className="space-y-4 text-sm">
              <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Clasificación (20 pts máx.)</span>
                  <span className="font-bold">{scoreDetail.score_classification}/20</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Rondas de corrección: {scoreDetail.correction_rounds}
                  {scoreDetail.correction_rounds === 0 ? " — puntuación perfecta" :
                   scoreDetail.correction_rounds === 1 ? " — 18 pts" :
                   scoreDetail.correction_rounds === 2 ? " — 15 pts" :
                   scoreDetail.correction_rounds === 3 ? " — 12 pts" :
                   scoreDetail.correction_rounds === 4 ? " — 8 pts" : " — 5 pts"}
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Observaciones (80 pts máx.)</span>
                  <span className="font-bold">{scoreDetail.score_observations}/80</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Errores detectados: {scoreDetail.total_errors}
                </p>
              </div>
              <div className="border-t pt-3 flex justify-between font-bold text-base">
                <span>Total</span>
                <span className={
                  Number(scoreDetail.score_total) >= 85 ? "text-success" :
                  Number(scoreDetail.score_total) >= 70 ? "text-warning" : "text-destructive"
                }>{scoreDetail.score_total}/100</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Sin datos de calificación</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReviewDetailPanel;
