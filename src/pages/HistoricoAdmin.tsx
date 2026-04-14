import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { History, Trash2, RotateCcw, Search } from "lucide-react";
import ReviewDetailPanel from "@/components/glosa/ReviewDetailPanel";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

function fmt(d: string | null) {
  if (!d) return "—";
  return format(parseISO(d), "dd MMM yyyy HH:mm", { locale: es });
}

const HistoricoAdmin = () => {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: deletedCases = [], isLoading: loadingDeleted } = useQuery({
    queryKey: ["deleted-cases-full"],
    queryFn: async () => {
      const { data } = await supabase
        .from("review_cases")
        .select(`
          id, reference, internal_folio, status, registered_at,
          deleted_at, delete_reason, deleted_by,
          document_types(name),
          clients(nombre), branches(nombre)
        `)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });
      
      // Resolve deleter names via profiles
      const deleterIds = [...new Set((data ?? []).map((c: any) => c.deleted_by).filter(Boolean))];
      let deleterMap: Record<string, string> = {};
      if (deleterIds.length > 0) {
        const { data: profiles } = await supabase.rpc("get_profiles_display", { _user_ids: deleterIds });
        deleterMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p.nombre]));
      }
      return (data ?? []).map((c: any) => ({ ...c, deleter_nombre: deleterMap[c.deleted_by] ?? null }));
    },
  });

  const { data: auditLogs = [], isLoading: loadingAudit } = useQuery({
    queryKey: ["audit-admin-actions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("audit_logs")
        .select("id, action, created_at, record_id, details, user_id")
        .in("action", ["ADMIN_DELETE_CASE", "ADMIN_REOPEN_APPROVED", "APROBAR_TRAMITE"])
        .order("created_at", { ascending: false })
        .limit(200);
      
      const actorIds = [...new Set((data ?? []).map((l: any) => l.user_id).filter(Boolean))];
      let actorMap: Record<string, string> = {};
      if (actorIds.length > 0) {
        const { data: profiles } = await supabase.rpc("get_profiles_display", { _user_ids: actorIds });
        actorMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p.nombre]));
      }
      return (data ?? []).map((l: any) => ({ ...l, actor_nombre: actorMap[l.user_id] ?? null }));
    },
  });

  const actionLabel: Record<string, { label: string; className: string }> = {
    ADMIN_DELETE_CASE:     { label: "Eliminado",    className: "bg-destructive/10 text-destructive border-destructive/20" },
    ADMIN_REOPEN_APPROVED: { label: "Reabierto",    className: "bg-warning/10 text-warning border-warning/20" },
    APROBAR_TRAMITE:       { label: "Aprobado",     className: "bg-success/10 text-success border-success/20" },
  };

  const filteredDeleted = deletedCases.filter((c: any) =>
    !search ||
    (c.reference ?? c.internal_folio)?.toLowerCase().includes(search.toLowerCase()) ||
    c.clients?.nombre?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredAudit = auditLogs.filter((l: any) =>
    !search ||
    l.record_id?.toLowerCase().includes(search.toLowerCase()) ||
    l.actor_nombre?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Histórico de Administración
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Registro de acciones administrativas — solo visible para administradores
            </p>
          </div>
        </div>

        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <Tabs defaultValue="deleted" className="space-y-4">
          <TabsList>
            <TabsTrigger value="deleted" className="gap-1.5">
              <Trash2 className="h-3.5 w-3.5" />
              Eliminados ({deletedCases.length})
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" />
              Registro de acciones ({auditLogs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="deleted">
            <div className="rounded-lg border bg-card shadow-sm overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs">Referencia</TableHead>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs">Cliente</TableHead>
                    <TableHead className="text-xs">Estatus al eliminar</TableHead>
                    <TableHead className="text-xs">Eliminado por</TableHead>
                    <TableHead className="text-xs">Fecha eliminación</TableHead>
                    <TableHead className="text-xs">Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingDeleted ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        Cargando...
                      </TableCell>
                    </TableRow>
                  ) : filteredDeleted.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        Sin registros eliminados
                      </TableCell>
                    </TableRow>
                  ) : filteredDeleted.map((c: any) => (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={() => setSelectedId(c.id)}
                    >
                      <TableCell className="font-medium text-sm">
                        {c.reference ?? c.internal_folio}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[11px] font-normal">
                          {c.document_types?.name ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.clients?.nombre ?? "—"}</TableCell>
                      <TableCell className="text-sm">
                        {c.status}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.deleter_nombre ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {fmt(c.deleted_at)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {c.delete_reason || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="audit">
            <div className="rounded-lg border bg-card shadow-sm overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs">Acción</TableHead>
                    <TableHead className="text-xs">Administrador</TableHead>
                    <TableHead className="text-xs">ID de trámite</TableHead>
                    <TableHead className="text-xs">Fecha</TableHead>
                    <TableHead className="text-xs">Detalle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingAudit ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        Cargando...
                      </TableCell>
                    </TableRow>
                  ) : filteredAudit.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        Sin acciones registradas
                      </TableCell>
                    </TableRow>
                  ) : filteredAudit.map((l: any) => {
                    const cfg = actionLabel[l.action] ?? { label: l.action, className: "bg-muted text-muted-foreground border-border" };
                    return (
                      <TableRow key={l.id}>
                        <TableCell>
                          <Badge variant="outline" className={`text-[11px] ${cfg.className}`}>
                            {cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{l.actor_nombre ?? "—"}</TableCell>
                        <TableCell className="text-sm font-mono text-muted-foreground">
                          {l.record_id?.slice(0, 8)}…
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {fmt(l.created_at)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate">
                          {l.details ? JSON.stringify(l.details).slice(0, 60) : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Sheet open={!!selectedId} onOpenChange={(v) => !v && setSelectedId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-3xl lg:max-w-4xl p-0 overflow-y-auto">
          {selectedId && (
            <ReviewDetailPanel caseId={selectedId} onClose={() => setSelectedId(null)} />
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
};

export default HistoricoAdmin;
