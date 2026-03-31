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

const SEVERIDADES = [
  { value: "leve", label: "Leve", color: "bg-muted text-muted-foreground" },
  { value: "moderada", label: "Moderada", color: "bg-warning/15 text-warning" },
  { value: "grave", label: "Grave", color: "bg-destructive/15 text-destructive" },
  { value: "critica", label: "Crítica", color: "bg-destructive text-destructive-foreground" },
];

export function ObservationErrorsConfig() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [codigoError, setCodigoError] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [severidad, setSeveridad] = useState("leve");
  const [descuentoPuntos, setDescuentoPuntos] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("_all_");

  const { data: categories = [] } = useQuery({
    queryKey: ["obs-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("observation_categories").select("*").eq("activo", true).order("orden");
      return data ?? [];
    },
  });

  const { data: allSubcategories = [] } = useQuery({
    queryKey: ["obs-subcategories-active"],
    queryFn: async () => {
      const { data } = await supabase.from("observation_subcategories").select("*").eq("activo", true).order("orden");
      return data ?? [];
    },
  });

  const filteredSubcats = allSubcategories.filter((s: any) => s.category_id === categoryId);

  const { data: errors = [], isLoading } = useQuery({
    queryKey: ["obs-errors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("observation_errors")
        .select("*, observation_categories(nombre), observation_subcategories(nombre)")
        .order("codigo_error");
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = filterCategoryId === "_all_"
    ? errors
    : errors.filter((e: any) => e.category_id === filterCategoryId);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        descripcion: descripcion.trim(),
        codigo_error: codigoError.trim() || null,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        severidad,
        descuento_puntos: descuentoPuntos ? Number(descuentoPuntos) : null,
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
      queryClient.invalidateQueries({ queryKey: ["obs-errors"] });
      queryClient.invalidateQueries({ queryKey: ["obs-errors-all"] });
      toast.success(editId ? "Error actualizado" : "Error registrado");
      closeDialog();
    },
    onError: (err: any) => toast.error(err.message || "Error al guardar"),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase.from("observation_errors").update({ activo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["obs-errors"] });
      queryClient.invalidateQueries({ queryKey: ["obs-errors-all"] });
    },
  });

  const closeDialog = () => {
    setOpen(false);
    setEditId(null);
    setDescripcion("");
    setCodigoError("");
    setCategoryId("");
    setSubcategoryId("");
    setSeveridad("leve");
    setDescuentoPuntos("");
  };

  const openEdit = (err: any) => {
    setEditId(err.id);
    setDescripcion(err.descripcion);
    setCodigoError(err.codigo_error ?? "");
    setCategoryId(err.category_id);
    setSubcategoryId(err.subcategory_id);
    setSeveridad(err.severidad ?? "leve");
    setDescuentoPuntos(err.descuento_puntos != null ? String(err.descuento_puntos) : "");
    setOpen(true);
  };

  const openNew = () => {
    if (filterCategoryId !== "_all_") setCategoryId(filterCategoryId);
    setOpen(true);
  };

  const sevBadge = (sev: string | null) => {
    const s = SEVERIDADES.find((x) => x.value === sev);
    return s ? <Badge className={`text-[10px] ${s.color}`}>{s.label}</Badge> : <span className="text-xs text-muted-foreground">—</span>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Errores de Observación</h3>
          <p className="text-xs text-muted-foreground">Catálogo de errores detectables durante la revisión</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
            <SelectTrigger className="h-8 text-xs w-[180px]"><SelectValue placeholder="Filtrar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all_">Todas las categorías</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={openNew} disabled={categories.length === 0} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Nuevo Error
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card shadow-sm overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Código</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Subcategoría</TableHead>
              <TableHead className="w-24">Severidad</TableHead>
              <TableHead className="w-20">Puntos</TableHead>
              <TableHead className="w-16">Activo</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Sin errores registrados</TableCell></TableRow>
            ) : (
              filtered.map((err: any) => (
                <TableRow key={err.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{err.codigo_error ?? "—"}</TableCell>
                  <TableCell className="text-sm max-w-[300px] truncate">{err.descripcion}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{err.observation_categories?.nombre ?? "—"}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{err.observation_subcategories?.nombre ?? "—"}</TableCell>
                  <TableCell>{sevBadge(err.severidad)}</TableCell>
                  <TableCell className="text-sm font-medium text-destructive">
                    {err.descuento_puntos != null ? `-${err.descuento_puntos}` : "—"}
                  </TableCell>
                  <TableCell>
                    <Switch checked={err.activo} onCheckedChange={(checked) => toggleActive.mutate({ id: err.id, activo: checked })} />
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(err)}>Editar</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={(v) => !v && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar" : "Nuevo"} Error de Observación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setSubcategoryId(""); }}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subcategoría</Label>
                <Select value={subcategoryId} onValueChange={setSubcategoryId} disabled={!categoryId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {filteredSubcats.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descripción del error</Label>
              <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Descripción detallada del error" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Código</Label>
                <Input value={codigoError} onChange={(e) => setCodigoError(e.target.value)} placeholder="E-001" />
              </div>
              <div className="space-y-2">
                <Label>Severidad</Label>
                <Select value={severidad} onValueChange={setSeveridad}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEVERIDADES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Descuento (pts)</Label>
                <Input type="number" value={descuentoPuntos} onChange={(e) => setDescuentoPuntos(e.target.value)} placeholder="5" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!descripcion.trim() || !categoryId || !subcategoryId || saveMutation.isPending}
            >
              {saveMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
