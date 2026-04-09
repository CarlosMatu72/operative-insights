import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, BadgeCheck, AlertTriangle, Eye, EyeOff, History, Settings, Search, RefreshCw, UserX, Filter } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { es } from "date-fns/locale";

// ── Types ──────────────────────────────────────────────
interface Gafete {
  id: string;
  nombre_completo: string;
  departamento_id: string | null;
  usuario_anam: string | null;
  password_anam: string | null;
  doc_identificacion: boolean;
  doc_constancia_fiscal: boolean;
  doc_responsiva_firmada: boolean;
  doc_acuse_cita: boolean;
  fecha_cita: string | null;
  fecha_entrega: string | null;
  fecha_vigencia: string | null;
  estatus: "activo" | "baja" | "renovado";
  activo: boolean;
  notas: string | null;
  created_at: string;
  gafete_departamentos?: { nombre: string } | null;
}

interface GafeteHistorial {
  id: string;
  gafete_id: string;
  estatus_anterior: string | null;
  estatus_nuevo: string;
  fecha_vigencia_anterior: string | null;
  fecha_vigencia_nueva: string | null;
  notas: string | null;
  created_at: string;
}

interface Departamento { id: string; nombre: string; activo: boolean; }

const EMPTY_FORM = {
  nombre_completo: "", departamento_id: "", usuario_anam: "", password_anam: "",
  doc_identificacion: false, doc_constancia_fiscal: false, doc_responsiva_firmada: false, doc_acuse_cita: false,
  fecha_cita: "", fecha_entrega: "", fecha_vigencia: "", estatus: "activo" as "activo" | "baja" | "renovado", activo: true, notas: "",
};

// ── Status config ──────────────────────────────────────
const estatusConfig: Record<string, { label: string; className: string }> = {
  activo:   { label: "Activo",   className: "bg-success/10 text-success border-success/20" },
  baja:     { label: "Baja",     className: "bg-muted text-muted-foreground border-border" },
  renovado: { label: "Renovado", className: "bg-primary/10 text-primary border-primary/20" },
};

function getVigenciaStatus(fechaVigencia: string | null): { label: string; className: string; dias: number } | null {
  if (!fechaVigencia) return null;
  const dias = differenceInDays(parseISO(fechaVigencia), new Date());
  if (dias < 0)  return { label: "Vencido",      className: "bg-destructive/10 text-destructive border-destructive/20", dias };
  if (dias <= 30) return { label: `${dias}d`,    className: "bg-warning/10 text-warning border-warning/20", dias };
  return { label: format(parseISO(fechaVigencia), "dd/MM/yy"), className: "", dias };
}

