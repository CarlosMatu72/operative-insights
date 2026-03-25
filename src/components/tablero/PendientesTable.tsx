import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCatalogs } from "@/hooks/useCatalogs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { useState } from "react";

interface PendientesTableProps {
  cases: any[];
  isLoading: boolean;
}

export function PendientesTable({ cases, isLoading }: PendientesTableProps) {
  const { user, isAdmin } = useAuth();
  const { glosadores } = useCatalogs();
  const queryClient = useQueryClient();
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const assignMutation = useMutation({
    mutationFn: async ({ caseId, glosadorId }: { caseId: string; glosadorId: string }) => {
      const { error } = await supabase
        .from("review_cases")
        .update({
          assigned_glosador_user_id: glosadorId,
          assigned_at: new Date().toISOString(),
          status: "ASIGNADO" as any,
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
          status: "ASIGNADO" as any,
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
            <TableHead className="text-xs font-semibold">Fecha registro</TableHead>
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
                    {(c.document_types as any)?.name ?? "—"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{(c.branches as any)?.nombre ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{(c.executives as any)?.nombre ?? "—"}</TableCell>
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
                    (c.glosador as any)?.nombre ?? "Sin asignar"
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(c.registered_at).toLocaleDateString("es-MX")}
                </TableCell>
                <TableCell>
                  <StatusBadge status={c.status} />
                </TableCell>
                <TableCell>
                  {isAdmin && assigningId !== c.id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => setAssigningId(c.id)}
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-1" />
                      Asignar
                    </Button>
                  )}
                  {!isAdmin && !c.assigned_glosador_user_id && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => selfAssign.mutate(c.id)}
                      disabled={selfAssign.isPending}
                    >
                      Tomar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
