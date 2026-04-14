import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useGlosaCases, useGlosaActions } from "@/hooks/useGlosaPanel";
import { useCatalogs } from "@/hooks/useCatalogs";
import { useGlosadores } from "@/hooks/useTableroData";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { StatusBadge, statusConfig } from "@/components/StatusBadge";
import { Play, Pause, RotateCcw, ClipboardCheck, FilterX, Inbox, Trash2 } from "lucide-react";
import ReviewDetailPanel from "@/components/glosa/ReviewDetailPanel";
import { toast } from "sonner";

function formatTime(seconds: number): string {
  if (seconds === 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const Glosa = () => {
  const { isAdmin, user } = useAuth();
  const queryClient = useQueryClient();
  const { branches, documentTypes, executives } = useCatalogs();
  const { data: glosadores = [] } = useGlosadores();
  const { startGlosa, continueGlosa, pauseGlosa } = useGlosaActions();

  const [deletingCaseId, setDeletingCaseId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteIsPending, setDeleteIsPending] = useState(false);

  const [filterRef, setFilterRef] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [filterSucursal, setFilterSucursal] = useState("");
  const [filterEstatus, setFilterEstatus] = useState("");
  const [filterEjecutivo, setFilterEjecutivo] = useState("");
  const [filterGlosador, setFilterGlosador] = useState("");
  const [sortAsc, setSortAsc] = useState(false);

  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const { data: cases = [], isLoading } = useGlosaCases({
    ref: filterRef,
    tipo: filterTipo,
    sucursal: filterSucursal,
    estatus: filterEstatus,
    ejecutivo: filterEjecutivo,
    glosador: filterGlosador,
    sortAsc,
  });

  const hasFilters = filterRef || filterTipo || filterSucursal || filterEstatus || filterEjecutivo || filterGlosador;

  const clearFilters = () => {
    setFilterRef(""); setFilterTipo(""); setFilterSucursal("");
    setFilterEstatus(""); setFilterEjecutivo(""); setFilterGlosador("");
  };

  const canGlosar = (c: any) =>
    c.status === "ASIGNADO" && !c.first_started_at &&
    (!isAdmin || c.assigned_glosador_user_id === user?.id);

  const canContinue = (c: any) =>
    ["PAUSADO", "REABIERTO", "DOCUMENTO_PENDIENTE"].includes(c.status) ||
    (c.status === "ASIGNADO" && c.first_started_at);

  const canPause = (c: any) =>
    ["EN_REVISION", "EN_CORRECCION"].includes(c.status) && c.has_active_session;

  const canCorrecciones = (c: any) =>
    ["CORRECCION_PENDIENTE", "EN_CORRECCION"].includes(c.status) && c.findings_count > 0;

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Mis Revisiones</h1>
            <p className="text-sm text-muted-foreground">
              Bandeja de trabajo — {cases.length} trámite{cases.length !== 1 ? "s" : ""}
              {cases.filter(c => c.has_active_session).length > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-primary font-medium">
                  · {cases.filter(c => c.has_active_session).length} activo
                </span>
              )}
            </p>
          </div>
        </div>

        {cases.some((c) => c.has_active_session) && (
          <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/[0.04] px-4 py-2.5">
            <span className="inline-flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium text-primary">Revisión en curso</span>
            <Button
              size="sm"
              variant="outline"
              className="ml-auto h-7 text-xs gap-1.5"
              onClick={() => {
                const activeCase = cases.find((c) => c.has_active_session);
                if (activeCase) pauseGlosa.mutate(activeCase.id);
              }}
              disabled={pauseGlosa.isPending}
            >
              <Pause className="h-3 w-3" /> Pausar
            </Button>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] max-w-xs">
            <Input
              placeholder="Buscar referencia..."
              value={filterRef}
              onChange={(e) => setFilterRef(e.target.value)}
              className="h-9"
            />
          </div>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="h-9 w-[130px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos</SelectItem>
              {(documentTypes.data ?? []).map((d) => (
                <SelectItem key={d.id} value={d.code}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterSucursal} onValueChange={setFilterSucursal}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Sucursal" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todas</SelectItem>
              {(branches.data ?? []).map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterEstatus} onValueChange={setFilterEstatus}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Estatus" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos</SelectItem>
              {Object.entries(statusConfig)
                .filter(([k]) => isAdmin || !["APROBADO", "RECHAZADO"].includes(k))
                .map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Select value={filterEjecutivo} onValueChange={setFilterEjecutivo}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Ejecutivo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos</SelectItem>
              {(executives.data ?? []).map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isAdmin && (
            <Select value={filterGlosador} onValueChange={setFilterGlosador}>
              <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Glosador" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todos</SelectItem>
                {glosadores.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline" size="sm"
            className="h-9 gap-1.5 text-xs"
            onClick={() => setSortAsc(!sortAsc)}
            title={sortAsc ? "Más recientes primero" : "Más antiguos primero"}
          >
            {sortAsc ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8l4-4 4 4"/><path d="M7 4v16"/><path d="M11 12h4"/><path d="M11 16h7"/><path d="M11 20h10"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 16l4 4 4-4"/><path d="M7 20V4"/><path d="M11 4h4"/><path d="M11 8h7"/><path d="M11 12h10"/></svg>
            )}
            {sortAsc ? "Más antiguos" : "Más recientes"}
          </Button>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1.5 text-xs text-muted-foreground">
              <FilterX className="h-3.5 w-3.5" /> Limpiar
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-card shadow-sm overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-semibold">Referencia</TableHead>
                <TableHead className="text-xs font-semibold">Ejecutivo</TableHead>
                 <TableHead className="text-xs font-semibold">Sucursal</TableHead>
                 <TableHead className="text-xs font-semibold">Cliente</TableHead>
                <TableHead className="text-xs font-semibold">Tipo</TableHead>
                <TableHead className="text-xs font-semibold">Estatus</TableHead>
                <TableHead className="text-xs font-semibold text-center">Obs.</TableHead>
                <TableHead className="text-xs font-semibold text-center">Rev.</TableHead>
                <TableHead className="text-xs font-semibold text-center">Calif.</TableHead>
                <TableHead className="text-xs font-semibold">Tiempo</TableHead>
                <TableHead className="text-xs font-semibold">Asignado</TableHead>
                <TableHead className="text-xs font-semibold text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-16 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <span className="text-sm">Cargando trámites...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : cases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Inbox className="h-10 w-10 opacity-30" />
                      <p className="text-sm font-medium">
                        {hasFilters ? "Sin resultados para los filtros aplicados" : "Sin trámites asignados"}
                      </p>
                      <p className="text-xs">
                        {hasFilters ? "Intenta ajustar los filtros o limpiar la búsqueda" : "Los trámites aparecerán aquí cuando se asignen"}
                      </p>
                      {hasFilters && (
                        <Button variant="outline" size="sm" onClick={clearFilters} className="mt-2 h-7 text-xs">
                          Limpiar filtros
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                cases.map((c) => (
                  <TableRow
                    key={c.id}
                    className={`cursor-pointer transition-colors ${
                      selectedCaseId === c.id
                        ? "bg-primary/[0.08] border-l-2 border-l-primary"
                        : c.has_active_session
                        ? "bg-primary/[0.06] border-l-2 border-l-primary"
                        : "hover:bg-muted/30"
                    }`}
                    onClick={() => setSelectedCaseId(c.id)}
                  >
                    <TableCell className="font-medium text-sm">
                      {c.reference ?? c.internal_folio}
                      {c.has_active_session && (
                        <span className="ml-1.5 inline-flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.executives?.nombre ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.branches?.nombre ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.clients?.nombre ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[11px] font-normal">
                        {c.document_types?.name ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">{c.findings_count || "—"}</TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">{c.rounds_count || "—"}</TableCell>
                    <TableCell className="text-center">
                      {c.score_total != null ? (
                        <span className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-bold border ${
                          Number(c.score_total) >= 85
                            ? "bg-success/10 text-success border-success/20"
                            : Number(c.score_total) >= 70
                            ? "bg-warning/10 text-warning border-warning/20"
                            : "bg-destructive/10 text-destructive border-destructive/20"
                        }`}>
                          {c.score_total}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatTime(c.active_time_seconds)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {c.assigned_at
                        ? new Date(c.assigned_at).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })
                          + " " + new Date(c.assigned_at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {canGlosar(c) && (
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 text-xs gap-1"
                            onClick={async () => {
                              await startGlosa.mutateAsync(c.id);
                              setSelectedCaseId(c.id);
                            }}
                            disabled={startGlosa.isPending}
                          >
                            <Play className="h-3 w-3" /> Glosar
                          </Button>
                        )}
                        {canContinue(c) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={async () => {
                              await continueGlosa.mutateAsync(c.id);
                              setSelectedCaseId(c.id);
                            }}
                            disabled={continueGlosa.isPending}
                          >
                            <RotateCcw className="h-3 w-3" /> Continuar
                          </Button>
                        )}
                        {canPause(c) && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 text-xs gap-1"
                            onClick={() => pauseGlosa.mutate(c.id)}
                            disabled={pauseGlosa.isPending}
                          >
                            <Pause className="h-3 w-3" /> Pausar
                          </Button>
                        )}
                        {canCorrecciones(c) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs gap-1"
                            onClick={() => setSelectedCaseId(c.id)}
                          >
                            <ClipboardCheck className="h-3 w-3" /> Correcciones
                          </Button>
                        )}
                        {isAdmin && !["APROBADO", "RECHAZADO"].includes(c.status) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive/60 hover:text-destructive"
                            title="Eliminar trámite"
                            onClick={(e) => { e.stopPropagation(); setDeletingCaseId(c.id); setDeleteReason(""); }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Review Detail Sheet */}
      <Sheet open={!!selectedCaseId} onOpenChange={async (open) => {
        if (!open) {
          const activeCase = cases.find(c => c.id === selectedCaseId && c.has_active_session);
          if (activeCase) {
            await pauseGlosa.mutateAsync(activeCase.id).catch(() => {});
          }
          setSelectedCaseId(null);
        }
      }}>
        <SheetContent side="right" className="w-full sm:max-w-3xl lg:max-w-4xl p-0 overflow-y-auto">
          {selectedCaseId && (
            <ReviewDetailPanel caseId={selectedCaseId} onClose={() => setSelectedCaseId(null)} />
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={!!deletingCaseId} onOpenChange={(v) => !v && setDeletingCaseId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">Eliminar trámite</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              El trámite quedará en el Histórico Admin con toda su información.
              Su referencia podrá reutilizarse. Esta acción queda registrada.
            </p>
            <div className="space-y-1.5">
              <Label>Motivo de eliminación</Label>
              <Textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Describe el motivo..."
                rows={2}
                className="text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingCaseId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteIsPending}
              onClick={async () => {
                if (!deletingCaseId) return;
                setDeleteIsPending(true);
                try {
                  await supabase.from("review_cases").update({
                    deleted_at: new Date().toISOString(),
                    deleted_by: user?.id,
                    delete_reason: deleteReason || null,
                    updated_by: user?.id,
                  }).eq("id", deletingCaseId);
                  await supabase.from("audit_logs").insert({
                    action: "ADMIN_DELETE_CASE",
                    table_name: "review_cases",
                    record_id: deletingCaseId,
                    user_id: user?.id,
                    details: { reason: deleteReason },
                  });
                  toast.success("Trámite eliminado");
                  setDeletingCaseId(null);
                  queryClient.invalidateQueries({ queryKey: ["glosa-cases"] });
                  queryClient.invalidateQueries({ queryKey: ["deleted-cases-full"] });
                } catch {
                  toast.error("Error al eliminar");
                } finally {
                  setDeleteIsPending(false);
                }
              }}
            >
              {deleteIsPending ? "Eliminando..." : "Eliminar trámite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Glosa;
