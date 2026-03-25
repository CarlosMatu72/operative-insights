import { useReviewRounds, useFindingHistories, useRejectionHistories, useReviewFindings } from "@/hooks/useReviewDetail";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RotateCcw, History } from "lucide-react";

interface HistoryTabsProps {
  caseId: string;
  onReopen?: (rejectionId: string) => void;
}

const roundTypeLabels: Record<string, string> = {
  initial: "Inicial",
  correction: "Corrección",
};

const resultStatusConfig: Record<string, { label: string; className: string }> = {
  APPROVED: { label: "Aprobado", className: "bg-success/10 text-success border-success/20" },
  REJECTED: { label: "Rechazado", className: "bg-destructive/10 text-destructive border-destructive/20" },
  WITH_OBSERVATIONS: { label: "Con observaciones", className: "bg-warning/10 text-warning border-warning/20" },
};

const findingStatusConfig: Record<string, { label: string; className: string }> = {
  open: { label: "Abierta", className: "bg-warning/10 text-warning border-warning/20" },
  closed: { label: "Cerrada", className: "bg-muted text-muted-foreground border-border" },
  CORRECTED: { label: "Corregido", className: "bg-success/10 text-success border-success/20" },
  NOT_CORRECTED: { label: "No corregido", className: "bg-destructive/10 text-destructive border-destructive/20" },
  PARTIALLY_CORRECTED: { label: "Parcialmente", className: "bg-warning/10 text-warning border-warning/20" },
};

export function HistoryTabs({ caseId, onReopen }: HistoryTabsProps) {
  const { isAdmin } = useAuth();
  const { data: rounds = [] } = useReviewRounds(caseId);
  const { data: findings = [] } = useReviewFindings(caseId);
  const { data: findingHistories = [] } = useFindingHistories(caseId);
  const { data: rejections = [] } = useRejectionHistories(caseId);

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }) : "—";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold tracking-tight flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          Historial del Trámite
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="rounds" className="w-full">
          <TabsList className="mb-3 h-8">
            <TabsTrigger value="rounds" className="text-xs h-7">Revisiones ({rounds.length})</TabsTrigger>
            <TabsTrigger value="findings" className="text-xs h-7">Errores ({findings.length})</TabsTrigger>
            <TabsTrigger value="rejections" className="text-xs h-7">Rechazos ({rejections.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="rounds">
            <div className="rounded-lg border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-12 text-xs font-semibold">#</TableHead>
                    <TableHead className="text-xs font-semibold">Tipo</TableHead>
                    <TableHead className="text-xs font-semibold">Inicio</TableHead>
                    <TableHead className="text-xs font-semibold">Cierre</TableHead>
                    <TableHead className="text-xs font-semibold">Resultado</TableHead>
                    <TableHead className="text-xs font-semibold">Glosador</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rounds.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">Sin revisiones registradas</TableCell></TableRow>
                  ) : rounds.map((r) => {
                    const rc = resultStatusConfig[r.result_status ?? ""];
                    return (
                      <TableRow key={r.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs">{r.round_number}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {roundTypeLabels[r.round_type ?? ""] ?? r.round_type ?? "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmtDate(r.started_at)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmtDate(r.closed_at)}</TableCell>
                        <TableCell>
                          {rc ? (
                            <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${rc.className}`}>
                              {rc.label}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">En curso</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{(r as any).reviewer?.nombre ?? "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="findings">
            <div className="rounded-lg border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs font-semibold">Error</TableHead>
                    <TableHead className="text-xs font-semibold w-28">Estado</TableHead>
                    <TableHead className="text-xs font-semibold">Evolución</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {findings.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-6">Sin errores registrados</TableCell></TableRow>
                  ) : findings.map((f) => {
                    const histories = findingHistories.filter((h) => h.finding_id === f.id);
                    const sc = findingStatusConfig[f.current_status];
                    return (
                      <TableRow key={f.id} className="hover:bg-muted/30">
                        <TableCell className="text-sm">
                          <div>
                            <span className="font-medium">{(f as any).observation_errors?.descripcion ?? "—"}</span>
                            {f.comentario_inicial && (
                              <p className="text-xs text-muted-foreground italic mt-0.5">{f.comentario_inicial}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {sc ? (
                            <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${sc.className}`}>
                              {sc.label}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">{f.current_status}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {histories.length === 0 ? (
                            <span className="text-xs text-muted-foreground">Sin cambios</span>
                          ) : (
                            <div className="space-y-1">
                              {histories.map((h) => {
                                const hsc = findingStatusConfig[h.new_status];
                                return (
                                  <div key={h.id} className="text-[11px] flex items-center gap-1.5">
                                    <span className="text-muted-foreground">{fmtDate(h.created_at)}</span>
                                    <span className="text-muted-foreground">→</span>
                                    {hsc ? (
                                      <span className={`inline-flex items-center rounded-sm border px-1.5 py-px text-[10px] font-medium ${hsc.className}`}>
                                        {hsc.label}
                                      </span>
                                    ) : (
                                      <span className="font-medium">{h.new_status}</span>
                                    )}
                                    {h.comment && <span className="text-muted-foreground italic">({h.comment})</span>}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="rejections">
            <div className="rounded-lg border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs font-semibold">Fecha</TableHead>
                    <TableHead className="text-xs font-semibold">Motivo</TableHead>
                    <TableHead className="text-xs font-semibold">Comentario</TableHead>
                    <TableHead className="text-xs font-semibold">Rechazado por</TableHead>
                    <TableHead className="text-xs font-semibold">Reabierto</TableHead>
                    {isAdmin && onReopen && <TableHead className="w-20 text-xs font-semibold" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rejections.length === 0 ? (
                    <TableRow><TableCell colSpan={isAdmin && onReopen ? 6 : 5} className="text-center text-sm text-muted-foreground py-6">Sin rechazos</TableCell></TableRow>
                  ) : rejections.map((r) => (
                    <TableRow key={r.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs text-muted-foreground">{fmtDate(r.rejected_at)}</TableCell>
                      <TableCell className="text-sm font-medium">{r.motivo}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.comentario ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{(r as any).rejector?.nombre ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.reopened_at ? `${fmtDate(r.reopened_at)} — ${(r as any).reopener?.nombre ?? ""}` : "—"}
                      </TableCell>
                      {isAdmin && onReopen && (
                        <TableCell>
                          {!r.reopened_at && (
                            <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={() => onReopen(r.id)}>
                              <RotateCcw className="h-3 w-3" /> Reabrir
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
