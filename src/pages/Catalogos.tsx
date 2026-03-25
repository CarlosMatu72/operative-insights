import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Plus, Building2, UsersRound, Key, Package } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type CatalogType = "branches" | "clients" | "executives" | "customs_keys";

interface CatalogConfig {
  key: CatalogType;
  label: string;
  icon: React.ElementType;
  fields: { name: string; label: string; type?: string; required?: boolean }[];
  nameField: string;
}

const catalogs: CatalogConfig[] = [
  {
    key: "branches",
    label: "Sucursales",
    icon: Building2,
    fields: [
      { name: "nombre", label: "Nombre", required: true },
      { name: "clave", label: "Clave", required: true },
    ],
    nameField: "nombre",
  },
  {
    key: "clients",
    label: "Clientes",
    icon: UsersRound,
    fields: [{ name: "nombre", label: "Nombre", required: true }],
    nameField: "nombre",
  },
  {
    key: "executives",
    label: "Ejecutivos",
    icon: UsersRound,
    fields: [{ name: "nombre", label: "Nombre", required: true }],
    nameField: "nombre",
  },
  {
    key: "customs_keys",
    label: "Claves Aduaneras",
    icon: Key,
    fields: [
      { name: "clave", label: "Clave", required: true },
      { name: "descripcion", label: "Descripción" },
    ],
    nameField: "clave",
  },
];

function CatalogTab({ config }: { config: CatalogConfig }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [editId, setEditId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();

  const { data: items = [], isLoading } = useQuery({
    queryKey: [config.key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(config.key)
        .select("*")
        .order("id");
      if (error) throw error;
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, any>) => {
      if (editId) {
        const { error } = await supabase
          .from(config.key)
          .update(values)
          .eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(config.key).insert(values as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [config.key] });
      toast.success(editId ? "Registro actualizado" : "Registro creado");
      closeDialog();
    },
    onError: (err: any) => toast.error(err.message || "Error al guardar"),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase
        .from(config.key)
        .update({ activo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [config.key] });
    },
  });

  const closeDialog = () => {
    setOpen(false);
    setFormData({});
    setEditId(null);
  };

  const openEdit = (item: any) => {
    const data: Record<string, string> = {};
    config.fields.forEach((f) => (data[f.name] = item[f.name] ?? ""));
    setFormData(data);
    setEditId(item.id);
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Agregar
          </Button>
        </div>
      )}

      <div className="rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              {config.fields.map((f) => (
                <TableHead key={f.name}>{f.label}</TableHead>
              ))}
              <TableHead>Activo</TableHead>
              {isAdmin && <TableHead>Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={config.fields.length + 2} className="text-center py-8 text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={config.fields.length + 2} className="text-center py-8 text-muted-foreground">
                  Sin registros
                </TableCell>
              </TableRow>
            ) : (
              items.map((item: any) => (
                <TableRow key={item.id}>
                  {config.fields.map((f) => (
                    <TableCell key={f.name}>{item[f.name] ?? "—"}</TableCell>
                  ))}
                  <TableCell>
                    {isAdmin ? (
                      <Switch
                        checked={item.activo}
                        onCheckedChange={(checked) =>
                          toggleActive.mutate({ id: item.id, activo: checked })
                        }
                      />
                    ) : (
                      <span className={item.activo ? "text-success" : "text-destructive"}>
                        {item.activo ? "Sí" : "No"}
                      </span>
                    )}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>
                        Editar
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={(v) => !v && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editId ? "Editar" : "Agregar"} {config.label.toLowerCase()}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {config.fields.map((f) => (
              <div key={f.name} className="space-y-2">
                <Label>{f.label}</Label>
                <Input
                  value={formData[f.name] ?? ""}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, [f.name]: e.target.value }))
                  }
                  required={f.required}
                />
              </div>
            ))}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const Catalogos = () => {
  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Catálogos</h1>
          <p className="text-sm text-muted-foreground">
            Gestión de catálogos del sistema
          </p>
        </div>

        <Tabs defaultValue="branches">
          <TabsList>
            {catalogs.map((c) => (
              <TabsTrigger key={c.key} value={c.key} className="gap-2">
                <c.icon className="h-4 w-4" />
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {catalogs.map((c) => (
            <TabsContent key={c.key} value={c.key}>
              <CatalogTab config={c} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Catalogos;
