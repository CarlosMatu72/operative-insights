import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, GripVertical } from "lucide-react";
import { toast } from "sonner";

export function ObservationCategoriesConfig() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [orden, setOrden] = useState("0");

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["obs-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("observation_categories")
        .select("*")
        .order("orden", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { nombre: nombre.trim(), orden: Number(orden) };
      if (editId) {
        const { error } = await supabase.from("observation_categories").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("observation_categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["obs-categories"] });
      toast.success(editId ? "Categoría actualizada" : "Categoría creada");
      closeDialog();
    },
    onError: (err: any) => toast.error(err.message || "Error al guardar"),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase.from("observation_categories").update({ activo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["obs-categories"] }),
  });

  const closeDialog = () => {
    setOpen(false);
    setEditId(null);
    setNombre("");
    setOrden("0");
  };

  const openEdit = (cat: any) => {
    setEditId(cat.id);
    setNombre(cat.nombre);
    setOrden(String(cat.orden));
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Categorías de Observación</h3>
          <p className="text-xs text-muted-foreground">Agrupaciones principales para clasificar hallazgos</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)} className="gap-1">
          <Plus className="h-3.5 w-3.5" /> Nueva Categoría
        </Button>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Orden</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="w-20">Activa</TableHead>
              <TableHead className="w-20">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : categories.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Sin categorías registradas</TableCell></TableRow>
            ) : (
              categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
                      {cat.orden}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-sm">{cat.nombre}</TableCell>
                  <TableCell>
                    <Switch
                      checked={cat.activo}
                      onCheckedChange={(checked) => toggleActive.mutate({ id: cat.id, activo: checked })}
                    />
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(cat)}>Editar</Button>
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
            <DialogTitle>{editId ? "Editar" : "Nueva"} Categoría</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Documentación" />
            </div>
            <div className="space-y-2">
              <Label>Orden</Label>
              <Input type="number" value={orden} onChange={(e) => setOrden(e.target.value)} placeholder="0" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!nombre.trim() || saveMutation.isPending}>
              {saveMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
