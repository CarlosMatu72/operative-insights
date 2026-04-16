import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCatalogs } from "@/hooks/useCatalogs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { UserPlus, Trash2 } from "lucide-react";
import { useState } from "react";

interface ReviewCaseWithJoins {
  id: string;
  reference: string | null;
  internal_folio: string;
  status: string;
  registered_at: string;
  assigned_glosador_user_id: string | null;
  branch_id: string | null;
  document_types: { code: string; name: string } | null;
  branches: { nombre: string } | null;
  executives: { nombre: string } | null;
  glosador: { nombre: string } | null;
}

interface PendientesTableProps {
  cases: ReviewCaseWithJoins[];
  isLoading: boolean;
}

export function PendientesTable({ cases, isLoading }: PendientesTableProps) {
  const { user, isAdmin } = useAuth();
  const { glosadores } = useCatalogs();
  const queryClient = useQueryClient();
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deletePending, setDeletePending] = useState(false);

  const assignMutation = useMutation({
    mutationFn: async ({ caseId, glosadorId }: { caseId: string; glosadorId: string }) => {
      const { error } = await supabase
        .from("review_cases")
        .update({
          assigned_glosador_user_id: glosadorId,
          assigned_at: new Date().toISOString(),
          status: "ASIGNADO" as const,
          updated_by: user?.id,
        })
        .eq("id", caseId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Glosador asignado correctamente");
      queryClient.invalidateQueries({ queryKey: ["pendientes"] });
      queryClient.invalidateQueries({ queryKey: ["glosadores-with-stats"] });
      queryClient.invalidateQueries({ queryKey: ["tablero-kpis"] });
      setAssigningId(null);
    },
    onError: () => toast.error("Error al asignar glosador"),
  });

  const selfAssign = useMutation({
    mutationFn: async (caseId: string) => {
      const { error } = await supabase
        .from("review_cases")
        .update({
          assigned_glosador_user_id: user?.id,
          assigned_at: new Date().toISOString(),
          status: "ASIGNADO" as const,
          updated_by: user?.id,
        })
        .eq("id", caseId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Trámite autoasignado");
      queryClient.invalidateQueries({ queryKey: ["pendientes"] });
      queryClient.invalidateQueries({ queryKey: ["glosadores-with-stats"] });
      queryClient.invalidateQueries({ queryKey: ["tablero-kpis"] });
    },
    onError: () => toast.error("Error al autoasignarse"),
  });

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="w-12 text-xs font-semibold">#</TableHead>
            <TableHead className="text-xs font-semibold">Referencia</TableHead>
            <TableHead className="text-xs font-semibold">Tipo</TableHead>
            <TableHead className="text-xs font-semibold">Sucursal</TableHead>
            <TableHead className="text-xs font-semibold">Ejecutivo</TableHead>
            <TableHead className="text-xs font-semibold">Glosador</TableHead>
            <TableHead className="text-xs font-semibold">Registro</TableHead>
            <TableHead className="text-xs font-semibold">Estatus</TableHead>
            <TableHead className="w-24 text-xs font-semibold">Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Cargando...
                </div>
              </TableCell>
            </TableRow>
          ) : cases.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">Sin trámites pendientes</TableCell>
            </TableRow>
          ) : (
            cases.map((c, i) => (
              <TableRow key={c.id} className="hover:bg-muted/30">
                <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="font-medium text-sm">{c.reference ?? c.internal_folio}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[11px] font-normal">
                    {c.document_types?.name ?? "—"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.branches?.nombre ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.executives?.nombre ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {assigningId === c.id && isAdmin ? (
                    <Select
                      onValueChange={(val) => {
                        assignMutation.mutate({ caseId: c.id, glosadorId: val });
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs w-36">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(glosadores.data ?? []).map((g) => (
                          <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    c.glosador?.nombre ?? "Sin asignar"
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(c.registered_at).toLocaleDateString("es-MX", { 
                    day: "2-digit", month: "short", year: "2-digit"
                  })} {new Date(c.registered_at).toLocaleTimeString("es-MX", { 
                    hour: "2-digit", minute: "2-digit" 
                  })}
                </TableCell>
                <TableCell>
                  <StatusBadge status={c.status} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {isAdmin && (
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => { setDeletingId(c.id); setDeleteReason(""); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {isAdmin && assigningId !== c.id && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs"
                        onClick={() => setAssigningId(c.id)}>
                        <UserPlus className="h-3.5 w-3.5 mr-1" /> Asignar
                      </Button>
                    )}
                    {!isAdmin && !c.assigned_glosador_user_id && (
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => selfAssign.mutate(c.id)} disabled={selfAssign.isPending}>
                        Tomar
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

    <Dialog open={!!deletingId} onOpenChange={(v) => !v && setDeletingId(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar trámite</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            El trámite pasará al Histórico Admin. Su referencia podrá reutilizarse.
            Esta acción queda registrada con tu usuario.
          </p>
          <div className="space-y-1.5">
            <Label>Motivo de eliminación</Label>
            <Textarea value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Describe el motivo..." rows={2} className="text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeletingId(null)}>Cancelar</Button>
          <Button variant="destructive" disabled={deletePending}
            onClick={async () => {
              if (!deletingId) return;
              setDeletePending(true);
              try {
                await supabase.from("review_cases").update({
                  deleted_at: new Date().toISOString(),
                  deleted_by: user?.id,
                  delete_reason: deleteReason || null,
                  updated_by: user?.id,
                }).eq("id", deletingId);
                await supabase.from("audit_logs").insert({
                  action: "ADMIN_DELETE_CASE",
                  table_name: "review_cases",
                  record_id: deletingId,
                  user_id: user?.id,
                  details: { reason: deleteReason },
                });
                toast.success("Trámite eliminado");
                setDeletingId(null);
                queryClient.invalidateQueries({ queryKey: ["pendientes"] });
                queryClient.invalidateQueries({ queryKey: ["tablero-kpis"] });
                queryClient.invalidateQueries({ queryKey: ["deleted-cases-full"] });
              } catch {
                toast.error("Error al eliminar");
              } finally {
                setDeletePending(false);
              }
            }}>
            {deletePending ? "Eliminando..." : "Eliminar trámite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
