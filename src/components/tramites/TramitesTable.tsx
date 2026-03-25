import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCatalogs } from "@/hooks/useCatalogs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const statusColors: Record<string, string> = {
  REGISTRADO: "bg-muted text-muted-foreground",
  ASIGNADO: "bg-accent text-accent-foreground",
  EN_REVISION: "bg-primary/15 text-primary",
  PAUSADO: "bg-warning/15 text-warning",
  CORRECCION_PENDIENTE: "bg-warning/15 text-warning",
  EN_CORRECCION: "bg-warning/15 text-warning",
  APROBADO: "bg-success/15 text-success",
  RECHAZADO: "bg-destructive/15 text-destructive",
  REABIERTO: "bg-accent text-accent-foreground",
};

const statusLabels: Record<string, string> = {
  REGISTRADO: "Registrado",
  ASIGNADO: "Asignado",
  EN_REVISION: "En Revisión",
  PAUSADO: "Pausado",
  CORRECCION_PENDIENTE: "Corrección Pend.",
  EN_CORRECCION: "En Corrección",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
  REABIERTO: "Reabierto",
};

export function TramitesTable() {
  const { branches, documentTypes } = useCatalogs();
  const [filterTipo, setFilterTipo] = useState("");
  const [filterSucursal, setFilterSucursal] = useState("");
  const [filterEstatus, setFilterEstatus] = useState("");
  const [filterRef, setFilterRef] = useState("");

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ["review-cases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("review_cases")
        .select(`
          *,
          document_types(code, name),
          branches(nombre, clave),
          executives(nombre),
          glosador:profiles!review_cases_assigned_glosador_user_id_fkey(nombre)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = cases.filter(c => {
    if (filterTipo && filterTipo !== "_all" && (c.document_types as any)?.code !== filterTipo) return false;
    if (filterSucursal && filterSucursal !== "_all" && c.branch_id !== filterSucursal) return false;
    if (filterEstatus && filterEstatus !== "_all" && c.status !== filterEstatus) return false;
    if (filterRef && !c.reference?.toLowerCase().includes(filterRef.toLowerCase()) && !c.internal_folio.toLowerCase().includes(filterRef.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Input placeholder="Buscar referencia / folio..." value={filterRef} onChange={e => setFilterRef(e.target.value)} />
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos los tipos</SelectItem>
            {(documentTypes.data ?? []).map(d => (
              <SelectItem key={d.id} value={d.code}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterSucursal} onValueChange={setFilterSucursal}>
          <SelectTrigger><SelectValue placeholder="Sucursal" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todas las sucursales</SelectItem>
            {(branches.data ?? []).map(b => (
              <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterEstatus} onValueChange={setFilterEstatus}>
          <SelectTrigger><SelectValue placeholder="Estatus" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos los estatus</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Folio</TableHead>
              <TableHead>Referencia</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Sucursal</TableHead>
              <TableHead>Ejecutivo</TableHead>
              <TableHead>Glosador</TableHead>
              <TableHead>Fecha Alta</TableHead>
              <TableHead>Estatus</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Sin trámites registrados</TableCell></TableRow>
            ) : (
              filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.internal_folio}</TableCell>
                  <TableCell className="font-medium">{c.reference ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {(c.document_types as any)?.name ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell>{(c.branches as any)?.nombre ?? "—"}</TableCell>
                  <TableCell>{(c.executives as any)?.nombre ?? "—"}</TableCell>
                  <TableCell>{(c.glosador as any)?.nombre ?? "Sin asignar"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(c.registered_at).toLocaleDateString("es-MX")}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[c.status] ?? ""}`}>
                      {statusLabels[c.status] ?? c.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground text-right">
        {filtered.length} de {cases.length} trámites
      </p>
    </div>
  );
}
