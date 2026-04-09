import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCatalogs } from "@/hooks/useCatalogs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge, statusConfig } from "@/components/StatusBadge";
import { FilterX, Inbox } from "lucide-react";

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
          glosador:profiles!review_cases_glosador_profile_fkey(nombre)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const hasFilters = filterRef || filterTipo || filterSucursal || filterEstatus;

  const clearFilters = () => {
    setFilterRef(""); setFilterTipo(""); setFilterSucursal(""); setFilterEstatus("");
  };

  const filtered = cases.filter(c => {
    if (filterTipo && filterTipo !== "_all" && c.document_types?.code !== filterTipo) return false;
    if (filterSucursal && filterSucursal !== "_all" && c.branch_id !== filterSucursal) return false;
    if (filterEstatus && filterEstatus !== "_all" && c.status !== filterEstatus) return false;
    if (filterRef && !c.reference?.toLowerCase().includes(filterRef.toLowerCase()) && !c.internal_folio.toLowerCase().includes(filterRef.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-xs">
          <Input placeholder="Buscar referencia / folio..." value={filterRef} onChange={e => setFilterRef(e.target.value)} className="h-9" />
        </div>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos los tipos</SelectItem>
            {(documentTypes.data ?? []).map(d => (
              <SelectItem key={d.id} value={d.code}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterSucursal} onValueChange={setFilterSucursal}>
          <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Sucursal" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todas</SelectItem>
            {(branches.data ?? []).map(b => (
              <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterEstatus} onValueChange={setFilterEstatus}>
          <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Estatus" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos</SelectItem>
            {Object.entries(statusConfig).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1.5 text-xs text-muted-foreground">
            <FilterX className="h-3.5 w-3.5" /> Limpiar
          </Button>
        )}
      </div>

      <div className="rounded-lg border bg-card shadow-sm overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="text-xs font-semibold">Folio</TableHead>
              <TableHead className="text-xs font-semibold">Referencia</TableHead>
              <TableHead className="text-xs font-semibold">Tipo</TableHead>
              <TableHead className="text-xs font-semibold">Sucursal</TableHead>
              <TableHead className="text-xs font-semibold">Ejecutivo</TableHead>
              <TableHead className="text-xs font-semibold">Glosador</TableHead>
              <TableHead className="text-xs font-semibold">Fecha Alta</TableHead>
              <TableHead className="text-xs font-semibold">Estatus</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span className="text-sm">Cargando trámites...</span>
                </div>
              </TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-16">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Inbox className="h-10 w-10 opacity-30" />
                  <p className="text-sm font-medium">{hasFilters ? "Sin resultados" : "Sin trámites registrados"}</p>
                  <p className="text-xs">{hasFilters ? "Ajusta los filtros o limpia la búsqueda" : "Los trámites aparecerán aquí al registrarlos"}</p>
                  {hasFilters && (
                    <Button variant="outline" size="sm" onClick={clearFilters} className="mt-2 h-7 text-xs">Limpiar filtros</Button>
                  )}
                </div>
              </TableCell></TableRow>
            ) : (
              filtered.map(c => (
                <TableRow key={c.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-xs text-muted-foreground">{c.internal_folio}</TableCell>
                  <TableCell className="font-medium text-sm">{c.reference ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[11px] font-normal">
                      {c.document_types?.name ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.branches?.nombre ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.executives?.nombre ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.glosador?.nombre ?? "Sin asignar"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(c.registered_at).toLocaleDateString("es-MX")}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
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
