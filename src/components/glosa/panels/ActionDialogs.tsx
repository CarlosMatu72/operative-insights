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
    onClose, actions, scoreDetail,
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
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cálculo de Calificación</DialogTitle></DialogHeader>
          {scoreDetail ? (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Penalizaciones por errores (70 pts base)</span>
                  <span className="font-bold">{scoreDetail.score_classification}/70</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {scoreDetail.total_errors} observación(es) registrada(s)
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cantidad de observaciones (20 pts)</span>
                  <span className="font-bold">{scoreDetail.score_observations}/20</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {Number(scoreDetail.total_errors) <= 5 ? "0–5 obs. → 20 pts" :
                   Number(scoreDetail.total_errors) <= 10 ? "6–10 obs. → 10 pts" :
                   "11+ obs. → 0 pts"}
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rondas de revisión (10 pts)</span>
                  <span className="font-bold">{(scoreDetail as { score_revisions?: number }).score_revisions ?? "—"}/10</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {Number(scoreDetail.correction_rounds) <= 2 ? "1–2 rondas → 10 pts" :
                   Number(scoreDetail.correction_rounds) === 3 ? "3 rondas → 5 pts" :
                   "4+ rondas → 0 pts"}
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
