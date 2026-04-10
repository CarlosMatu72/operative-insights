import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { KpiCard } from "@/components/KpiCard";
import { useKPIs, useRealtimeSessions } from "@/hooks/useTableroData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Clock, ClipboardCheck, AlertTriangle, CheckCircle, Users } from "lucide-react";

const Index = () => {
  const { profile } = useAuth();
  const { data: kpis } = useKPIs();
  useRealtimeSessions();

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: recentCases = [] } = useQuery({
    queryKey: ["recent-cases-dashboard", dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from("review_cases")
        .select(`
          *, 
          document_types(name, code), 
          glosador:profiles!review_cases_glosador_profile_fkey(nombre),
          review_scores(score_total),
          review_findings(id)
        `)
        .eq("status", "APROBADO")
        .order("approved_at", { ascending: false })
        .limit(50);

      if (dateFrom) query = query.gte("approved_at", dateFrom);
      if (dateTo) query = query.lte("approved_at", dateTo + "T23:59:59");

      const { data } = await query;
      return (data ?? []).map(c => ({
        ...c,
        score_total: c.review_scores?.[0]?.score_total ?? null,
        findings_count: c.review_findings?.length ?? 0,
      }));
    },
    refetchInterval: 30000,
  });

  const filteredCases = recentCases;

  const stats = [
    { label: "Total trámites", value: kpis?.total ?? "—", icon: FileText, color: "bg-primary/10 text-primary" },
    { label: "Pendientes de asignar", value: kpis?.pendientes ?? "—", icon: Clock, color: "bg-muted text-muted-foreground" },
    { label: "En revisión", value: kpis?.enRevision ?? "—", icon: ClipboardCheck, color: "bg-primary/10 text-primary" },
    { label: "En corrección / pausados", value: kpis?.pausados ?? "—", icon: AlertTriangle, color: "bg-warning/10 text-warning" },
    { label: "Aprobados (mes)", value: kpis?.aprobadosMes ?? "—", icon: CheckCircle, color: "bg-success/10 text-success" },
    { label: "Glosadores activos", value: kpis?.glosadoresActivos ?? "—", icon: Users, color: "bg-success/10 text-success" },
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
            <KpiCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              icon={stat.icon}
              colorClass={stat.color}
            />
          ))}
        </div>

        {/* Recent / Filtered Cases */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-base">Trámites Revisados</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">Desde</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="h-8 text-xs w-36"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">Hasta</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    className="h-8 text-xs w-36"
                  />
                </div>
                {(dateFrom || dateTo) && (
                  <Button
                    variant="ghost" size="sm"
                    className="h-8 text-xs"
                    onClick={() => { setDateFrom(""); setDateTo(""); }}
                  >
                    Limpiar
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Referencia</TableHead>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs">Glosador</TableHead>
                    <TableHead className="text-xs">Observaciones</TableHead>
                    <TableHead className="text-xs">Calificación</TableHead>
                    <TableHead className="text-xs">Aprobado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCases.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs font-medium">{c.reference ?? c.internal_folio}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{c.document_types?.name ?? "—"}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.glosador?.nombre ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-center text-muted-foreground">
                        {c.findings_count ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-center">
                        {c.score_total != null ? (
                          <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold ${
                            Number(c.score_total) >= 85 ? "bg-success/10 text-success" :
                            Number(c.score_total) >= 70 ? "bg-warning/10 text-warning" :
                            "bg-destructive/10 text-destructive"
                          }`}>{c.score_total}/100</span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {c.approved_at
                          ? new Date(c.approved_at).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })
                            + " " + new Date(c.approved_at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredCases.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-8">
                        {dateFrom || dateTo ? "Sin trámites en el rango seleccionado" : "Sin trámites aprobados"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Index;
