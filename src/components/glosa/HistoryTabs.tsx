import { useReviewRounds, useFindingHistories, useRejectionHistories, useReviewFindings } from "@/hooks/useReviewDetail";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RotateCcw } from "lucide-react";

interface HistoryTabsProps {
  caseId: string;
  onReopen?: (rejectionId: string) => void;
}

const roundTypeLabels: Record<string, string> = {
  initial: "Inicial",
  correction: "Corrección",
};

const statusBadge = (s: string | null) => {
  const colors: Record<string, string> = {
    APPROVED: "bg-success/15 text-success",
    REJECTED: "bg-destructive/15 text-destructive",
    WITH_OBSERVATIONS: "bg-warning/15 text-warning",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${colors[s ?? ""] ?? "bg-muted text-muted-foreground"}`}>
      {s ?? "En curso"}
    </span>
  );
};

const findingStatusColors: Record<string, string> = {
  open: "bg-warning/15 text-warning",
  closed: "bg-muted text-muted-foreground",
  CORRECTED: "bg-success/15 text-success",
  NOT_CORRECTED: "bg-destructive/15 text-destructive",
  PARTIALLY_CORRECTED: "bg-warning/15 text-warning",
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
        <CardTitle className="text-base">Historial</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="rounds" className="w-full">
          <TabsList className="mb-3">
            <TabsTrigger value="rounds" className="text-xs">Revisiones ({rounds.length})</TabsTrigger>
            <TabsTrigger value="findings" className="text-xs">Errores ({findings.length})</TabsTrigger>
            <TabsTrigger value="rejections" className="text-xs">Rechazos ({rejections.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="rounds">
            <div className="rounded-lg border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Fecha inicio</TableHead>
                    <TableHead>Fecha cierre</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead>Glosador</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rounds.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-4">Sin revisiones</TableCell></TableRow>
                  ) : rounds.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.round_number}</TableCell>
                      <TableCell className="text-sm">
                        <Badge variant="outline" className="text-[10px]">
                          {roundTypeLabels[r.round_type ?? ""] ?? r.round_type ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtDate(r.started_at)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtDate(r.closed_at)}</TableCell>
                      <TableCell>{statusBadge(r.result_status)}</TableCell>
                      <TableCell className="text-sm">{(r as any).reviewer?.nombre ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="findings">
            <div className="rounded-lg border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Error</TableHead>
                    <TableHead>Estado actual</TableHead>
                    <TableHead>Evolución</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {findings.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-4">Sin errores</TableCell></TableRow>
                  ) : findings.map((f) => {
                    const histories = findingHistories.filter((h) => h.finding_id === f.id);
                    return (
                      <TableRow key={f.id}>
                        <TableCell className="text-sm">
                          <div>
                            <span className="font-medium">{(f as any).observation_errors?.descripcion ?? "—"}</span>
                            {f.comentario_inicial && (
                              <p className="text-xs text-muted-foreground italic mt-0.5">{f.comentario_inicial}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${findingStatusColors[f.current_status] ?? ""}`}>
                            {f.current_status}
                          </span>
                        </TableCell>
                        <TableCell>
                          {histories.length === 0 ? (
                            <span className="text-xs text-muted-foreground">Sin cambios</span>
                          ) : (
                            <div className="space-y-1">
                              {histories.map((h) => (
                                <div key={h.id} className="text-[11px] flex items-center gap-1.5">
                                  <span className="text-muted-foreground">{fmtDate(h.created_at)}</span>
                                  <span className="text-muted-foreground">→</span>
                                  <span className={`font-medium ${findingStatusColors[h.new_status] ? "" : ""}`}>{h.new_status}</span>
                                  {h.comment && <span className="text-muted-foreground italic">({h.comment})</span>}
                                  <span className="text-muted-foreground">— {(h as any).reviewer?.nombre ?? ""}</span>
                                </div>
                              ))}
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
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Comentario</TableHead>
                    <TableHead>Rechazado por</TableHead>
                    <TableHead>Reabierto por</TableHead>
                    <TableHead>Fecha reapertura</TableHead>
                    {isAdmin && onReopen && <TableHead className="w-20" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rejections.length === 0 ? (
                    <TableRow><TableCell colSpan={isAdmin && onReopen ? 7 : 6} className="text-center text-sm text-muted-foreground py-4">Sin rechazos</TableCell></TableRow>
                  ) : rejections.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs text-muted-foreground">{fmtDate(r.rejected_at)}</TableCell>
                      <TableCell className="text-sm font-medium">{r.motivo}</TableCell>
                      <TableCell className="text-sm">{r.comentario ?? "—"}</TableCell>
                      <TableCell className="text-sm">{(r as any).rejector?.nombre ?? "—"}</TableCell>
                      <TableCell className="text-sm">{(r as any).reopener?.nombre ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtDate(r.reopened_at)}</TableCell>
                      {isAdmin && onReopen && (
                        <TableCell>
                          {!r.reopened_at && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-[10px] gap-1"
                              onClick={() => onReopen(r.id)}
                            >
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
