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
import { Plus, Settings, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { ClassificationRulesConfig } from "./ClassificationRulesConfig";

export function ClassificationFeaturesConfig() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  const { data: features = [], isLoading } = useQuery({
    queryKey: ["classification-features"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classification_features")
        .select("*")
        .order("nombre");
      if (error) throw error;
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!nombre.trim()) throw new Error("El nombre es requerido");
      const payload = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        activo: true,
      };
      if (editId) {
        const { error } = await supabase.from("classification_features").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("classification_features").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classification-features"] });
      toast.success(editId ? "Característica actualizada" : "Característica creada");
      closeDialog();
    },
    onError: (err: any) => toast.error(err.message || "Error al guardar"),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase.from("classification_features").update({ activo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["classification-features"] }),
  });

  const closeDialog = () => {
    setOpen(false);
    setEditId(null);
    setNombre("");
    setDescripcion("");
  };

  const openEdit = (f: any) => {
    setEditId(f.id);
    setNombre(f.nombre);
    setDescripcion(f.descripcion || "");
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Características de Clasificación</h3>
          <p className="text-sm text-muted-foreground">Configura las características que se marcan en cada revisión</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nueva Característica
        </Button>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Activa</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Cargando...</TableCell>
              </TableRow>
            ) : features.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <AlertCircle className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">No hay características configuradas</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              features.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">{f.descripcion || "—"}</TableCell>
                  <TableCell>
                    <Switch checked={f.activo} onCheckedChange={(checked) => toggleActive.mutate({ id: f.id, activo: checked })} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(f)}>Editar</Button>
                      <Button size="sm" variant="outline" onClick={() => setSelectedFeature(f.id)} className="gap-1">
                        <Settings className="h-3 w-3" /> Reglas
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedFeature && (
        <ClassificationRulesConfig
          featureId={selectedFeature}
          featureName={features.find((f) => f.id === selectedFeature)?.nombre || ""}
          onClose={() => setSelectedFeature(null)}
        />
      )}

      <Dialog open={open} onOpenChange={(v) => !v && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Editar" : "Nueva"} Característica</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: NOM's" />
            </div>
            <div className="space-y-2">
              <Label>Descripción (opcional)</Label>
              <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej: Normas Oficiales Mexicanas" />
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
