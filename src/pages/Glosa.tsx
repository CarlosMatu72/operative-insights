import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useGlosaCases, useGlosaActions } from "@/hooks/useGlosaPanel";
import { useCatalogs } from "@/hooks/useCatalogs";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge, statusConfig } from "@/components/StatusBadge";
import { Play, Pause, RotateCcw, FileDown, ClipboardCheck, Eye } from "lucide-react";

function formatTime(seconds: number): string {
  if (seconds === 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const Glosa = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { branches, documentTypes, executives, glosadores } = useCatalogs();
  const { startGlosa, continueGlosa, pauseGlosa } = useGlosaActions();

  const [filterRef, setFilterRef] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [filterSucursal, setFilterSucursal] = useState("");
  const [filterEstatus, setFilterEstatus] = useState("");
  const [filterEjecutivo, setFilterEjecutivo] = useState("");
  const [filterGlosador, setFilterGlosador] = useState("");

  const { data: cases = [], isLoading } = useGlosaCases({
    ref: filterRef,
    tipo: filterTipo,
    sucursal: filterSucursal,
    estatus: filterEstatus,
    ejecutivo: filterEjecutivo,
    glosador: filterGlosador,
  });

  const canGlosar = (c: any) =>
    c.status === "ASIGNADO" && !c.first_started_at;

  const canContinue = (c: any) =>
    ["PAUSADO", "REABIERTO"].includes(c.status) || 
    (c.status === "ASIGNADO" && c.first_started_at);

  const canPause = (c: any) =>
    ["EN_REVISION", "EN_CORRECCION"].includes(c.status) && c.has_active_session;

  const canCorrecciones = (c: any) =>
    ["CORRECCION_PENDIENTE", "EN_CORRECCION"].includes(c.status) && c.findings_count > 0;

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Panel de Glosa</h1>
          <p className="text-sm text-muted-foreground">
            Bandeja de trabajo — revisiones asignadas
          </p>
        </div>

        {/* Filters */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <Input
            placeholder="Buscar referencia..."
            value={filterRef}
            onChange={(e) => setFilterRef(e.target.value)}
            className="h-9"
          />
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos</SelectItem>
              {(documentTypes.data ?? []).map((d) => (
                <SelectItem key={d.id} value={d.code}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterSucursal} onValueChange={setFilterSucursal}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Sucursal" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todas</SelectItem>
              {(branches.data ?? []).map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterEstatus} onValueChange={setFilterEstatus}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Estatus" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos</SelectItem>
              {Object.entries(statusConfig).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterEjecutivo} onValueChange={setFilterEjecutivo}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Ejecutivo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos</SelectItem>
              {(executives.data ?? []).map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isAdmin && (
            <Select value={filterGlosador} onValueChange={setFilterGlosador}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Glosador" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todos</SelectItem>
                {(glosadores.data ?? []).map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                <TableHead className="text-xs font-semibold">Tipo</TableHead>
                <TableHead className="text-xs font-semibold">Estatus</TableHead>
                <TableHead className="text-xs font-semibold text-center">Obs.</TableHead>
                <TableHead className="text-xs font-semibold text-center">Rev.</TableHead>
                <TableHead className="text-xs font-semibold text-center">Calif.</TableHead>
                <TableHead className="text-xs font-semibold">Tiempo</TableHead>
                <TableHead className="text-xs font-semibold">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Cargando...
                    </div>
                  </TableCell>
                </TableRow>
              ) : cases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                    Sin trámites asignados
                  </TableCell>
                </TableRow>
              ) : (
                cases.map((c) => (
                  <TableRow key={c.id} className={c.has_active_session ? "bg-primary/[0.03]" : "hover:bg-muted/30"}>
                    <TableCell className="font-medium text-sm">
                      {c.reference ?? c.internal_folio}
                      {c.has_active_session && (
                        <span className="ml-1.5 inline-flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.executives?.nombre ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.branches?.nombre ?? "—"}</TableCell>
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
                    <TableCell className="text-center text-sm font-medium">
                      {c.score_total != null ? c.score_total : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatTime(c.active_time_seconds)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {canGlosar(c) && (
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 text-xs gap-1"
                            onClick={async () => {
                              await startGlosa.mutateAsync(c.id);
                              navigate(`/glosa/${c.id}`);
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
                              navigate(`/glosa/${c.id}`);
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
                        {c.status === "EN_REVISION" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs gap-1"
                            onClick={() => navigate(`/glosa/${c.id}`)}
                          >
                            <Eye className="h-3 w-3" /> Abrir
                          </Button>
                        )}
                        {canCorrecciones(c) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs gap-1"
                            onClick={() => navigate(`/glosa/${c.id}`)}
                          >
                            <ClipboardCheck className="h-3 w-3" /> Correcciones
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => navigate(`/glosa/${c.id}`)}
                        >
                          <FileDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <p className="text-xs text-muted-foreground text-right">
          {cases.length} trámites
        </p>
      </div>
    </AppLayout>
  );
};

export default Glosa;
