import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useCatalogs } from "@/hooks/useCatalogs";
import { useReportData, useReportScores, useReportFindings, useReportSessions, type ReportFilters } from "@/hooks/useReportesData";

import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, ResponsiveContainer } from "recharts";
import { BarChart3, FileText, CheckCircle, XCircle, Clock, AlertTriangle, TrendingUp, Filter } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";

import { StatusBadge } from "@/components/StatusBadge";

const STATUS_COLORS: Record<string, string> = {
  REGISTRADO: "hsl(0, 0%, 45%)",
  ASIGNADO: "hsl(212, 95%, 49%)",
  EN_REVISION: "hsl(212, 80%, 60%)",
  PAUSADO: "hsl(38, 92%, 50%)",
  CORRECCION_PENDIENTE: "hsl(38, 72%, 50%)",
  EN_CORRECCION: "hsl(38, 60%, 55%)",
  APROBADO: "hsl(152, 60%, 36%)",
  RECHAZADO: "hsl(0, 72%, 51%)",
  REABIERTO: "hsl(212, 95%, 49%)",
};

const Reportes = () => {
  const { isAdmin } = useAuth();
  const { branches, clients, executives, documentTypes, glosadores } = useCatalogs();

  const [filters, setFilters] = useState<ReportFilters>({});
  const [showFilters, setShowFilters] = useState(true);

  const { data: cases = [], isLoading } = useReportData(filters);
  const caseIds = useMemo(() => cases.map(c => c.id), [cases]);
  const { data: scores = [] } = useReportScores(caseIds);
  const { data: findings = [] } = useReportFindings(caseIds);
  const { data: sessions = [] } = useReportSessions(caseIds);

  const scoreMap = useMemo(() => {
    const m: Record<string, typeof scores[number]> = {};
    for (const s of scores) m[s.review_case_id] = s;
    return m;
  }, [scores]);

  // ── KPIs ──
  const kpis = useMemo(() => {
    const total = cases.length;
    const aprobados = cases.filter(c => c.status === "APROBADO").length;
    const rechazados = cases.filter(c => c.status === "RECHAZADO").length;
    const pendientes = cases.filter(c => ["REGISTRADO", "ASIGNADO"].includes(c.status)).length;
    const enCorreccion = cases.filter(c => ["CORRECCION_PENDIENTE", "EN_CORRECCION"].includes(c.status)).length;

    const scoredCases = scores.filter((s) => s.score_total != null);
    const avgScore = scoredCases.length > 0
      ? Math.round(scoredCases.reduce((sum, s) => sum + Number(s.score_total), 0) / scoredCases.length)
      : 0;

    const completedSessions = sessions.filter((s) => s.duration_seconds && s.duration_seconds > 0);
    const avgTime = completedSessions.length > 0
      ? Math.round(completedSessions.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0) / completedSessions.length / 60)
      : 0;

    const totalErrors = findings.length;

    return { total, aprobados, rechazados, pendientes, enCorreccion, avgScore, avgTime, totalErrors };
  }, [cases, scores, sessions, findings]);

  // ── Chart data ──
  const statusPieData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of cases) counts[c.status] = (counts[c.status] || 0) + 1;
    return Object.entries(counts).map(([name, value]) => ({ name, value, fill: STATUS_COLORS[name] || "hsl(220, 15%, 70%)" }));
  }, [cases]);

  const branchBarData = useMemo(() => {
    const counts: Record<string, { name: string; total: number; avgScore: number; scores: number[] }> = {};
    for (const c of cases) {
      const name = (c as any).branches?.nombre ?? "Sin sucursal";
      if (!counts[name]) counts[name] = { name, total: 0, avgScore: 0, scores: [] };
      counts[name].total++;
      const s = scoreMap[c.id];
      if (s?.score_total) counts[name].scores.push(Number(s.score_total));
    }
    return Object.values(counts).map((b) => ({
      ...b,
      avgScore: b.scores.length > 0 ? Math.round(b.scores.reduce((a, v) => a + v, 0) / b.scores.length) : 0,
    })).sort((a, b) => b.total - a.total);
  }, [cases, scoreMap]);

  const executiveBarData = useMemo(() => {
    const counts: Record<string, { name: string; total: number; errors: number; scores: number[] }> = {};
    for (const c of cases) {
      const name = (c as any).executives?.nombre ?? "Sin ejecutivo";
      if (!counts[name]) counts[name] = { name, total: 0, errors: 0, scores: [] };
      counts[name].total++;
      const s = scoreMap[c.id];
      if (s?.score_total) counts[name].scores.push(Number(s.score_total));
      counts[name].errors += findings.filter((f) => f.review_case_id === c.id).length;
    }
    return Object.values(counts).map((e) => ({
      ...e,
      avgScore: e.scores.length > 0 ? Math.round(e.scores.reduce((a, v) => a + v, 0) / e.scores.length) : 0,
      errorsPerCase: e.total > 0 ? +(e.errors / e.total).toFixed(1) : 0,
    })).sort((a, b) => b.total - a.total);
  }, [cases, scoreMap, findings]);

  const glosadorBarData = useMemo(() => {
    const counts: Record<string, { name: string; total: number; aprobados: number; rechazados: number }> = {};
    for (const c of cases) {
      const name = (c as any).glosador?.nombre ?? "Sin asignar";
      if (!counts[name]) counts[name] = { name, total: 0, aprobados: 0, rechazados: 0 };
      counts[name].total++;
      if (c.status === "APROBADO") counts[name].aprobados++;
      if (c.status === "RECHAZADO") counts[name].rechazados++;
    }
    return Object.values(counts).sort((a, b) => b.total - a.total);
  }, [cases]);

  const monthlyTrend = useMemo(() => {
    const months: Record<string, { month: string; total: number; aprobados: number }> = {};
    for (const c of cases) {
      const d = new Date(c.registered_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!months[key]) months[key] = { month: key, total: 0, aprobados: 0 };
      months[key].total++;
      if (c.status === "APROBADO") months[key].aprobados++;
    }
    return Object.values(months).sort((a, b) => a.month.localeCompare(b.month));
  }, [cases]);

  const topErrors = useMemo(() => {
    const counts: Record<string, { name: string; count: number }> = {};
    for (const f of findings) {
      const name = (f as any).observation_errors?.descripcion ?? "Desconocido";
      if (!counts[name]) counts[name] = { name, count: 0 };
      counts[name].count++;
    }
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [findings]);

  const chartConfig = {
    total: { label: "Total", color: "hsl(var(--primary))" },
    aprobados: { label: "Aprobados", color: "hsl(var(--success))" },
    rechazados: { label: "Rechazados", color: "hsl(var(--destructive))" },
    avgScore: { label: "Calif. Prom.", color: "hsl(var(--warning))" },
    count: { label: "Cantidad", color: "hsl(var(--primary))" },
    errorsPerCase: { label: "Errores/Trámite", color: "hsl(var(--destructive))" },
  };

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "2-digit" }) : "—";

  const updateFilter = (key: keyof ReportFilters, value: string) => {
    setFilters((p) => ({ ...p, [key]: value === "_all_" ? undefined : value }));
  };

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reportes</h1>
            <p className="text-sm text-muted-foreground">Eficiencia operativa y calificación</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4" /> Filtros
          </Button>
        </div>

        {/* Filters */}
        {showFilters && (
          <Card>
            <CardContent className="pt-4">
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-muted-foreground">Desde</Label>
                  <Input type="date" value={filters.dateFrom ?? ""} onChange={(e) => updateFilter("dateFrom", e.target.value)} className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-muted-foreground">Hasta</Label>
                  <Input type="date" value={filters.dateTo ?? ""} onChange={(e) => updateFilter("dateTo", e.target.value)} className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-muted-foreground">Sucursal</Label>
                  <Select value={filters.branchId ?? "_all_"} onValueChange={(v) => updateFilter("branchId", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all_">Todas</SelectItem>
                      {(branches.data ?? []).map((b) => <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-muted-foreground">Ejecutivo</Label>
                  <Select value={filters.executiveId ?? "_all_"} onValueChange={(v) => updateFilter("executiveId", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all_">Todos</SelectItem>
                      {(executives.data ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-muted-foreground">Glosador</Label>
                  <Select value={filters.glosadorId ?? "_all_"} onValueChange={(v) => updateFilter("glosadorId", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all_">Todos</SelectItem>
                      {(glosadores.data ?? []).map((g) => <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-muted-foreground">Cliente</Label>
                  <Select value={filters.clientId ?? "_all_"} onValueChange={(v) => updateFilter("clientId", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all_">Todos</SelectItem>
                      {(clients.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-muted-foreground">Tipo</Label>
                  <Select value={filters.documentTypeId ?? "_all_"} onValueChange={(v) => updateFilter("documentTypeId", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all_">Todos</SelectItem>
                      {(documentTypes.data ?? []).map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-muted-foreground">Estatus</Label>
                  <Select value={filters.status ?? "_all_"} onValueChange={(v) => updateFilter("status", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all_">Todos</SelectItem>
                      {Constants.public.Enums.review_status.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="dashboard">
          <TabsList>
            <TabsTrigger value="dashboard" className="gap-1.5 text-xs"><BarChart3 className="h-3.5 w-3.5" /> Dashboard</TabsTrigger>
            <TabsTrigger value="table" className="gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" /> Detallado</TabsTrigger>
            
          </TabsList>

          {/* ── Dashboard ── */}
          <TabsContent value="dashboard" className="space-y-6 mt-4">
            {/* KPI cards */}
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
              {[
                { label: "Total", value: kpis.total, icon: FileText, cls: "bg-primary/10 text-primary" },
                { label: "Aprobados", value: kpis.aprobados, icon: CheckCircle, cls: "bg-success/10 text-success" },
                { label: "Rechazados", value: kpis.rechazados, icon: XCircle, cls: "bg-destructive/10 text-destructive" },
                { label: "Pendientes", value: kpis.pendientes, icon: Clock, cls: "bg-muted text-muted-foreground" },
                { label: "En corrección", value: kpis.enCorreccion, icon: AlertTriangle, cls: "bg-warning/10 text-warning" },
                { label: "Calif. prom.", value: kpis.avgScore, icon: TrendingUp, cls: "bg-accent text-accent-foreground" },
                { label: "Tiempo prom.", value: `${kpis.avgTime}m`, icon: Clock, cls: "bg-primary/10 text-primary" },
                { label: "Errores", value: kpis.totalErrors, icon: AlertTriangle, cls: "bg-destructive/10 text-destructive" },
              ].map((k) => (
                <Card key={k.label}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <div className={`rounded-lg p-1.5 ${k.cls}`}><k.icon className="h-3.5 w-3.5" /></div>
                      <div>
                        <p className="text-lg font-bold text-foreground leading-none">{k.value}</p>
                        <p className="text-[10px] text-muted-foreground">{k.label}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts row 1 */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Status pie */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Distribución por Estatus</CardTitle></CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[260px]">
                    <PieChart>
                      <Pie data={statusPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => `${e.name}: ${e.value}`} fontSize={10}>
                        {statusPieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Monthly trend */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Tendencia Mensual</CardTitle></CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[260px]">
                    <LineChart data={monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" fontSize={10} className="fill-muted-foreground" />
                      <YAxis fontSize={10} className="fill-muted-foreground" />
                      <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="aprobados" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 3 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Charts row 2 */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* By branch */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Por Sucursal</CardTitle></CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[280px]">
                    <BarChart data={branchBarData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" fontSize={10} className="fill-muted-foreground" />
                      <YAxis dataKey="name" type="category" width={100} fontSize={10} className="fill-muted-foreground" />
                      <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="avgScore" fill="hsl(var(--warning))" radius={[0, 4, 4, 0]} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* By glosador */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Por Glosador</CardTitle></CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[280px]">
                    <BarChart data={glosadorBarData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" fontSize={10} className="fill-muted-foreground" />
                      <YAxis dataKey="name" type="category" width={100} fontSize={10} className="fill-muted-foreground" />
                      <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} stackId="a" />
                      <Bar dataKey="aprobados" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} stackId="b" />
                      <Bar dataKey="rechazados" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} stackId="b" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Charts row 3 */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* By executive */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Por Ejecutivo</CardTitle></CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[280px]">
                    <BarChart data={executiveBarData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" fontSize={10} className="fill-muted-foreground" />
                      <YAxis dataKey="name" type="category" width={100} fontSize={10} className="fill-muted-foreground" />
                      <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="errorsPerCase" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Top errors */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Top 10 Errores</CardTitle></CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[280px]">
                    <BarChart data={topErrors} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" fontSize={10} className="fill-muted-foreground" />
                      <YAxis dataKey="name" type="category" width={140} fontSize={9} className="fill-muted-foreground" />
                      <Bar dataKey="count" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Detailed table ── */}
          <TabsContent value="table" className="mt-4">
            <Card>
              <CardContent className="pt-4">
                {isLoading ? (
                  <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
                ) : (
                  <div className="rounded-lg border overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Referencia</TableHead>
                          <TableHead className="text-xs">Tipo</TableHead>
                          <TableHead className="text-xs">Sucursal</TableHead>
                          <TableHead className="text-xs">Ejecutivo</TableHead>
                          <TableHead className="text-xs">Glosador</TableHead>
                          <TableHead className="text-xs">Estatus</TableHead>
                          <TableHead className="text-xs">Calificación</TableHead>
                          <TableHead className="text-xs">Errores</TableHead>
                          <TableHead className="text-xs">Correcciones</TableHead>
                          <TableHead className="text-xs">Registrado</TableHead>
                          <TableHead className="text-xs">Aprobado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cases.length === 0 ? (
                          <TableRow><TableCell colSpan={11} className="text-center py-8 text-sm text-muted-foreground">Sin resultados</TableCell></TableRow>
                        ) : cases.map(c => {
                          const s = scoreMap[c.id];
                          return (
                            <TableRow key={c.id}>
                              <TableCell className="text-xs font-medium">{c.reference ?? c.internal_folio}</TableCell>
                              <TableCell className="text-xs">{c.document_types?.name ?? "—"}</TableCell>
                              <TableCell className="text-xs">{c.branches?.nombre ?? "—"}</TableCell>
                              <TableCell className="text-xs">{c.executives?.nombre ?? "—"}</TableCell>
                              <TableCell className="text-xs">{c.glosador?.nombre ?? "—"}</TableCell>
                              <TableCell>
                                <StatusBadge status={c.status} />
                              </TableCell>
                              <TableCell className="text-xs font-mono font-medium">
                                {s?.score_total != null ? s.score_total : "—"}
                              </TableCell>
                              <TableCell className="text-xs font-mono">{s?.total_errors ?? "—"}</TableCell>
                              <TableCell className="text-xs font-mono">{s?.correction_rounds ?? "—"}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{fmtDate(c.registered_at)}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{fmtDate(c.approved_at)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Reportes;
