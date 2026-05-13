import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export function ReferencePrefixesConfig() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [prefix, setPrefix] = useState("");
  const [branchId, setBranchId] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [activo, setActivo] = useState(true);
  const [search, setSearch] = useState("");

  const { data: branches = [] } = useQuery({
    queryKey: ["branches-for-prefixes"],
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("*").eq("activo", true).order("nombre");
      return data ?? [];
    },
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["reference-prefixes-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("reference_prefixes")
        .select("*, branches(nombre, clave)")
        .order("prefix");
      return data ?? [];
    },
  });

  const closeDialog = () => {
    setOpen(false);
    setEditId(null);
    setPrefix("");
    setBranchId("");
    setDescripcion("");
    setActivo(true);
  };

  const openEdit = (item: any) => {
    setEditId(item.id);
    setPrefix(item.prefix ?? "");
    setBranchId(item.branch_id ?? "");
    setDescripcion(item.descripcion ?? "");
    setActivo(item.activo ?? true);
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!prefix.trim()) throw new Error("El prefijo es requerido");
      if (!branchId) throw new Error("La sucursal es requerida");
      const payload = {
        prefix: prefix.trim().toUpperCase(),
        branch_id: branchId,
        descripcion: descripcion.trim() || null,
        activo,
      };
      if (editId) {
        const { error } = await supabase.from("reference_prefixes").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("reference_prefixes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reference-prefixes-all"] });
      queryClient.invalidateQueries({ queryKey: ["reference-prefixes"] });
      toast.success(editId ? "Prefijo actualizado" : "Prefijo creado");
      closeDialog();
    },
    onError: (err: Error) => toast.error(err.message || "Error al guardar"),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase.from("reference_prefixes").update({ activo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reference-prefixes-all"] });
      queryClient.invalidateQueries({ queryKey: ["reference-prefixes"] });
    },
  });

  const filtered = items.filter((it: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      String(it.prefix ?? "").toLowerCase().includes(q) ||
      String(it.descripcion ?? "").toLowerCase().includes(q) ||
      String((it.branches as any)?.nombre ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar prefijo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Prefijo
          </Button>
        )}
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Prefijo</TableHead>
              <TableHead>Sucursal</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Activo</TableHead>
              {isAdmin && <TableHead>Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 5 : 4} className="text-center py-8 text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 5 : 4} className="text-center py-8 text-muted-foreground">
                  {search ? "Sin resultados" : "Sin prefijos configurados"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.prefix}</TableCell>
                  <TableCell>
                    {(item.branches as any)?.nombre ?? "—"}
                    {(item.branches as any)?.clave && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({(item.branches as any).clave})
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{item.descripcion ?? "—"}</TableCell>
                  <TableCell>
                    {isAdmin ? (
                      <Switch
                        checked={item.activo}
                        onCheckedChange={(checked) => toggleActive.mutate({ id: item.id, activo: checked })}
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
            <DialogTitle>{editId ? "Editar prefijo" : "Nuevo prefijo"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Prefijo *</Label>
              <Input
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                placeholder="Ej: REM-"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Sucursal vinculada *</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar sucursal" /></SelectTrigger>
                <SelectContent>
                  {branches.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{b.nombre} ({b.clave})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="prefix-activo" className="cursor-pointer">Activo</Label>
              <Switch id="prefix-activo" checked={activo} onCheckedChange={setActivo} />
            </div>
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
