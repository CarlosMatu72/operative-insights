import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { useKPIs, useGlosadores, useRealtimeSessions } from "@/hooks/useTableroData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Clock, ClipboardCheck, AlertTriangle, CheckCircle, XCircle, Users } from "lucide-react";
import { format } from "date-fns";

const Index = () => {
  const { profile } = useAuth();
  const { data: kpis } = useKPIs();
  const { data: glosadores = [] } = useGlosadores();
  useRealtimeSessions();

  const { data: recentCases = [] } = useQuery({
    queryKey: ["recent-cases-dashboard"],
    queryFn: async () => {
      const { data } = await supabase
        .from("review_cases")
        .select("*, document_types(name), branches(nombre), executives(nombre)")
        .order("registered_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
    refetchInterval: 30000,
  });

  const stats = [
    { label: "Total trámites", value: kpis?.total ?? "—", icon: FileText, color: "bg-primary/10 text-primary" },
    { label: "Pendientes de asignar", value: kpis?.pendientes ?? "—", icon: Clock, color: "bg-muted text-muted-foreground" },
    { label: "En revisión", value: kpis?.enRevision ?? "—", icon: ClipboardCheck, color: "bg-primary/10 text-primary" },
    { label: "En corrección / pausados", value: kpis?.pausados ?? "—", icon: AlertTriangle, color: "bg-warning/10 text-warning" },
    { label: "Aprobados (mes)", value: kpis?.aprobadosMes ?? "—", icon: CheckCircle, color: "bg-success/10 text-success" },
    { label: "Glosadores activos", value: glosadores.filter((g: any) => g.isActive).length, icon: Users, color: "bg-success/10 text-success" },
  ];

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Bienvenido, {profile?.nombre}
          </h1>
          <p className="text-sm text-muted-foreground">
            Panel de Control de Glosa y Eficiencia Operativa
          </p>
        </div>

        {/* KPI Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2.5 ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom sections: Recent Cases + Glosadores */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Cases - 2/3 */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Trámites Recientes</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Referencia</TableHead>
                      <TableHead className="text-xs">Tipo</TableHead>
                      <TableHead className="text-xs">Sucursal</TableHead>
                      <TableHead className="text-xs">Ejecutivo</TableHead>
                      <TableHead className="text-xs">Estatus</TableHead>
                      <TableHead className="text-xs">Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentCases.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="text-xs font-medium">{c.reference ?? c.internal_folio}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {(c.document_types as any)?.name ?? "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{(c.branches as any)?.nombre ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{(c.executives as any)?.nombre ?? "—"}</TableCell>
                        <TableCell><StatusBadge status={c.status} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(c.registered_at), "dd/MM/yy")}
                        </TableCell>
                      </TableRow>
                    ))}
                    {recentCases.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-8">
                          Sin trámites registrados
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Glosadores - 1/3 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Glosadores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {glosadores.map((g: any) => (
                  <div key={g.id} className="flex items-center gap-2 rounded-lg border bg-card p-2.5 min-w-[140px]">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={g.avatar_url ?? undefined} />
                        <AvatarFallback className="text-xs bg-muted">
                          {g.nombre?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span
                        className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card ${
                         g.isActive ? "bg-destructive animate-pulse" : "bg-success"
                        }`}
                      />
                    </div>
                    <span className="text-sm font-medium text-foreground truncate">{g.nombre}</span>
                  </div>
                ))}
                {glosadores.length === 0 && (
                  <p className="text-xs text-muted-foreground">Sin glosadores activos</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
