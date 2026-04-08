import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertCircle, Search } from "lucide-react";
import { toast } from "sonner";

export function ObservationErrorsConfig() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [codigoError, setCodigoError] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [severidad, setSeveridad] = useState("");
  const [descuentoPuntos, setDescuentoPuntos] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: errors = [], isLoading } = useQuery({
    queryKey: ["observation-errors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("observation_errors")
        .select("*")
        .order("descripcion", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filteredErrors = errors.filter((error) => {
    const search = searchTerm.toLowerCase();
    return (
      error.descripcion.toLowerCase().includes(search) ||
      (error.codigo_error && error.codigo_error.toLowerCase().includes(search)) ||
      (error.severidad && error.severidad.toLowerCase().includes(search))
    );
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!descripcion.trim()) throw new Error("La descripción es requerida");
      const payload: { descripcion: string; codigo_error: string | null; severidad: string | null; descuento_puntos: number | null; activo: boolean; category_id: null; subcategory_id: null } = {
        descripcion: descripcion.trim(),
        codigo_error: codigoError.trim() || null,
        severidad: severidad.trim() || null,
        descuento_puntos: descuentoPuntos ? parseFloat(descuentoPuntos) : null,
        activo: true,
        category_id: null,
        subcategory_id: null,
      };
      if (editId) {
        const { error } = await supabase.from("observation_errors").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("observation_errors").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["observation-errors"] });
      queryClient.invalidateQueries({ queryKey: ["obs-errors"] });
      queryClient.invalidateQueries({ queryKey: ["obs-errors-all"] });
      toast.success(editId ? "Error actualizado" : "Error creado");
      closeDialog();
    },
    onError: (err: Error) => toast.error(err.message || "Error al guardar"),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase.from("observation_errors").update({ activo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["observation-errors"] });
      queryClient.invalidateQueries({ queryKey: ["obs-errors"] });
    },
  });

  const closeDialog = () => {
    setOpen(false);
    setEditId(null);
    setCodigoError("");
    setDescripcion("");
    setSeveridad("");
    setDescuentoPuntos("");
  };

  const openEdit = (error: { id: string; codigo_error: string | null; descripcion: string; severidad: string | null; descuento_puntos: number | null }) => {
    setEditId(error.id);
    setCodigoError(error.codigo_error || "");
    setDescripcion(error.descripcion);
    setSeveridad(error.severidad || "");
    setDescuentoPuntos(error.descuento_puntos ? String(error.descuento_puntos) : "");
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Catálogo de Errores</h3>
          <p className="text-xs text-muted-foreground">Lista completa de errores detectables en las revisiones</p>
        </div>
        <Button size="sm" onClick={() => { setEditId(null); setCodigoError(""); setDescripcion(""); setSeveridad(""); setDescuentoPuntos(""); setOpen(true); }} className="gap-1">
          <Plus className="h-3.5 w-3.5" /> Nuevo Error
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por descripción, código o severidad..." value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
      </div>

      <div className="rounded-lg border bg-card shadow-sm overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Código</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="w-24">Severidad</TableHead>
              <TableHead className="w-24">Descuento</TableHead>
              <TableHead className="w-16">Activo</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : filteredErrors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <AlertCircle className="h-6 w-6 opacity-30" />
                    <p>{searchTerm ? `No se encontraron errores con "${searchTerm}"` : "No hay errores registrados"}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredErrors.map((error) => (
                <TableRow key={error.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {error.codigo_error ? <Badge variant="outline" className="text-[10px]">{error.codigo_error}</Badge> : "—"}
                  </TableCell>
                  <TableCell className="text-sm max-w-[300px] truncate">{error.descripcion}</TableCell>
                  <TableCell>
                    {error.severidad ? <Badge variant="secondary" className="text-[10px]">{error.severidad}</Badge> : "—"}
                  </TableCell>
                  <TableCell>
                    {error.descuento_puntos ? (
                      <span className="text-sm font-medium text-destructive">-{error.descuento_puntos} pts</span>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    <Switch checked={error.activo} onCheckedChange={(checked) => toggleActive.mutate({ id: error.id, activo: checked })} />
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(error)}>Editar</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {filteredErrors.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          Mostrando {filteredErrors.length} de {errors.length} errores
        </p>
      )}

      <Dialog open={open} onOpenChange={(v) => !v && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar" : "Nuevo"} Error de Observación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Código (opcional)</Label>
                <Input value={codigoError} onChange={(e) => setCodigoError(e.target.value)} placeholder="Ej: E001" />
              </div>
              <div className="space-y-2">
                <Label>Severidad (opcional)</Label>
                <Input value={severidad} onChange={(e) => setSeveridad(e.target.value)} placeholder="Ej: Alta" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descripción del Error *</Label>
              <Textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej: RFC incorrecto o inválido" rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Descuento de Puntos (opcional)</Label>
              <Input type="number" step="0.1" min="0" value={descuentoPuntos}
                onChange={(e) => setDescuentoPuntos(e.target.value)} placeholder="Ej: 5" />
              <p className="text-xs text-muted-foreground">Penalización directa en la calificación final</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!descripcion.trim() || saveMutation.isPending}>
              {saveMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
