import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useReviewPanelState } from "@/hooks/useReviewPanelState";
import { HistoryTabs } from "@/components/glosa/HistoryTabs";
import { InfoGeneralCard } from "@/components/glosa/panels/InfoGeneralCard";
import { ObservationsCard } from "@/components/glosa/panels/ObservationsCard";
import { CommentsCard } from "@/components/glosa/panels/CommentsCard";
import { ActionDialogs } from "@/components/glosa/panels/ActionDialogs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Save, Copy, FileDown, CheckCircle, XCircle, X, RotateCcw,
  AlertTriangle, FileCheck, Pause,
} from "lucide-react";
import { toast } from "sonner";

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
  const queryClient = useQueryClient();
  const state = useReviewPanelState(caseId, onClose);
  const {
    reviewCase, isLoading, status, isReadOnly, isCorrection,
    needsCorrection, isReopened, isActiveReview,
    findings, features, classValues, setClassValues, setManuallyChanged,
    docStatus, setDocStatus, docComment, setDocComment,
    documentation, generalCommentsList, rounds,
    partidas, comments,
    elapsedSeconds, formatTimer,
    handleSaveAll, handleStartCorrection, handleReopen,
    setShowScoreBreakdown, setShowDeleteDialog, setShowRejectDialog,
    actions,
    loteInput, setLoteInput, savingLote, setSavingLote,
    canApprove, hasRequiredFields,
  } = state;

  const handleCopyText = () => {
    if (!reviewCase) { toast.error("No hay datos para copiar"); return; }
    // Special format for approved cases
    if (status === "APROBADO") {
      const ref = reviewCase.reference || reviewCase.internal_folio;
      const docTypeName = reviewCase.document_types?.name ?? "Trámite";
      let t = "";
      t += "┌─ INFORMACIÓN GENERAL ─────────────────────────────┐\n";
      t += `│ Referencia:      ${ref}\n`;
      t += `│ Cliente:         ${reviewCase.clients?.nombre || "—"}\n`;
      t += `│ Ejecutivo:       ${reviewCase.executives?.nombre || "—"}\n`;
      t += `│ Glosador:        ${reviewCase.glosador?.nombre || "Sin asignar"}\n`;
      t += "└──────────────────────────────────────────────────────┘\n\n";
      t += `[${docTypeName}] [${ref}] autorizado para pago.\n`;
      navigator.clipboard.writeText(t);
      toast.success("Texto copiado");
      return;
    }
    const dsl: Record<string, string> = {
      COMPLETO: "✓ Completo",
      PENDIENTE_SI_SE_PUEDE_GLOSAR: "⚠ Pendiente — se puede glosar",
      PENDIENTE_NO_SE_PUEDE_GLOSAR: "✗ Pendiente — NO se puede glosar",
    };
    let t = "";
    t += "┌─ INFORMACIÓN GENERAL ─────────────────────────────┐\n";
    t += `│ Referencia:      ${reviewCase.reference || reviewCase.internal_folio}\n`;
    t += `│ Cliente:         ${reviewCase.clients?.nombre || "—"}\n`;
    t += `│ Ejecutivo:       ${reviewCase.executives?.nombre || "—"}\n`;
    t += `│ Glosador:        ${reviewCase.glosador?.nombre || "Sin asignar"}\n`;
    t += "└──────────────────────────────────────────────────────┘\n\n";
    if (documentation && (documentation.documentation_status !== "COMPLETO" || documentation.documentation_comment)) {
      t += "┌─ DOCUMENTACIÓN ────────────────────────────────────┐\n";
      t += `│ Estado: ${dsl[documentation.documentation_status ?? ""] || documentation.documentation_status}\n`;
      if (documentation.documentation_comment) {
        t += `│ Comentario: ${documentation.documentation_comment}\n`;
      }
      t += "└──────────────────────────────────────────────────────┘\n\n";
    }
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
          // Add NOT_CORRECTED comment from finding history if present
          const histories = (f as unknown as { finding_histories?: Array<{ new_status: string; comment: string | null; created_at: string }> }).finding_histories ?? [];
          const sortedHistories = [...histories]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          const notCorrectedEntry = sortedHistories.find(
            (h) => h.new_status === "NOT_CORRECTED" && h.comment
          );
          const partialEntry = sortedHistories.find(
            (h) => h.new_status === "PARTIALLY_CORRECTED" && h.comment
          );
          if (notCorrectedEntry) {
            t += `\t   No corregido: ${notCorrectedEntry.comment}\n`;
          } else if (partialEntry) {
            t += `\t   Parcialmente corregido: ${partialEntry.comment}\n`;
          }
          counter++;
        }
      }
    }
    const openComments = generalCommentsList.filter(c => !c.is_closed);
    if (openComments.length > 0) {
      // Group comments by category, same as observations
      const byCat: Record<string, typeof openComments> = {};
      const catOrderC: string[] = [];
      for (const c of openComments) {
        const catName = c.observation_categories?.nombre || "";
        const key = catName || "__none__";
        if (!byCat[key]) { byCat[key] = []; catOrderC.push(key); }
        byCat[key].push(c);
      }

      t += "\n     >>Comentarios<<\n";
      let commentCounter = 1;
      for (const key of catOrderC) {
        if (key !== "__none__") {
          t += `\n  Categoría = ${key}\n`;
        }
        for (const c of byCat[key]) {
          const sub = c.observation_subcategories?.nombre;
          const prefix = sub ? `${sub} --> ` : "";
          t += `        ${commentCounter}. ${prefix}${c.comment_text}\n`;
          commentCounter++;
        }
      }
    }
    navigator.clipboard.writeText(t)
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

  return (
    <div className="space-y-5 p-6 pb-28">
      {/* Header */}
      <div className="gap-4 flex-col flex items-start justify-center">
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
            {["EN_REVISION", "EN_CORRECCION"].includes(status) && (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/5 border border-primary/20 px-2.5 py-0.5 text-sm font-mono font-medium text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                {formatTimer(elapsedSeconds)}
              </span>
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
          {isAdmin && status === "APROBADO" && (
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs"
              onClick={() => actions.adminReopenApproved.mutate()}
              disabled={actions.adminReopenApproved.isPending}>
              <RotateCcw className="h-3.5 w-3.5" /> Reabrir
            </Button>
          )}
          {isAdmin && (
            <Button variant="outline" size="sm"
              className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive border-destructive/30"
              onClick={() => setShowDeleteDialog(true)}>
              <X className="h-3.5 w-3.5" /> Eliminar
            </Button>
          )}
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

      {/* Información General */}
      <InfoGeneralCard state={state} />

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

      {/* Clasificación + Documentación */}
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

      {/* Observaciones */}
      <ObservationsCard state={state} />

      {/* Comentarios Generales */}
      <CommentsCard state={state} />

      {/* History */}
      <HistoryTabs caseId={caseId} onReopen={isReadOnly && status === "RECHAZADO" && isAdmin ? handleReopen : undefined} />

      {/* Sticky Action Bar — always visible for active cases (no X button to close) */}
      {!isReadOnly && (isActiveReview || needsCorrection || isReopened) && (
        <div className="fixed bottom-0 right-0 z-50 w-full sm:max-w-3xl lg:max-w-4xl border-t border-border bg-card/95 backdrop-blur-sm shadow-lg">
          <div className="flex items-center justify-between gap-3 px-6 py-3">
            {/* LEFT: Pausar — saves and closes panel, pauses timer */}
            <div className="flex items-center gap-2">
              {isActiveReview && (
                <Button
                  variant="outline"
                  className="gap-1.5 h-9"
                  disabled={actions.pauseSession.isPending}
                  onClick={async () => {
                    if (state.showObsForm && (state.obsComment || state.obsErrorId)) {
                      if (!window.confirm("Tienes una observación sin agregar. ¿Pausar y descartar ese borrador?")) return;
                    }
                    if (state.showCommentForm && state.generalComment) {
                      if (!window.confirm("Tienes un comentario sin enviar. ¿Pausar y descartar ese texto?")) return;
                    }
                    // Extra dialog when in EN_CORRECCION
                    if (status === "EN_CORRECCION") {
                      const hasUnevaluatedFindings = findings.some(
                        f => f.is_open && f.current_status === "PENDING"
                      );
                      if (hasUnevaluatedFindings) {
                        const choice = window.confirm(
                          "Hay observaciones que aún no has evaluado (no marcadas como Corregido o No Corregido).\n\n" +
                          "• Presiona ACEPTAR si pausas porque trabajarás en otro trámite y volverás después.\n" +
                          "• Presiona CANCELAR si quieres terminar de evaluar todas las observaciones antes de pausar."
                        );
                        if (!choice) return;
                      }
                    }
                    await handleSaveAll().catch(() => {});
                    await actions.pauseSession.mutateAsync().catch(() => {});
                    onClose();
                  }}
                >
                  <Pause className="h-4 w-4" /> Pausar
                </Button>
              )}

              {/* CENTER: Fin de Glosa — saves with observations pending, closes panel */}
              {isActiveReview && !needsCorrection && (
                <Button
                  variant="secondary"
                  className="gap-1.5 h-9"
                  disabled={actions.saveDetails.isPending || actions.saveWithObservations.isPending}
                  onClick={async () => {
                    await handleSaveAll();
                    if (state.openFindings.length > 0) {
                      await actions.saveWithObservations.mutateAsync().catch(() => {});
                    }
                    onClose();
                  }}
                >
                  {actions.saveDetails.isPending || actions.saveWithObservations.isPending ? (
                    <>
                      <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Guardando
                    </>
                  ) : (
                    <><Save className="h-4 w-4" /> Fin de Glosa</>
                  )}
                </Button>
              )}
            </div>

            {/* RIGHT: Aprobar / Rechazar */}
            <div className="flex items-center gap-2">
              {(!canApprove && (isActiveReview || isReopened)) && (() => {
                const missing: string[] = [];
                if (!state.branchId) missing.push("Sucursal");
                if (!state.clientId) missing.push("Cliente");
                if (!state.executiveId) missing.push("Ejecutivo");
                if (!state.customsKeyId) missing.push("Clave Aduanera");
                const p = parseInt(state.partidas);
                if (isNaN(p) || p <= 0) missing.push("Partidas");
                if (state.docStatus !== "COMPLETO") missing.push("Documentación = Completo");
                if (state.openFindings.length > 0) missing.push(`${state.openFindings.length} obs. sin cerrar`);
                if (missing.length === 0) return null;
                return (
                  <div className="flex items-start gap-1.5 text-xs text-destructive max-w-xs">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>
                      Falta para aprobar:{" "}
                      <strong>{missing.join(" · ")}</strong>
                    </span>
                  </div>
                );
              })()}
              {(isActiveReview || isReopened) && !needsCorrection && (
                <Button
                  variant="default"
                  className="gap-1.5 h-9 bg-success hover:bg-success/90 text-success-foreground"
                  disabled={!canApprove || actions.approveCase.isPending}
                  onClick={async () => {
                    await handleSaveAll();
                    await actions.approveCase.mutateAsync();
                    onClose();
                  }}
                >
                  <CheckCircle className="h-4 w-4" /> Aprobar
                </Button>
              )}
              <Button
                variant="destructive"
                className="gap-1.5 h-9"
                onClick={() => setShowRejectDialog(true)}
              >
                <XCircle className="h-4 w-4" /> Rechazar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <ActionDialogs state={state} />
    </div>
  );
};

export default ReviewDetailPanel;
