import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export function ItemRangesConfig() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nombreRango, setNombreRango] = useState("");
  const [minPartidas, setMinPartidas] = useState("");
  const [maxPartidas, setMaxPartidas] = useState("");

  const { data: ranges = [], isLoading } = useQuery({
    queryKey: ["item-ranges"],
    queryFn: async () => {
      const { data, error } = await supabase.from("item_ranges").select("*").order("min_partidas");
      if (error) throw error;
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const min = parseInt(minPartidas);
      const max = parseInt(maxPartidas);
      if (isNaN(min) || isNaN(max)) throw new Error("Los valores deben ser números");
      if (min > max) throw new Error("El mínimo no puede ser mayor que el máximo");
      if (min < 0) throw new Error("Los valores no pueden ser negativos");

      const overlapping = ranges.find((r) => {
        if (editId && r.id === editId) return false;
        return (min >= r.min_partidas && min <= r.max_partidas) ||
          (max >= r.min_partidas && max <= r.max_partidas) ||
          (min <= r.min_partidas && max >= r.max_partidas);
      });
      if (overlapping) {
        throw new Error(`El rango ${min}-${max} se solapa con "${overlapping.nombre_rango}" (${overlapping.min_partidas}-${overlapping.max_partidas})`);
      }

      const payload = { nombre_rango: nombreRango.trim(), min_partidas: min, max_partidas: max, activo: true };
      if (editId) {
        const { error } = await supabase.from("item_ranges").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("item_ranges").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item-ranges"] });
      toast.success(editId ? "Rango actualizado" : "Rango creado");
      closeDialog();
    },
    onError: (err: any) => toast.error(err.message || "Error al guardar"),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase.from("item_ranges").update({ activo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["item-ranges"] }),
  });

  const closeDialog = () => { setOpen(false); setEditId(null); setNombreRango(""); setMinPartidas(""); setMaxPartidas(""); };

  const openEdit = (r: any) => {
    setEditId(r.id);
    setNombreRango(r.nombre_rango);
    setMinPartidas(String(r.min_partidas));
    setMaxPartidas(String(r.max_partidas));
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Rangos de Partidas</h3>
          <p className="text-sm text-muted-foreground">Clasificación automática por número de partidas</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo Rango
        </Button>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre del Rango</TableHead>
              <TableHead>Mínimo</TableHead>
              <TableHead>Máximo</TableHead>
              <TableHead>Activo</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Cargando...</TableCell>
              </TableRow>
            ) : ranges.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <AlertCircle className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">No hay rangos configurados</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              ranges.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.nombre_rango}</TableCell>
                  <TableCell><Badge variant="outline">{r.min_partidas}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{r.max_partidas === 9999 ? "∞" : r.max_partidas}</Badge></TableCell>
                  <TableCell>
                    <Switch checked={r.activo} onCheckedChange={(checked) => toggleActive.mutate({ id: r.id, activo: checked })} />
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>Editar</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={(v) => !v && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Editar" : "Nuevo"} Rango de Partidas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre del Rango *</Label>
              <Input value={nombreRango} onChange={(e) => setNombreRango(e.target.value)} placeholder="Ej: Bajo" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mínimo *</Label>
                <Input type="number" value={minPartidas} onChange={(e) => setMinPartidas(e.target.value)} placeholder="1" />
              </div>
              <div className="space-y-2">
                <Label>Máximo *</Label>
                <Input type="number" value={maxPartidas} onChange={(e) => setMaxPartidas(e.target.value)} placeholder="5" />
                <p className="text-xs text-muted-foreground">Usa 9999 para "infinito" (31+)</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!nombreRango.trim() || !minPartidas || !maxPartidas || saveMutation.isPending}>
              {saveMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
