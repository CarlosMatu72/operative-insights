import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCatalogs } from "@/hooks/useCatalogs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    <div className="rounded-xl border bg-card shadow-sm overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Referencia</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Sucursal</TableHead>
            <TableHead>Ejecutivo</TableHead>
            <TableHead>Glosador</TableHead>
            <TableHead>Fecha registro</TableHead>
            <TableHead>Estatus</TableHead>
            <TableHead className="w-24">Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Cargando...</TableCell>
            </TableRow>
          ) : cases.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Sin trámites pendientes</TableCell>
            </TableRow>
          ) : (
            cases.map((c, i) => (
              <TableRow key={c.id}>
                <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="font-medium">{c.reference ?? c.internal_folio}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {(c.document_types as any)?.name ?? "—"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{(c.branches as any)?.nombre ?? "—"}</TableCell>
                <TableCell className="text-sm">{(c.executives as any)?.nombre ?? "—"}</TableCell>
                <TableCell className="text-sm">
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
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    c.status === "ASIGNADO" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {c.status === "ASIGNADO" ? "Asignado" : "Registrado"}
                  </span>
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
