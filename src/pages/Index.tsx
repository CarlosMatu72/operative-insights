import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { KpiCard } from "@/components/KpiCard";
import { useKPIs, useGlosadores, useRealtimeSessions } from "@/hooks/useTableroData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import ReviewDetailPanel from "@/components/glosa/ReviewDetailPanel";
import { FileText, Clock, ClipboardCheck, AlertTriangle, CheckCircle, Users, Search, X } from "lucide-react";

const Index = () => {
  const { profile } = useAuth();
  const { data: kpis } = useKPIs();
  const { data: glosadores = [] } = useGlosadores();
  useRealtimeSessions();

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchRef, setSearchRef] = useState("");
  const [selectedAprobadoId, setSelectedAprobadoId] = useState<string | null>(null);

  const { data: recentCases = [], isLoading: loadingCases } = useQuery({
    queryKey: ["recent-cases-dashboard", dateFrom, dateTo, searchRef],
    queryFn: async () => {
      let query = supabase
        .from("review_cases")
        .select(`
          id, reference, internal_folio, status, approved_at,
          document_types(name, code),
          glosador:profiles!review_cases_glosador_profile_fkey(nombre),
          review_scores(score_total)
        `)
        .eq("status", "APROBADO")
        .is("deleted_at", null)
        .order("approved_at", { ascending: false });

      if (dateFrom) query = query.gte("approved_at", dateFrom + "T00:00:00-06:00");
      if (dateTo)   query = query.lte("approved_at", dateTo   + "T23:59:59-06:00");

      if (searchRef && searchRef.trim().length >= 2) {
        query = query.ilike("reference", `%${searchRef.trim()}%`);
      } else {
        query = query.limit(200);
      }

      const { data } = await query;
      return (data ?? []).map(c => ({
        ...c,
        score_total: c.review_scores?.[0]?.score_total ?? null,
      }));
    },
    refetchInterval: 30000,
    staleTime: 20000,
  });

  const { data: findingsCounts = {} } = useQuery({
    queryKey: ["dashboard-findings-counts", recentCases.map(c => c.id).join(",")],
    queryFn: async () => {
      const ids = recentCases.map(c => c.id);
      if (ids.length === 0) return {} as Record<string, number>;
      const chunks: string[][] = [];
      for (let i = 0; i < ids.length; i += 100) chunks.push(ids.slice(i, i + 100));
      const all = (await Promise.all(
        chunks.map(ch =>
          supabase.from("review_findings").select("review_case_id").in("review_case_id", ch)
        )
      )).flatMap(r => r.data ?? []);
      const map: Record<string, number> = {};
      for (const f of all) map[f.review_case_id] = (map[f.review_case_id] ?? 0) + 1;
      return map;
    },
    enabled: recentCases.length > 0,
    staleTime: 60000,
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
              <div className="flex items-center gap-3">
                <CardTitle className="text-base">Trámites Revisados</CardTitle>
                <span className="text-xs text-muted-foreground">
                  {loadingCases
                    ? "Cargando..."
                    : `${recentCases.length}${!searchRef && !dateFrom && !dateTo && recentCases.length === 200 ? "+" : ""} registros`}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar referencia..."
                    value={searchRef}
                    onChange={e => setSearchRef(e.target.value)}
                    className="h-8 text-xs pl-8 pr-7 w-44"
                  />
                  {searchRef && (
                    <button
                      onClick={() => setSearchRef("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
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
                    <TableHead className="text-xs">Referencia <span className="text-muted-foreground font-normal">(ver detalle →)</span></TableHead>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs">Glosador</TableHead>
                    <TableHead className="text-xs">Observaciones</TableHead>
                    <TableHead className="text-xs">Calificación</TableHead>
                    <TableHead className="text-xs">Aprobado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCases.map(c => (
                    <TableRow 
                      key={c.id} 
                      className="cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => setSelectedAprobadoId(c.id)}
                    >
                      <TableCell className="text-xs font-medium">
                        <span className="text-primary hover:underline">{c.reference ?? c.internal_folio}</span>
                      </TableCell>
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

        <Sheet 
          open={!!selectedAprobadoId} 
          onOpenChange={(open) => { if (!open) setSelectedAprobadoId(null); }}
        >
          <SheetContent side="right" className="w-full sm:max-w-3xl lg:max-w-4xl p-0 overflow-y-auto">
            {selectedAprobadoId && (
              <ReviewDetailPanel 
                caseId={selectedAprobadoId} 
                onClose={() => setSelectedAprobadoId(null)} 
              />
            )}
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  );
};

export default Index;
