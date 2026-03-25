import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useCatalogs } from "@/hooks/useCatalogs";
import {
  useReviewCase, useReviewDetails, useReviewClassifications,
  useReviewDocumentation, useReviewFindings, useClassificationFeatures,
  useClassificationRules, useObservationCatalog, useItemRanges,
  useCustomsKeys, useReviewActions, useReviewRounds,
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
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Save, Copy, FileDown, CheckCircle, XCircle, Plus, X, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const correctionStatuses = [
  { value: "CORRECTED", label: "Corregido", color: "bg-success/15 text-success" },
  { value: "NOT_CORRECTED", label: "No corregido", color: "bg-destructive/15 text-destructive" },
  { value: "PARTIALLY_CORRECTED", label: "Parcialmente", color: "bg-warning/15 text-warning" },
];

const ReviewDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const caseId = id!;

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

  // Obs form
  const [showObsForm, setShowObsForm] = useState(false);
  const [obsCategoryId, setObsCategoryId] = useState("");
  const [obsSubcategoryId, setObsSubcategoryId] = useState("");
  const [obsErrorId, setObsErrorId] = useState("");
  const [obsComment, setObsComment] = useState("");

  // Finding status update dialog
  const [statusUpdateFinding, setStatusUpdateFinding] = useState<string | null>(null);
  const [statusUpdateValue, setStatusUpdateValue] = useState("");
  const [statusUpdateComment, setStatusUpdateComment] = useState("");

  // Reject dialog
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectMotivo, setRejectMotivo] = useState("");

  // Determine mode
  const status = reviewCase?.status ?? "";
  const isReadOnly = ["APROBADO", "RECHAZADO"].includes(status);
  const isCorrection = ["EN_CORRECCION"].includes(status);
  const needsCorrection = status === "CORRECCION_PENDIENTE";
  const isReopened = status === "REABIERTO";

  // Init form
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

  // Handlers
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
    setObsCategoryId(""); setObsSubcategoryId(""); setObsErrorId(""); setObsComment("");
    setShowObsForm(false);
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
      h1{font-size:18px;border-bottom:2px solid #1e3a5f;padding-bottom:8px;color:#1e3a5f}
      h2{font-size:14px;margin-top:24px;color:#1e3a5f}
      table{width:100%;border-collapse:collapse;margin:8px 0}
      td,th{border:1px solid #ccc;padding:6px 10px;text-align:left}
      th{background:#f0f4f8;font-weight:600}
      .obs-item{margin:6px 0;padding:8px;background:#f8f9fa;border-left:3px solid #d97706}
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
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (!reviewCase) {
    return (
      <AppLayout>
        <div className="text-center py-20 text-muted-foreground">Trámite no encontrado</div>
      </AppLayout>
    );
  }

  const statusColorMap: Record<string, string> = {
    EN_REVISION: "bg-primary/15 text-primary",
    APROBADO: "bg-success/15 text-success",
    RECHAZADO: "bg-destructive/15 text-destructive",
    CORRECCION_PENDIENTE: "bg-warning/15 text-warning",
    EN_CORRECCION: "bg-warning/15 text-warning",
    REABIERTO: "bg-accent text-accent-foreground",
  };

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/glosa")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">
              {reviewCase.reference ?? reviewCase.internal_folio}
            </h1>
            <p className="text-sm text-muted-foreground">
              {(reviewCase.document_types as any)?.name} — Folio: {reviewCase.internal_folio}
              {rounds.length > 0 && ` — Ronda ${rounds.length}`}
            </p>
          </div>
          <Badge className={`text-xs ${statusColorMap[status] ?? "bg-muted text-muted-foreground"}`}>
            {status}
          </Badge>
        </div>

        {/* Correction banner */}
        {needsCorrection && (
          <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Este trámite tiene observaciones pendientes de corrección</p>
              <p className="text-xs text-muted-foreground">Inicia la revisión de corrección para evaluar los errores</p>
            </div>
            <Button
              onClick={handleStartCorrection}
              disabled={actions.startCorrection.isPending}
              className="gap-1.5"
            >
              <RotateCcw className="h-4 w-4" /> Iniciar Corrección
            </Button>
          </div>
        )}

        {/* Reopened banner */}
        {isReopened && (
          <div className="rounded-xl border border-accent bg-accent/10 p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Este trámite fue reabierto</p>
              <p className="text-xs text-muted-foreground">Puedes iniciar una nueva revisión de corrección</p>
            </div>
            <Button
              onClick={handleStartCorrection}
              disabled={actions.startCorrection.isPending}
              className="gap-1.5"
            >
              <RotateCcw className="h-4 w-4" /> Iniciar Corrección
            </Button>
          </div>
        )}

        {/* Section 1: General Info */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Información General</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Referencia</Label>
                <Input value={reviewCase.reference ?? ""} disabled className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Sucursal</Label>
                <Select value={branchId} onValueChange={setBranchId} disabled={isReadOnly}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {(branches.data ?? []).map((b) => <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ejecutivo</Label>
                <Select value={executiveId} onValueChange={setExecutiveId} disabled={isReadOnly}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {(executives.data ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cliente</Label>
                <Select value={clientId} onValueChange={setClientId} disabled={isReadOnly}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {(clients.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Clave Aduanera</Label>
                <Select value={customsKeyId} onValueChange={setCustomsKeyId} disabled={isReadOnly}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {customsKeys.map((k) => <SelectItem key={k.id} value={k.id}>{k.clave} — {k.descripcion}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Partidas</Label>
                <div className="flex gap-2">
                  <Input type="number" value={partidas} onChange={(e) => setPartidas(e.target.value)} disabled={isReadOnly} className="h-9 text-sm flex-1" placeholder="0" />
                  {detectedRange && <Badge variant="outline" className="text-[10px] whitespace-nowrap self-center">{detectedRange.nombre_rango}</Badge>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Classification */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Clasificación</CardTitle></CardHeader>
          <CardContent>
            {features.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay características configuradas</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {features.map((f) => (
                  <div key={f.id} className="flex items-center gap-2">
                    <Checkbox id={`cl-${f.id}`} checked={classValues[f.id] ?? false}
                      onCheckedChange={(v) => setClassValues((p) => ({ ...p, [f.id]: !!v }))}
                      disabled={isReadOnly} />
                    <label htmlFor={`cl-${f.id}`} className="text-sm cursor-pointer">{f.nombre}</label>
                    {f.descripcion && <span className="text-[10px] text-muted-foreground">({f.descripcion})</span>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 3: Documentation */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Documentación</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={docStatus} onValueChange={setDocStatus} disabled={isReadOnly}>
              <SelectTrigger className="h-9 text-sm w-72"><SelectValue /></SelectTrigger>
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
              <p className="text-xs text-destructive">Comentario obligatorio para este estado</p>
            )}
          </CardContent>
        </Card>

        {/* Section 4: Observations */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              Observaciones
              {openFindings.length > 0 && <Badge variant="destructive" className="ml-2 text-xs">{openFindings.length} abiertas</Badge>}
            </CardTitle>
            {!isReadOnly && !needsCorrection && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowObsForm(true)}>
                <Plus className="h-3 w-3" /> Agregar
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {findings.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin observaciones registradas</p>
            ) : (
              <div className="space-y-2">
                {findings.map((f) => {
                  const isFromPreviousRound = isCorrection && f.current_status !== "open";
                  return (
                    <div key={f.id} className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${
                      f.is_open ? "border-warning/30 bg-warning/5" :
                      f.current_status === "CORRECTED" ? "border-success/30 bg-success/5" :
                      f.current_status === "NOT_CORRECTED" ? "border-destructive/30 bg-destructive/5" :
                      "border-muted opacity-60"
                    }`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{(f as any).observation_categories?.nombre}</span>
                          <span className="text-muted-foreground">›</span>
                          <span>{(f as any).observation_subcategories?.nombre}</span>
                        </div>
                        <p className="text-foreground mt-0.5">
                          {(f as any).observation_errors?.descripcion}
                          {(f as any).observation_errors?.descuento_puntos && (
                            <Badge variant="outline" className="ml-2 text-[10px]">
                              -{(f as any).observation_errors.descuento_puntos} pts
                            </Badge>
                          )}
                        </p>
                        {f.comentario_inicial && (
                          <p className="text-xs text-muted-foreground mt-1 italic">{f.comentario_inicial}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant={f.is_open ? "default" : "secondary"} className={`text-[10px] ${
                          f.current_status === "CORRECTED" ? "bg-success/15 text-success" :
                          f.current_status === "NOT_CORRECTED" ? "bg-destructive/15 text-destructive" :
                          f.current_status === "PARTIALLY_CORRECTED" ? "bg-warning/15 text-warning" : ""
                        }`}>
                          {f.current_status === "open" ? "Abierta" :
                           f.current_status === "closed" ? "Cerrada" :
                           f.current_status}
                        </Badge>
                        {/* In correction mode: allow status change on previous findings */}
                        {isCorrection && f.current_status !== "closed" && (
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-1.5"
                            onClick={() => { setStatusUpdateFinding(f.id); setStatusUpdateValue(""); setStatusUpdateComment(""); }}>
                            Evaluar
                          </Button>
                        )}
                        {/* In initial review: allow closing new findings */}
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

        {/* Dialogs */}
        {/* Add Observation */}
        <Dialog open={showObsForm} onOpenChange={setShowObsForm}>
          <DialogContent>
            <DialogHeader><DialogTitle>Agregar Observación</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Categoría</Label>
                <Select value={obsCategoryId} onValueChange={(v) => { setObsCategoryId(v); setObsSubcategoryId(""); setObsErrorId(""); }}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
                  <SelectContent>
                    {(categories.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Subcategoría</Label>
                <Select value={obsSubcategoryId} onValueChange={(v) => { setObsSubcategoryId(v); setObsErrorId(""); }} disabled={!obsCategoryId}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar subcategoría" /></SelectTrigger>
                  <SelectContent>
                    {filteredSubcats.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Error</Label>
                <Select value={obsErrorId} onValueChange={setObsErrorId} disabled={!obsSubcategoryId}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar error" /></SelectTrigger>
                  <SelectContent>
                    {filteredErrors.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.codigo_error ? `[${e.codigo_error}] ` : ""}{e.descripcion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Comentario (opcional)</Label>
                <Textarea value={obsComment} onChange={(e) => setObsComment(e.target.value)} className="text-sm" rows={2} placeholder="Detalle..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowObsForm(false)}>Cancelar</Button>
              <Button onClick={handleAddFinding} disabled={actions.addFinding.isPending}>Agregar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Update Finding Status */}
        <Dialog open={!!statusUpdateFinding} onOpenChange={(o) => { if (!o) setStatusUpdateFinding(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Evaluar Observación</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Estado de corrección</Label>
                <Select value={statusUpdateValue} onValueChange={setStatusUpdateValue}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar estado" /></SelectTrigger>
                  <SelectContent>
                    {correctionStatuses.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

        {/* Reject */}
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
                setShowRejectDialog(false); navigate("/glosa");
              }} disabled={actions.rejectCase.isPending}>Confirmar Rechazo</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Action Buttons */}
        {!isReadOnly && !needsCorrection && !isReopened && (
          <>
            <Separator />
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSaveAll} disabled={
                actions.saveDetails.isPending || (docStatus === "PENDIENTE_NO_SE_PUEDE_GLOSAR" && !docComment.trim())
              } className="gap-1.5">
                <Save className="h-4 w-4" /> Guardar
              </Button>
              <Button variant="outline" onClick={handleCopyText} className="gap-1.5">
                <Copy className="h-4 w-4" /> Copiar Texto
              </Button>
              <Button variant="outline" onClick={handleGeneratePDF} className="gap-1.5">
                <FileDown className="h-4 w-4" /> PDF
              </Button>
              <div className="flex-1" />
              <Button variant="default" className="gap-1.5 bg-success hover:bg-success/90 text-success-foreground"
                disabled={!canApprove || actions.approveCase.isPending}
                onClick={async () => { await actions.approveCase.mutateAsync(); navigate("/glosa"); }}>
                <CheckCircle className="h-4 w-4" /> Aprobar
              </Button>
              <Button variant="destructive" className="gap-1.5" onClick={() => setShowRejectDialog(true)}>
                <XCircle className="h-4 w-4" /> Rechazar
              </Button>
            </div>
          </>
        )}

        {/* Read-only actions */}
        {isReadOnly && (
          <>
            <Separator />
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCopyText} className="gap-1.5">
                <Copy className="h-4 w-4" /> Copiar Texto
              </Button>
              <Button variant="outline" onClick={handleGeneratePDF} className="gap-1.5">
                <FileDown className="h-4 w-4" /> PDF
              </Button>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default ReviewDetail;