// ── Main component ─────────────────────────────────────
const Gafetes = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterEstatus, setFilterEstatus] = useState("_all");
  const [filterDepto, setFilterDepto] = useState("_all");
  const [filterAlert, setFilterAlert] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [showPassword, setShowPassword] = useState(false);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [deptoOpen, setDeptoOpen] = useState(false);

  // ── Queries ──
  const { data: gafetes = [], isLoading } = useQuery({
    queryKey: ["gafetes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gafetes")
        .select("*, gafete_departamentos(nombre)")
        .order("nombre_completo");
      if (error) throw error;
      // Don't expose encrypted password_anam in list - strip it
      return (data ?? []).map(g => ({ ...g, password_anam: null })) as Gafete[];
    },
    refetchInterval: 60000,
  });

  const { data: departamentos = [] } = useQuery({
    queryKey: ["gafete-departamentos"],
    queryFn: async () => {
      const { data } = await supabase.from("gafete_departamentos").select("*").order("nombre");
      return (data ?? []) as Departamento[];
    },
  });

  const { data: historial = [] } = useQuery({
    queryKey: ["gafete-historial", detailId],
    queryFn: async () => {
      if (!detailId) return [];
      const { data } = await supabase
        .from("gafetes_historial")
        .select("*")
        .eq("gafete_id", detailId)
        .order("created_at", { ascending: false });
      return (data ?? []) as GafeteHistorial[];
    },
    enabled: !!detailId,
  });

  // ── Alerts ──
  const alertas = useMemo(() => {
    const vencidos = gafetes.filter(g => g.activo && g.estatus === "activo" && g.fecha_vigencia && differenceInDays(parseISO(g.fecha_vigencia), new Date()) < 0);
    const proximos = gafetes.filter(g => g.activo && g.estatus === "activo" && g.fecha_vigencia && differenceInDays(parseISO(g.fecha_vigencia), new Date()) >= 0 && differenceInDays(parseISO(g.fecha_vigencia), new Date()) <= 30);
    return { vencidos, proximos };
  }, [gafetes]);

  // ── Filtered list ──
  const filtered = useMemo(() => {
    return gafetes.filter(g => {
      if (search && !g.nombre_completo.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterEstatus !== "_all" && g.estatus !== filterEstatus) return false;
      if (filterDepto !== "_all" && g.departamento_id !== filterDepto) return false;
      if (filterAlert) {
        const dias = g.fecha_vigencia ? differenceInDays(parseISO(g.fecha_vigencia), new Date()) : 999;
        if (dias > 30) return false;
      }
      return true;
    });
  }, [gafetes, search, filterEstatus, filterDepto, filterAlert]);

  // ── Mutations ──
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        nombre_completo: form.nombre_completo.trim(),
        departamento_id: form.departamento_id || null,
        usuario_anam: form.usuario_anam.trim() || null,
        password_anam: form.password_anam.trim() || null,
        doc_identificacion: form.doc_identificacion,
        doc_constancia_fiscal: form.doc_constancia_fiscal,
        doc_responsiva_firmada: form.doc_responsiva_firmada,
        doc_acuse_cita: form.doc_acuse_cita,
        fecha_cita: form.fecha_cita || null,
        fecha_entrega: form.fecha_entrega || null,
        fecha_vigencia: form.fecha_vigencia || null,
        estatus: form.estatus,
        activo: form.activo,
        notas: form.notas.trim() || null,
        updated_by: user?.id,
      };

      if (editId) {
        const { data: current } = await supabase.from("gafetes").select("estatus,fecha_vigencia").eq("id", editId).single();
        const { error } = await supabase.from("gafetes").update(payload).eq("id", editId);
        if (error) throw error;

        if (current && (current.estatus !== form.estatus || current.fecha_vigencia !== form.fecha_vigencia)) {
          await supabase.from("gafetes_historial").insert({
            gafete_id: editId,
            estatus_anterior: current.estatus,
            estatus_nuevo: form.estatus,
            fecha_vigencia_anterior: current.fecha_vigencia,
            fecha_vigencia_nueva: form.fecha_vigencia || null,
            notas: form.notas.trim() || null,
            created_by: user?.id,
          });
        }
      } else {
        const { error } = await supabase.from("gafetes").insert({ ...payload, created_by: user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gafetes"] });
      toast.success(editId ? "Gafete actualizado" : "Gafete registrado");
      closeForm();
    },
    onError: (e: Error) => toast.error(e.message || "Error al guardar"),
  });

  // ── Form helpers ──
  const openNew = () => { setForm({ ...EMPTY_FORM }); setEditId(null); setFormOpen(true); };
  const openEdit = (g: Gafete) => {
    setForm({
      nombre_completo: g.nombre_completo, departamento_id: g.departamento_id ?? "",
      usuario_anam: g.usuario_anam ?? "", password_anam: g.password_anam ?? "",
      doc_identificacion: g.doc_identificacion, doc_constancia_fiscal: g.doc_constancia_fiscal,
      doc_responsiva_firmada: g.doc_responsiva_firmada, doc_acuse_cita: g.doc_acuse_cita,
      fecha_cita: g.fecha_cita ? g.fecha_cita.slice(0, 16) : "",
      fecha_entrega: g.fecha_entrega ?? "", fecha_vigencia: g.fecha_vigencia ?? "",
      estatus: g.estatus, activo: g.activo, notas: g.notas ?? "",
    });
    setEditId(g.id); setFormOpen(true);
  };
  const closeForm = () => { setFormOpen(false); setEditId(null); setShowPassword(false); };

  const fmtDate = (d: string | null) => d ? format(parseISO(d), "dd MMM yyyy", { locale: es }) : "—";

  const docsCount = (g: Gafete) => [g.doc_identificacion, g.doc_constancia_fiscal, g.doc_responsiva_firmada, g.doc_acuse_cita].filter(Boolean).length;

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Gafetes ANAM</h1>
            </div>
            <p className="text-sm text-muted-foreground">Control de accesos y vigencias</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeptoOpen(true)}>
              <Settings className="h-4 w-4 mr-1.5" /> Departamentos
            </Button>
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4 mr-1.5" /> Nuevo gafete
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {(alertas.vencidos.length > 0 || alertas.proximos.length > 0) && (
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-2">
            {alertas.vencidos.length > 0 && (
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm">
                  <span className="font-medium text-destructive">{alertas.vencidos.length} gafete{alertas.vencidos.length > 1 ? "s" : ""} vencido{alertas.vencidos.length > 1 ? "s" : ""}:</span>{" "}
                  <span className="text-muted-foreground">{alertas.vencidos.map(g => g.nombre_completo.split(" ").slice(0, 2).join(" ")).join(" · ")}</span>
                </p>
              </div>
            )}
            {alertas.proximos.length > 0 && (
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                <p className="text-sm">
                  <span className="font-medium text-warning">{alertas.proximos.length} gafete{alertas.proximos.length > 1 ? "s" : ""} próximo{alertas.proximos.length > 1 ? "s" : ""} a vencer (≤30 días):</span>{" "}
                  <span className="text-muted-foreground">{alertas.proximos.map(g => `${g.nombre_completo.split(" ").slice(0, 2).join(" ")} (${differenceInDays(parseISO(g.fecha_vigencia!), new Date())}d)`).join(" · ")}</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar colaborador..." value={search} onChange={e => setSearch(e.target.value)} className="h-9 pl-9" />
          </div>
          <Select value={filterEstatus} onValueChange={setFilterEstatus}>
            <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos</SelectItem>
              <SelectItem value="activo">Activo</SelectItem>
              <SelectItem value="baja">Baja</SelectItem>
              <SelectItem value="renovado">Renovado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterDepto} onValueChange={setFilterDepto}>
            <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos</SelectItem>
              {departamentos.filter(d => d.activo).map(d => (
                <SelectItem key={d.id} value={d.id}>{d.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={filterAlert ? "default" : "outline"}
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => setFilterAlert(!filterAlert)}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {filterAlert ? "Mostrando alertas" : "Solo alertas"}
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-card shadow-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Colaborador</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead className="text-center">Documentación</TableHead>
                <TableHead>Cita</TableHead>
                <TableHead>Vigencia</TableHead>
                <TableHead>Estatus</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Sin resultados</TableCell></TableRow>
              ) : filtered.map(g => {
                const vigencia = getVigenciaStatus(g.fecha_vigencia);
                const docs = docsCount(g);
                return (
                  <TableRow key={g.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{g.nombre_completo}</p>
                      {g.usuario_anam && <p className="text-xs text-muted-foreground font-mono">{g.usuario_anam}</p>}
                    </TableCell>
                    <TableCell className="text-sm">{g.gafete_departamentos?.nombre ?? "—"}</TableCell>
                    <TableCell className="text-center">
                      <span className={`text-sm font-medium ${docs === 4 ? "text-success" : docs >= 2 ? "text-warning" : "text-destructive"}`}>
                        {docs}/4
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{g.fecha_cita ? format(parseISO(g.fecha_cita), "dd/MM/yy HH:mm") : "—"}</TableCell>
                    <TableCell>
                      {vigencia ? (
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${vigencia.className || "bg-muted text-muted-foreground border-border"}`}>
                          {vigencia.label}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${estatusConfig[g.estatus]?.className}`}>
                        {estatusConfig[g.estatus]?.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDetailId(g.id)} title="Ver detalle e historial">
                          <History className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openEdit(g)}>
                          Editar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {filtered.length > 0 && (
          <p className="text-xs text-muted-foreground text-right">{filtered.length} de {gafetes.length} registros</p>
        )}
      </div>

      {/* ── Form Dialog ── */}
      <Dialog open={formOpen} onOpenChange={v => !v && closeForm()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar gafete" : "Registrar nuevo gafete"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Datos colaborador */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label>Nombre completo *</Label>
                <Input value={form.nombre_completo} onChange={e => setForm(p => ({ ...p, nombre_completo: e.target.value }))} placeholder="Nombre como aparece en su identificación" />
              </div>
              <div className="space-y-2">
                <Label>Departamento</Label>
                <Select value={form.departamento_id} onValueChange={v => setForm(p => ({ ...p, departamento_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {departamentos.filter(d => d.activo).map(d => <SelectItem key={d.id} value={d.id}>{d.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estatus</Label>
                <Select value={form.estatus} onValueChange={v => setForm(p => ({ ...p, estatus: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="baja">Baja</SelectItem>
                    <SelectItem value="renovado">Renovado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Credenciales ANAM */}
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Credenciales ANAM</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Usuario</Label>
                  <Input value={form.usuario_anam} onChange={e => setForm(p => ({ ...p, usuario_anam: e.target.value }))} placeholder="usuario_anam" className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label>Contraseña</Label>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} value={form.password_anam} onChange={e => setForm(p => ({ ...p, password_anam: e.target.value }))} className="pr-9 font-mono" />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full w-9" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Documentación */}
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Documentación entregada</Label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  ["doc_identificacion", "Identificación"],
                  ["doc_constancia_fiscal", "Constancia de situación fiscal"],
                  ["doc_responsiva_firmada", "Responsiva firmada"],
                  ["doc_acuse_cita", "Acuse de cita"],
                ] as const).map(([field, label]) => (
                  <div key={field} className="flex items-center gap-2">
                    <Checkbox
                      id={field}
                      checked={(form as any)[field]}
                      onCheckedChange={v => setForm(p => ({ ...p, [field]: !!v }))}
                    />
                    <Label htmlFor={field} className="text-sm cursor-pointer">{label}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Fechas */}
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Fechas</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Fecha y hora de cita</Label>
                  <Input type="datetime-local" value={form.fecha_cita} onChange={e => setForm(p => ({ ...p, fecha_cita: e.target.value }))} className="text-sm" />
                </div>
                <div className="space-y-2">
                  <Label>Fecha de entrega</Label>
                  <Input type="date" value={form.fecha_entrega} onChange={e => setForm(p => ({ ...p, fecha_entrega: e.target.value }))} className="text-sm" />
                </div>
                <div className="space-y-2">
                  <Label>Fecha de vigencia</Label>
                  <Input type="date" value={form.fecha_vigencia} onChange={e => setForm(p => ({ ...p, fecha_vigencia: e.target.value }))} className="text-sm" />
                </div>
              </div>
            </div>

            {/* Notas + Activo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} rows={2} className="text-sm" placeholder="Observaciones adicionales..." />
              </div>
              <div className="space-y-2 pt-7">
                <div className="flex items-center gap-2">
                  <Switch checked={form.activo} onCheckedChange={v => setForm(p => ({ ...p, activo: v }))} />
                  <Label>Colaborador activo</Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.nombre_completo.trim() || saveMutation.isPending}>
              {saveMutation.isPending ? "Guardando..." : editId ? "Actualizar" : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Detail + History Sheet ── */}
      <Sheet open={!!detailId} onOpenChange={v => !v && setDetailId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          {detailId && (() => {
            const g = gafetes.find(x => x.id === detailId);
            if (!g) return null;
            const vigencia = getVigenciaStatus(g.fecha_vigencia);
            return (
              <div className="space-y-5 p-1">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <BadgeCheck className="h-5 w-5 text-primary" />
                    {g.nombre_completo}
                  </SheetTitle>
                </SheetHeader>

                <Tabs defaultValue="info">
                  <TabsList>
                    <TabsTrigger value="info" className="text-xs">Información</TabsTrigger>
                    <TabsTrigger value="historial" className="text-xs">Historial ({historial.length})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="info" className="space-y-4 mt-4">
                    <div className="flex gap-2 flex-wrap">
                      <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ${estatusConfig[g.estatus]?.className}`}>
                        {estatusConfig[g.estatus]?.label}
                      </span>
                      {vigencia && (
                        <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ${vigencia.className || "bg-muted text-muted-foreground border-border"}`}>
                          Vigencia: {vigencia.dias < 0 ? `Vencido hace ${Math.abs(vigencia.dias)}d` : vigencia.dias <= 30 ? `Vence en ${vigencia.dias} días` : fmtDate(g.fecha_vigencia)}
                        </span>
                      )}
                    </div>

                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between border-b border-border pb-2">
                        <span className="text-muted-foreground">Departamento</span>
                        <span>{g.gafete_departamentos?.nombre ?? "—"}</span>
                      </div>
                      <div className="flex justify-between border-b border-border pb-2">
                        <span className="text-muted-foreground">Usuario ANAM</span>
                        <span className="font-mono">{g.usuario_anam || "—"}</span>
                      </div>
                      <div className="flex justify-between border-b border-border pb-2">
                        <span className="text-muted-foreground">Fecha cita</span>
                        <span>{g.fecha_cita ? format(parseISO(g.fecha_cita), "dd/MM/yyyy HH:mm") : "—"}</span>
                      </div>
                      <div className="flex justify-between border-b border-border pb-2">
                        <span className="text-muted-foreground">Fecha entrega</span>
                        <span>{fmtDate(g.fecha_entrega)}</span>
                      </div>
                      <div className="flex justify-between border-b border-border pb-2">
                        <span className="text-muted-foreground">Fecha vigencia</span>
                        <span className={vigencia && vigencia.dias < 0 ? "text-destructive font-medium" : vigencia && vigencia.dias <= 30 ? "text-warning font-medium" : ""}>{fmtDate(g.fecha_vigencia)}</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Documentación</p>
                      <div className="grid grid-cols-2 gap-2">
                        {([
                          [g.doc_identificacion, "Identificación"],
                          [g.doc_constancia_fiscal, "Constancia fiscal"],
                          [g.doc_responsiva_firmada, "Responsiva firmada"],
                          [g.doc_acuse_cita, "Acuse de cita"],
                        ] as [boolean, string][]).map(([val, label]) => (
                          <div key={label} className="flex items-center gap-2 text-sm">
                            <div className={`h-4 w-4 rounded flex items-center justify-center flex-shrink-0 ${val ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                              {val ? "✓" : "·"}
                            </div>
                            <span className={val ? "" : "text-muted-foreground"}>{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {g.notas && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Notas</p>
                        <p className="text-sm text-muted-foreground">{g.notas}</p>
                      </div>
                    )}

                    <Button variant="outline" size="sm" className="gap-1.5 w-full" onClick={() => { setDetailId(null); openEdit(g); }}>
                      Editar este registro
                    </Button>
                  </TabsContent>

                  <TabsContent value="historial" className="mt-4">
                    {historial.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">Sin historial de cambios</p>
                    ) : (
                      <div className="space-y-3">
                        {historial.map(h => (
                          <div key={h.id} className="rounded-lg border bg-card p-3 text-sm space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {h.estatus_anterior && (
                                  <>
                                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium border ${estatusConfig[h.estatus_anterior]?.className}`}>{estatusConfig[h.estatus_anterior]?.label}</span>
                                    <span className="text-muted-foreground text-xs">→</span>
                                  </>
                                )}
                                <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium border ${estatusConfig[h.estatus_nuevo]?.className}`}>{estatusConfig[h.estatus_nuevo]?.label}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">{format(parseISO(h.created_at), "dd/MM/yy HH:mm")}</span>
                            </div>
                            {(h.fecha_vigencia_anterior || h.fecha_vigencia_nueva) && (
                              <p className="text-xs text-muted-foreground">
                                Vigencia: {fmtDate(h.fecha_vigencia_anterior)} → {fmtDate(h.fecha_vigencia_nueva)}
                              </p>
                            )}
                            {h.notas && <p className="text-xs text-muted-foreground italic">"{h.notas}"</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* ── Departamentos Dialog ── */}
      <DepartamentosDialog open={deptoOpen} onClose={() => setDeptoOpen(false)} departamentos={departamentos} />
    </AppLayout>
  );
};

// ── Departamentos subcomponent ──────────────────────────
function DepartamentosDialog({ open, onClose, departamentos }: { open: boolean; onClose: () => void; departamentos: Departamento[]; }) {
  const queryClient = useQueryClient();
  const [nombre, setNombre] = useState("");

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!nombre.trim()) throw new Error("El nombre es requerido");
      const { error } = await supabase.from("gafete_departamentos").insert({ nombre: nombre.trim() });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["gafete-departamentos"] }); setNombre(""); toast.success("Departamento agregado"); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase.from("gafete_departamentos").update({ activo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["gafete-departamentos"] }),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Settings className="h-4 w-4" /> Catálogo de Departamentos</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nuevo departamento..." className="flex-1" onKeyDown={e => e.key === "Enter" && addMutation.mutate()} />
            <Button onClick={() => addMutation.mutate()} disabled={!nombre.trim() || addMutation.isPending}>Agregar</Button>
          </div>
          <div className="rounded-lg border overflow-hidden">
            {departamentos.map(d => (
              <div key={d.id} className="flex items-center justify-between px-3 py-2.5 border-b last:border-0 text-sm">
                <span className={d.activo ? "" : "text-muted-foreground line-through"}>{d.nombre}</span>
                <Switch checked={d.activo} onCheckedChange={v => toggleMutation.mutate({ id: d.id, activo: v })} />
              </div>
            ))}
            {departamentos.length === 0 && <div className="text-center py-6 text-sm text-muted-foreground">Sin departamentos configurados</div>}
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cerrar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default Gafetes;
