import { useState, useRef } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, KeyRound, Shield, Camera } from "lucide-react";
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
  const [createOpen, setCreateOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<string>("glosa");
  const [saving, setSaving] = useState(false);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState("");
  const [resetUserName, setResetUserName] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [roleOpen, setRoleOpen] = useState(false);
  const [roleUserId, setRoleUserId] = useState("");
  const [roleUserName, setRoleUserName] = useState("");
  const [newRole, setNewRole] = useState("");

  const [uploadingAvatar, setUploadingAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarTargetUserId, setAvatarTargetUserId] = useState<string | null>(null);

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

  const adminAction = async (body: any) => {
    const { data, error } = await supabase.functions.invoke("admin-create-user", { body });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const toggleActive = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      await adminAction({ action: "toggle_active", user_id: id, activo });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Estado actualizado");
    },
    onError: (e: any) => toast.error(e.message || "Error al actualizar"),
  });

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminAction({ action: "create_user", nombre, correo, password, role: rol });
      toast.success("Usuario creado exitosamente");
      setCreateOpen(false);
      setNombre(""); setCorreo(""); setPassword(""); setRol("glosa");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    } catch (err: any) {
      toast.error(err.message || "Error al crear usuario");
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    try {
      await adminAction({ action: "reset_password", user_id: resetUserId, new_password: newPassword });
      toast.success("Contraseña actualizada");
      setResetOpen(false);
      setNewPassword("");
    } catch (err: any) {
      toast.error(err.message || "Error al resetear contraseña");
    }
  };

  const handleChangeRole = async () => {
    try {
      await adminAction({ action: "change_role", user_id: roleUserId, new_role: newRole });
      toast.success("Rol actualizado");
      setRoleOpen(false);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    } catch (err: any) {
      toast.error(err.message || "Error al cambiar rol");
    }
  };

  const handleAvatarClick = (userId: string) => {
    setAvatarTargetUserId(userId);
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !avatarTargetUserId) return;

    if (!file.type.startsWith("image/")) {
      toast.error("El archivo debe ser una imagen");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no debe superar 5MB");
      return;
    }

    setUploadingAvatar(avatarTargetUserId);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${avatarTargetUserId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { cacheControl: "3600", upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("id", avatarTargetUserId);
      if (updateError) throw updateError;

      toast.success("Foto actualizada");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setUploadingAvatar(null);
      setAvatarTargetUserId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const getInitials = (name: string) =>
    name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Usuarios</h1>
            <p className="text-sm text-muted-foreground">Gestión de usuarios del sistema — solo administradores</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
            <UserPlus className="h-4 w-4" /> Nuevo usuario
          </Button>
        </div>

        {/* Hidden file input for avatar upload */}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

        <div className="rounded-lg border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-14">Foto</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Activo</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Cargando...</TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No hay usuarios</TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="relative group cursor-pointer" onClick={() => handleAvatarClick(u.id)}>
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={u.avatar_url ?? undefined} alt={u.nombre} />
                          <AvatarFallback className="text-xs bg-muted">{getInitials(u.nombre)}</AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Camera className="h-3.5 w-3.5 text-background" />
                        </div>
                        {uploadingAvatar === u.id && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/60">
                            <div className="h-4 w-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-sm">{u.nombre}</TableCell>
                    <TableCell className="text-sm">{u.correo}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === "admin" ? "default" : "secondary"} className="text-xs">
                        {u.role === "admin" ? "Admin" : "Glosa"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={u.activo}
                        onCheckedChange={(checked) => toggleActive.mutate({ id: u.id, activo: checked })}
                      />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString("es-MX")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"
                          onClick={() => { setResetUserId(u.id); setResetUserName(u.nombre); setNewPassword(""); setResetOpen(true); }}>
                          <KeyRound className="h-3 w-3" /> Contraseña
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"
                          onClick={() => { setRoleUserId(u.id); setRoleUserName(u.nombre); setNewRole(u.role ?? "glosa"); setRoleOpen(true); }}>
                          <Shield className="h-3 w-3" /> Rol
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Create user dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Crear nuevo usuario</DialogTitle></DialogHeader>
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="glosa">Glosador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving}>{saving ? "Creando..." : "Crear usuario"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Reset password dialog */}
        <Dialog open={resetOpen} onOpenChange={setResetOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Resetear contraseña — {resetUserName}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nueva contraseña</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} placeholder="Mínimo 6 caracteres" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResetOpen(false)}>Cancelar</Button>
              <Button onClick={handleResetPassword}>Actualizar contraseña</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Change role dialog */}
        <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Cambiar rol — {roleUserName}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nuevo rol</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="glosa">Glosador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRoleOpen(false)}>Cancelar</Button>
              <Button onClick={handleChangeRole}>Guardar rol</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default Usuarios;
