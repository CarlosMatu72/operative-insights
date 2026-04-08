import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export function ObservationSubcategoriesConfig() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [orden, setOrden] = useState("0");
  const [filterCategoryId, setFilterCategoryId] = useState("_all_");

  const { data: categories = [] } = useQuery({
    queryKey: ["obs-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("observation_categories").select("*").eq("activo", true).order("orden");
      return data ?? [];
    },
  });

  const { data: subcategories = [], isLoading } = useQuery({
    queryKey: ["obs-subcategories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("observation_subcategories")
        .select("*, observation_categories(nombre)")
        .order("orden", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = filterCategoryId === "_all_"
    ? subcategories
    : subcategories.filter((s) => s.category_id === filterCategoryId);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { nombre: nombre.trim(), category_id: categoryId, orden: Number(orden) };
      if (editId) {
        const { error } = await supabase.from("observation_subcategories").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("observation_subcategories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["obs-subcategories"] });
      toast.success(editId ? "Subcategoría actualizada" : "Subcategoría creada");
      closeDialog();
    },
    onError: (err: Error) => toast.error(err.message || "Error al guardar"),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase.from("observation_subcategories").update({ activo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["obs-subcategories"] }),
  });

  const closeDialog = () => {
    setOpen(false);
    setEditId(null);
    setNombre("");
    setCategoryId("");
    setOrden("0");
  };

  const openEdit = (sub: { id: string; nombre: string; category_id: string; orden: number }) => {
    setEditId(sub.id);
    setNombre(sub.nombre);
    setCategoryId(sub.category_id);
    setOrden(String(sub.orden));
    setOpen(true);
  };

  const openNew = () => {
    setCategoryId(filterCategoryId !== "_all_" ? filterCategoryId : (categories[0]?.id ?? ""));
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Subcategorías</h3>
          <p className="text-xs text-muted-foreground">Subdivisiones dentro de cada categoría</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
            <SelectTrigger className="h-8 text-xs w-[180px]"><SelectValue placeholder="Filtrar categoría" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all_">Todas las categorías</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={openNew} disabled={categories.length === 0} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Nueva
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Orden</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="w-20">Activa</TableHead>
              <TableHead className="w-20">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Sin subcategorías</TableCell></TableRow>
            ) : (
              filtered.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="text-sm text-muted-foreground">{sub.orden}</TableCell>
                  <TableCell className="font-medium text-sm">{sub.nombre}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{sub.observation_categories?.nombre ?? "—"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Switch checked={sub.activo} onCheckedChange={(checked) => toggleActive.mutate({ id: sub.id, activo: checked })} />
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(sub)}>Editar</Button>
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
            <DialogTitle>{editId ? "Editar" : "Nueva"} Subcategoría</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Datos generales" />
            </div>
            <div className="space-y-2">
              <Label>Orden</Label>
              <Input type="number" value={orden} onChange={(e) => setOrden(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!nombre.trim() || !categoryId || saveMutation.isPending}>
              {saveMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
