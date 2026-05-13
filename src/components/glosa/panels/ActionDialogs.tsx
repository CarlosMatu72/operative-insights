import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { ReviewPanelState } from "@/hooks/useReviewPanelState";

const correctionStatuses = [
  { value: "CORRECTED", label: "Corregido", color: "text-success" },
  { value: "NOT_CORRECTED", label: "No corregido", color: "text-destructive" },
  { value: "PARTIALLY_CORRECTED", label: "Parcialmente", color: "text-warning" },
];

interface Props {
  state: ReviewPanelState;
}

export function ActionDialogs({ state }: Props) {
  const {
    onClose, actions, scoreDetail, findings,
    statusUpdateFinding, setStatusUpdateFinding,
    statusUpdateValue, setStatusUpdateValue,
    statusUpdateComment, setStatusUpdateComment,
    handleUpdateFindingStatus,
    showRejectDialog, setShowRejectDialog, rejectMotivo, setRejectMotivo,
    showScoreBreakdown, setShowScoreBreakdown,
    showDeleteDialog, setShowDeleteDialog, deleteReason, setDeleteReason,
  } = state;

  return (
    <>
      {/* Update Finding Status */}
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
              setShowRejectDialog(false); onClose();
            }} disabled={actions.rejectCase.isPending}>Confirmar Rechazo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Score Breakdown */}
      <Dialog open={showScoreBreakdown} onOpenChange={setShowScoreBreakdown}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Desglose de Calificación</DialogTitle>
          </DialogHeader>
          {scoreDetail ? (
            <div className="space-y-4 text-sm">
              {/* Part 1: Errors */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="flex justify-between font-semibold">
                  <span>Penalizaciones por error</span>
                  <span>{scoreDetail.score_classification}/70 pts</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1.5 border-t pt-2 mt-1">
                  {findings
                    .filter((f) => f.observation_errors?.descuento_puntos)
                    .map((f, i) => (
                      <div key={f.id} className="flex justify-between items-start gap-2">
                        <span className="flex-1 leading-tight">
                          {i + 1}.{" "}
                          {f.observation_errors?.codigo_error && (
                            <span className="text-muted-foreground mr-1">
                              [{f.observation_errors.codigo_error}]
                            </span>
                          )}
                          {f.observation_errors?.descripcion ?? "Error"}
                        </span>
                        <span className="text-destructive whitespace-nowrap font-medium">
                          −{f.observation_errors?.descuento_puntos} pts
                        </span>
                      </div>
                    ))}
                  {findings.filter((f) => f.observation_errors?.descuento_puntos).length === 0 && (
                    <p className="text-center py-1">Sin errores con penalización registrados</p>
                  )}
                  <div className="flex justify-between font-medium border-t pt-1.5 mt-1">
                    <span>Base 70 − {70 - Number(scoreDetail.score_classification)} pts penalización</span>
                    <span className="text-foreground">{scoreDetail.score_classification} pts</span>
                  </div>
                </div>
              </div>
              {/* Part 2: Observation count */}
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex justify-between font-semibold">
                  <span>Cantidad de observaciones</span>
                  <span>{scoreDetail.score_observations}/20 pts</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {Number(scoreDetail.total_errors)} observación(es) →{" "}
                  {Number(scoreDetail.total_errors) <= 5 ? "0–5 → 20 pts" :
                   Number(scoreDetail.total_errors) <= 10 ? "6–10 → 10 pts" : "11+ → 0 pts"}
                </p>
              </div>
              {/* Part 3: Revision rounds */}
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex justify-between font-semibold">
                  <span>Rondas de revisión</span>
                  <span>{(scoreDetail as { score_revisions?: number }).score_revisions ?? 0}/10 pts</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {Number(scoreDetail.correction_rounds)} ronda(s) →{" "}
                  {Number(scoreDetail.correction_rounds) <= 2 ? "1–2 → 10 pts" :
                   Number(scoreDetail.correction_rounds) === 3 ? "3 → 5 pts" : "4+ → 0 pts"}
                </p>
              </div>
              {/* Total */}
              <div className="flex justify-between items-center text-base font-bold border-t pt-3">
                <span>Calificación final</span>
                <span className={
                  Number(scoreDetail.score_total) >= 85 ? "text-success" :
                  Number(scoreDetail.score_total) >= 70 ? "text-warning" : "text-destructive"
                }>
                  {scoreDetail.score_classification} + {scoreDetail.score_observations} + {(scoreDetail as { score_revisions?: number }).score_revisions ?? 0} = {scoreDetail.score_total}/100
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              Sin datos de calificación
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Case */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">Eliminar trámite</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              El trámite quedará en el historial de administración y su referencia
              podrá reutilizarse. Esta acción queda registrada con tu usuario.
            </p>
            <div className="space-y-1.5">
              <Label>Motivo de eliminación</Label>
              <Textarea
                value={deleteReason}
                onChange={e => setDeleteReason(e.target.value)}
                placeholder="Describe el motivo..."
                rows={2}
                className="text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={actions.deleteCase.isPending}
              onClick={async () => {
                await actions.deleteCase.mutateAsync(deleteReason);
                setShowDeleteDialog(false);
                onClose();
              }}>
              {actions.deleteCase.isPending ? "Eliminando..." : "Eliminar trámite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
