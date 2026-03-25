import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface UserWithRole {
  id: string;
  nombre: string;
  correo: string;
  activo: boolean;
  avatar_url: string | null;
  created_at: string;
  role: string | null;
}

const Usuarios = () => {
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<string>("glosa");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role");

      const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r.role]));
      return (profiles ?? []).map((p) => ({
        ...p,
        role: roleMap.get(p.id) ?? null,
      })) as UserWithRole[];
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ activo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuario actualizado");
    },
    onError: () => toast.error("Error al actualizar usuario"),
  });

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Use edge function to create user (admin-only, server-side)
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: { nombre, correo, password, role: rol },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Usuario creado exitosamente");
      setOpen(false);
      setNombre("");
      setCorreo("");
      setPassword("");
      setRol("glosa");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    } catch (err: any) {
      toast.error(err.message || "Error al crear usuario");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Usuarios</h1>
            <p className="text-sm text-muted-foreground">
              Gestión de usuarios del sistema
            </p>
          </div>
          <Button onClick={() => setOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Nuevo usuario
          </Button>
        </div>

        <div className="rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Activo</TableHead>
                <TableHead>Creado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No hay usuarios registrados
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.nombre}</TableCell>
                    <TableCell>{u.correo}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                        {u.role === "admin" ? "Admin" : "Glosa"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={u.activo}
                        onCheckedChange={(checked) =>
                          toggleActive.mutate({ id: u.id, activo: checked })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(u.created_at).toLocaleDateString("es-MX")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear nuevo usuario</DialogTitle>
            </DialogHeader>
            <form onSubmit={createUser} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre completo</Label>
                <Input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Correo electrónico</Label>
                <Input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Contraseña</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={rol} onValueChange={setRol}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="glosa">Glosador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Creando..." : "Crear usuario"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default Usuarios;
