import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
import { Save, Copy, FileDown, CheckCircle, XCircle, Plus, X, RotateCcw, AlertTriangle, FileCheck } from "lucide-react";
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

const ReviewDetailPanel = ({ caseId, onClose }: Props) => {
  const { isAdmin } = useAuth();

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
  const { branches, clients, executives } = useCatalogs();
  const actions = useReviewActions(caseId);

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
  const [obsCategoryId, setObsCategoryId] = useState("");
  const [obsSubcategoryId, setObsSubcategoryId] = useState("");
  const [obsErrorId, setObsErrorId] = useState("");
  const [obsComment, setObsComment] = useState("");

  const [statusUpdateFinding, setStatusUpdateFinding] = useState<string | null>(null);
  const [statusUpdateValue, setStatusUpdateValue] = useState("");
  const [statusUpdateComment, setStatusUpdateComment] = useState("");

  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectMotivo, setRejectMotivo] = useState("");

  const status = reviewCase?.status ?? "";
  const isReadOnly = ["APROBADO", "RECHAZADO"].includes(status);
  const isCorrection = ["EN_CORRECCION"].includes(status);
  const needsCorrection = status === "CORRECCION_PENDIENTE";
  const isReopened = status === "REABIERTO";
  const isActiveReview = ["EN_REVISION", "EN_CORRECCION"].includes(status);

  useEffect(() => {
    if (reviewCase) {
      setBranchId((reviewCase as any).branch_id ?? "");
      setClientId((reviewCase as any).client_id ?? "");
      setExecutiveId((reviewCase as any).executive_id ?? "");
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
    if (features.length > 0) {
      const vals: Record<string, boolean> = {};
      for (const f of features) {
        const existing = classifications.find((c) => (c as any).classification_feature_id === f.id);
        if (existing) {
          vals[f.id] = existing.value_boolean;
        } else {
          const rule = rules.find(
            (r) => r.classification_feature_id === f.id &&
              (!r.sucursal_id || r.sucursal_id === branchId) &&
              (!r.cliente_id || r.cliente_id === clientId) &&
              (!r.customs_key_id || r.customs_key_id === customsKeyId)
          );
          vals[f.id] = rule?.default_value ?? false;
        }
      }
      setClassValues(vals);
    }
  }, [features, classifications, rules, branchId, clientId, customsKeyId]);

  const detectedRange = useMemo(() => {
    const p = parseInt(partidas);
    if (isNaN(p)) return null;
    return itemRanges.find((r) => p >= r.min_partidas && p <= r.max_partidas) ?? null;
  }, [partidas, itemRanges]);

  const filteredSubcats = useMemo(
    () => (subcategories.data ?? []).filter((s) => s.category_id === obsCategoryId),
    [subcategories.data, obsCategoryId]
  );
  const filteredErrors = useMemo(
    () => (obsErrors.data ?? []).filter((e) => e.subcategory_id === obsSubcategoryId),
    [obsErrors.data, obsSubcategoryId]
  );

  const openFindings = findings.filter((f) => f.is_open);
  const canApprove = openFindings.length === 0 && docStatus !== "PENDIENTE_NO_SE_PUEDE_GLOSAR";

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
    }
  };

  const handleAddFinding = async () => {
    if (!obsCategoryId || !obsSubcategoryId || !obsErrorId) {
      toast.error("Selecciona categoría, subcategoría y error");
      return;
    }
    await actions.addFinding.mutateAsync({
      category_id: obsCategoryId, subcategory_id: obsSubcategoryId,
      observation_error_id: obsErrorId, comentario_inicial: obsComment,
    });
    setObsSubcategoryId(""); setObsErrorId(""); setObsComment("");
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

  const handleCopyText = () => {
    const lines: string[] = [];
    lines.push(`Referencia: ${reviewCase?.reference ?? reviewCase?.internal_folio}`);
    lines.push(`Tipo: ${(reviewCase?.document_types as any)?.name}`);
    lines.push(`Sucursal: ${(reviewCase?.branches as any)?.nombre ?? "—"}`);
    lines.push(`Ejecutivo: ${(reviewCase?.executives as any)?.nombre ?? "—"}`);
    lines.push(`Documentación: ${docStatus}`);
    lines.push("");
    lines.push("=== OBSERVACIONES ===");
    for (const f of findings.filter((x) => x.is_open)) {
      const cat = (f as any).observation_categories?.nombre ?? "";
      const sub = (f as any).observation_subcategories?.nombre ?? "";
      const err = (f as any).observation_errors?.descripcion ?? "";
      lines.push(`• [${cat} > ${sub}] ${err} — Estado: ${f.current_status}`);
      if (f.comentario_inicial) lines.push(`  Comentario: ${f.comentario_inicial}`);
    }
    navigator.clipboard.writeText(lines.join("\n"));
    toast.success("Texto copiado al portapapeles");
  };

  const handleGeneratePDF = () => {
    const ref = reviewCase?.reference ?? reviewCase?.internal_folio ?? "";
    const tipo = (reviewCase?.document_types as any)?.name ?? "";
    const suc = (reviewCase?.branches as any)?.nombre ?? "";
    const ejec = (reviewCase?.executives as any)?.nombre ?? "";
    const cli = (reviewCase?.clients as any)?.nombre ?? "";

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
      const cat = (f as any).observation_categories?.nombre ?? "";
      const sub = (f as any).observation_subcategories?.nombre ?? "";
      const err = (f as any).observation_errors?.descripcion ?? "";
      const cls = f.current_status === "CORRECTED" ? "corrected" : f.current_status === "NOT_CORRECTED" ? "not-corrected" : "";
      html += `<div class="obs-item ${cls}"><strong>${cat} &gt; ${sub}</strong> — <em>${f.current_status}</em><br/>${err}`;
      if (f.comentario_inicial) html += `<br/><small>${f.comentario_inicial}</small>`;
      html += `</div>`;
    }
    html += `<h2>Revisiones (${rounds.length})</h2><table><tr><th>#</th><th>Tipo</th><th>Resultado</th></tr>`;
    for (const r of rounds) {
      html += `<tr><td>${r.round_number}</td><td>${r.round_type ?? "—"}</td><td>${r.result_status ?? "En curso"}</td></tr>`;
    }
    html += `</table></body></html>`;

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
          </div>
          <p className="text-sm text-muted-foreground">
            {(reviewCase.document_types as any)?.name} — Folio: {reviewCase.internal_folio}
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
        <div className="flex items-center justify-between gap-4 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Observaciones pendientes de corrección</p>
              <p className="text-xs text-muted-foreground">Inicia la revisión de corrección para evaluar los errores</p>
            </div>
          </div>
          <Button onClick={handleStartCorrection} disabled={actions.startCorrection.isPending} className="gap-1.5 shrink-0">
            <RotateCcw className="h-4 w-4" /> Iniciar Corrección
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
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Cliente</Label>
              <Select value={clientId} onValueChange={setClientId} disabled={isReadOnly}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{(clients.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}</SelectContent>
              </Select>
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

      {/* Classification + Documentation */}
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
                      onCheckedChange={(v) => setClassValues((p) => ({ ...p, [f.id]: !!v }))}
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
      <Card>
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
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Categoría</Label>
                  <Select value={obsCategoryId} onValueChange={(v) => { setObsCategoryId(v); setObsSubcategoryId(""); setObsErrorId(""); }}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Categoría" /></SelectTrigger>
                    <SelectContent>{(categories.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Subcategoría</Label>
                  <Select value={obsSubcategoryId} onValueChange={(v) => { setObsSubcategoryId(v); setObsErrorId(""); }} disabled={!obsCategoryId}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Subcategoría" /></SelectTrigger>
                    <SelectContent>{filteredSubcats.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Error</Label>
                  <Select value={obsErrorId} onValueChange={setObsErrorId} disabled={!obsSubcategoryId}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Error" /></SelectTrigger>
                    <SelectContent>
                      {filteredErrors.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.codigo_error ? `[${e.codigo_error}] ` : ""}{e.descripcion}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Input value={obsComment} onChange={(e) => setObsComment(e.target.value)}
                    placeholder="Comentario opcional..." className="h-8 text-xs" />
                </div>
                <Button size="sm" onClick={handleAddFinding} disabled={actions.addFinding.isPending || !obsErrorId}
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
                  <div key={f.id} className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${
                    f.current_status === "CORRECTED" ? "border-success/20 bg-success/[0.03]" :
                    f.current_status === "NOT_CORRECTED" ? "border-destructive/20 bg-destructive/[0.03]" :
                    "border-warning/20 bg-warning/[0.03]"
                  }`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-xs">{(f as any).observation_categories?.nombre}</span>
                        <span className="text-muted-foreground text-xs">›</span>
                        <span className="text-xs">{(f as any).observation_subcategories?.nombre}</span>
                      </div>
                      <p className="text-foreground mt-0.5">
                        {(f as any).observation_errors?.descripcion}
                        {(f as any).observation_errors?.descuento_puntos && (
                          <Badge variant="outline" className="ml-2 text-[10px]">-{(f as any).observation_errors.descuento_puntos} pts</Badge>
                        )}
                      </p>
                      {f.comentario_inicial && <p className="text-xs text-muted-foreground mt-1 italic">{f.comentario_inicial}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${st.className}`}>
                        {st.label}
                      </span>
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2"
                        onClick={() => { setStatusUpdateFinding(f.id); setStatusUpdateValue(""); setStatusUpdateComment(""); }}>
                        Evaluar
                      </Button>
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
                  <div key={f.id} className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${
                    f.is_open ? "border-warning/30 bg-warning/[0.03]" :
                    f.current_status === "CORRECTED" ? "border-success/20 bg-success/[0.03]" :
                    f.current_status === "NOT_CORRECTED" ? "border-destructive/20 bg-destructive/[0.03]" :
                    "border-muted"
                  }`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-xs">{(f as any).observation_categories?.nombre}</span>
                        <span className="text-muted-foreground text-xs">›</span>
                        <span className="text-xs">{(f as any).observation_subcategories?.nombre}</span>
                      </div>
                      <p className="text-foreground mt-0.5">
                        {(f as any).observation_errors?.descripcion}
                        {(f as any).observation_errors?.descuento_puntos && (
                          <Badge variant="outline" className="ml-2 text-[10px]">-{(f as any).observation_errors.descuento_puntos} pts</Badge>
                        )}
                      </p>
                      {f.comentario_inicial && <p className="text-xs text-muted-foreground mt-1 italic">{f.comentario_inicial}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${st.className}`}>
                        {st.label}
                      </span>
                      {isCorrection && f.current_status !== "closed" && (
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2"
                          onClick={() => { setStatusUpdateFinding(f.id); setStatusUpdateValue(""); setStatusUpdateComment(""); }}>
                          Evaluar
                        </Button>
                      )}
                      {!isCorrection && f.is_open && !isReadOnly && f.current_status === "open" && (
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0"
                          onClick={() => actions.removeFinding.mutate(f.id)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
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
            } className="gap-1.5 h-9">
              <Save className="h-4 w-4" /> Guardar
            </Button>
            <div className="flex items-center gap-2">
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
    </div>
  );
};

export default ReviewDetailPanel;
