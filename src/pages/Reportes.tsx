import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileSpreadsheet, BarChart3, AlertCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

function fmt(d: string | null, type: "date" | "time" = "date") {
  if (!d) return "";
  const dt = parseISO(d);
  if (type === "date") return format(dt, "dd/MM/yyyy", { locale: es });
  return format(dt, "HH:mm", { locale: es });
}

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(","),
    ...rows.map(r => headers.map(h => escape(r[h])).join(","))
  ].join("\n");
}

function downloadCSV(csv: string, filename: string) {
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const Reportes = () => {
  const today = format(new Date(), "yyyy-MM-dd");
  const firstOfMonth = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd");

  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [isExporting, setIsExporting] = useState(false);
  const [rankingTipo, setRankingTipo] = useState("all");

  const chunkIds = <T,>(arr: T[], size = 100): T[][] => {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };

  const { data: tramites = [], isLoading: loadingTramites } = useQuery({
    queryKey: ["reporte-tramites", dateFrom, dateTo],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("review_cases")
        .select(`
          id, reference, internal_folio, registered_at, assigned_at, approved_at,
          status, document_types(name, code),
          branches(nombre), clients(nombre), executives(nombre),
          glosador:profiles!review_cases_glosador_profile_fkey(nombre),
          review_scores(score_total, correction_rounds, total_errors),
          review_case_details(customs_key_id, customs_keys(clave))
        `)
        .eq("status", "APROBADO")
        .is("deleted_at", null)
        .gte("approved_at", dateFrom + "T00:00:00-06:00")
        .lte("approved_at", dateTo + "T23:59:59-06:00")
        .limit(500)
        .order("approved_at", { ascending: false });
      if (error) throw error;

      const ids = (data ?? []).map(c => c.id);

      const fetchCounted = async (table: string, ids: string[]) => {
        if (ids.length === 0) return [] as { review_case_id: string }[];
        const results = await Promise.all(
          chunkIds(ids).map(chunk =>
            supabase.from(table as any).select("review_case_id").in("review_case_id", chunk)
          )
        );
        return results.flatMap(r => (r.data ?? []) as { review_case_id: string }[]);
      };

      const [findingsRaw, roundsRaw] = await Promise.all([
        fetchCounted("review_findings", ids),
        fetchCounted("review_rounds", ids),
      ]);

      const findingsMap: Record<string, number> = {};
      for (const f of findingsRaw) findingsMap[f.review_case_id] = (findingsMap[f.review_case_id] ?? 0) + 1;
      const roundsMap: Record<string, number> = {};
      for (const r of roundsRaw) roundsMap[r.review_case_id] = (roundsMap[r.review_case_id] ?? 0) + 1;

      return (data ?? []).map(c => ({
        ...c,
        findingsCount: findingsMap[c.id] ?? 0,
        roundsCount: roundsMap[c.id] ?? 0,
      }));
    },
    enabled: !!dateFrom && !!dateTo,
  });

  const { data: observaciones = [], isLoading: loadingObs } = useQuery({
    queryKey: ["reporte-observaciones", dateFrom, dateTo],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: cases } = await supabase
        .from("review_cases")
        .select("id, reference, approved_at, document_types(name), branches(nombre), clients(nombre)")
        .eq("status", "APROBADO")
        .is("deleted_at", null)
        .gte("approved_at", dateFrom + "T00:00:00-06:00")
        .lte("approved_at", dateTo + "T23:59:59-06:00");

      if (!cases || cases.length === 0) return [];
      const caseIds = cases.map(c => c.id);
      const caseMap = Object.fromEntries(cases.map(c => [c.id, c]));

      const findingChunks = await Promise.all(
        chunkIds(caseIds).map(chunk =>
          supabase.from("review_findings").select(`
            id, review_case_id, current_status, comentario_inicial,
            observation_categories(nombre),
            observation_subcategories(nombre),
            observation_errors(descripcion, codigo_error, descuento_puntos)
          `).in("review_case_id", chunk).order("created_at", { ascending: true })
        )
      );
      const allFindings = findingChunks.flatMap(r => r.data ?? []);
      return allFindings.map((f: any) => ({ ...f, case: caseMap[f.review_case_id] }));
    },
    enabled: !!dateFrom && !!dateTo,
  });

  const { data: tramitesAll = [] } = useQuery({
    queryKey: ["reporte-ranking", dateFrom, dateTo],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("review_cases")
        .select(`
          id, status, approved_at,
          branches(nombre),
          executives(nombre),
          document_types(name, code),
          review_scores(score_total)
        `)
        .eq("status", "APROBADO")
        .is("deleted_at", null)
        .gte("approved_at", dateFrom + "T00:00:00-06:00")
        .lte("approved_at", dateTo + "T23:59:59-06:00")
        .limit(500)
        .order("approved_at", { ascending: false });
      return (data ?? []) as any[];
    },
    enabled: !!dateFrom && !!dateTo,
  });
    ? tramitesAll
    : (tramitesAll as any[]).filter((c: any) => c.document_types?.name === rankingTipo);

  const catStats = (observaciones as any[]).reduce((acc: Record<string, number>, f: any) => {
    const cat = f.observation_categories?.nombre || "Sin categoría";
    acc[cat] = (acc[cat] ?? 0) + 1;
    return acc;
  }, {});
  const sortedCats = Object.entries(catStats).sort((a, b) => (b[1] as number) - (a[1] as number));

  const errorStats = (observaciones as any[]).reduce((acc: Record<string, number>, f: any) => {
    const err = f.observation_errors?.descripcion;
    if (err) acc[err] = (acc[err] ?? 0) + 1;
    return acc;
  }, {});
  const sortedErrors = Object.entries(errorStats).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 10);

  const exportTramites = useCallback(async () => {
    setIsExporting(true);
    try {
      const rows = tramites.map((c: any) => ({
        "Referencia": c.reference ?? c.internal_folio,
        "Tipo": c.document_types?.name ?? "",
        "Ejecutivo": c.executives?.nombre ?? "",
        "Sucursal": c.branches?.nombre ?? "",
        "Cliente": c.clients?.nombre ?? "",
        "Clave pedimento": c.review_case_details?.[0]?.customs_keys?.clave ?? "",
        "Fecha registro": fmt(c.registered_at, "date"),
        "Hora registro": fmt(c.registered_at, "time"),
        "Fecha asignación": fmt(c.assigned_at, "date"),
        "Hora asignación": fmt(c.assigned_at, "time"),
        "Fecha aprobación": fmt(c.approved_at, "date"),
        "Hora aprobación": fmt(c.approved_at, "time"),
        "Núm. revisiones": c.roundsCount ?? c.review_scores?.[0]?.correction_rounds ?? 0,
        "Núm. observaciones": c.findingsCount ?? c.review_scores?.[0]?.total_errors ?? 0,
        "Calificación": c.review_scores?.[0]?.score_total ?? "",
        "Glosador": c.glosador?.nombre ?? "",
      }));
      downloadCSV(toCSV(rows), `tramites_evaluados_${dateFrom}_${dateTo}.csv`);
      toast.success(`${rows.length} registros exportados`);
    } catch {
      toast.error("Error al exportar");
    } finally {
      setIsExporting(false);
    }
  }, [tramites, dateFrom, dateTo]);

  const exportObservaciones = useCallback(async () => {
    setIsExporting(true);
    try {
      const rows = (observaciones as any[]).map(f => ({
        "Referencia": f.case?.reference ?? "",
        "Tipo trámite": f.case?.document_types?.name ?? "",
        "Sucursal": f.case?.branches?.nombre ?? "",
        "Cliente": f.case?.clients?.nombre ?? "",
        "Fecha aprobación": fmt(f.case?.approved_at, "date"),
        "Categoría": f.observation_categories?.nombre ?? "",
        "Subcategoría": f.observation_subcategories?.nombre ?? "",
        "Error": f.observation_errors?.descripcion ?? "",
        "Código error": f.observation_errors?.codigo_error ?? "",
        "Puntos descontados": f.observation_errors?.descuento_puntos ?? "",
        "Estatus observación": f.current_status ?? "",
        "Comentario": f.comentario_inicial ?? "",
      }));
      downloadCSV(toCSV(rows), `observaciones_${dateFrom}_${dateTo}.csv`);
      toast.success(`${rows.length} observaciones exportadas`);
    } catch {
      toast.error("Error al exportar");
    } finally {
      setIsExporting(false);
    }
  }, [observaciones, dateFrom, dateTo]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Reportes</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Exporta datos para análisis en Excel
          </p>
        </div>

        {/* Date range selector */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Desde</Label>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 w-40" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Hasta</Label>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 w-40" />
              </div>
              <div className="text-sm text-muted-foreground pb-1.5">
                {loadingTramites || loadingObs ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : (
                  <>
                    <Badge variant="secondary" className="mr-1">{tramites.length}</Badge> trámites ·{" "}
                    <Badge variant="secondary" className="mr-1">{observaciones.length}</Badge> observaciones
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="tramites">
          <TabsList>
            <TabsTrigger value="tramites" className="gap-1.5">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Trámites evaluados
            </TabsTrigger>
            <TabsTrigger value="observaciones" className="gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              Análisis de observaciones
            </TabsTrigger>
            <TabsTrigger value="ranking" className="gap-1.5 text-xs">
              <BarChart3 className="h-3.5 w-3.5" />
              Ejecutivos y Sucursales
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Trámites */}
          <TabsContent value="tramites">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Todos los trámites aprobados en el período seleccionado con sus métricas completas
              </p>
              <Button onClick={exportTramites} disabled={isExporting || tramites.length === 0} className="gap-2">
                <Download className="h-4 w-4" />
                {isExporting ? "Exportando..." : `Descargar CSV (${tramites.length})`}
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        {["Referencia", "Tipo", "Glosador", "Observaciones", "Revisiones", "Calificación", "Aprobado"].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tramites.slice(0, 10).map((c: any) => (
                        <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-2.5 font-medium">{c.reference ?? c.internal_folio}</td>
                          <td className="px-4 py-2.5">
                            <Badge variant="outline" className="text-xs">{c.document_types?.name ?? "—"}</Badge>
                          </td>
                          <td className="px-4 py-2.5">{c.glosador?.nombre ?? "—"}</td>
                          <td className="px-4 py-2.5">{c.findingsCount ?? "—"}</td>
                          <td className="px-4 py-2.5">{c.roundsCount ?? "—"}</td>
                          <td className="px-4 py-2.5">
                            {c.review_scores?.[0]?.score_total != null ? (
                              <span className={`font-bold ${
                                Number(c.review_scores[0].score_total) >= 85 ? "text-success" :
                                Number(c.review_scores[0].score_total) >= 70 ? "text-warning" : "text-destructive"
                              }`}>{c.review_scores[0].score_total}</span>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-2.5">{fmt(c.approved_at, "date")}</td>
                        </tr>
                      ))}
                      {tramites.length === 0 && !loadingTramites && (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Sin trámites en el período</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {tramites.length > 10 && (
                  <div className="px-4 py-3 text-xs text-muted-foreground border-t bg-muted/30">
                    Mostrando 10 de {tramites.length} — descarga el CSV para ver todos
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Observaciones */}
          <TabsContent value="observaciones">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Análisis de errores y patrones por categoría para planes de acción
              </p>
              <Button onClick={exportObservaciones} disabled={isExporting || observaciones.length === 0} className="gap-2">
                <Download className="h-4 w-4" />
                {isExporting ? "Exportando..." : `Descargar CSV (${observaciones.length})`}
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Top categories */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Observaciones por categoría</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {sortedCats.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
                  ) : sortedCats.map(([cat, count]) => {
                    const pct = Math.round(((count as number) / observaciones.length) * 100);
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-foreground">{cat}</span>
                          <span className="text-muted-foreground">
                            {count as number} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Top errors */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    Top 10 errores más frecuentes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {sortedErrors.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Sin errores registrados</p>
                  ) : sortedErrors.map(([err, count], i) => (
                    <div key={err} className="flex items-start gap-2 text-xs">
                      <span className="text-muted-foreground font-mono w-5 shrink-0">{i + 1}.</span>
                      <span className="flex-1 text-foreground">{err}</span>
                      <Badge variant="secondary" className="text-[10px] shrink-0">{count as number}×</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 3: Ranking ejecutivos y sucursales */}
          <TabsContent value="ranking" className="mt-4 space-y-5">
            {/* Executive ranking table */}
            <Card>
              <CardHeader className="pb-3 flex-row items-center justify-between">
                <CardTitle className="text-sm">Ranking de ejecutivos por calificación</CardTitle>
                <Select value={rankingTipo} onValueChange={setRankingTipo}>
                  <SelectTrigger className="h-8 w-40 text-xs">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    {[...new Set((tramitesAll as any[]).map((c: any) => c.document_types?.name).filter(Boolean))].map((t) => (
                      <SelectItem key={t as string} value={t as string}>{t as string}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="p-0">
                {(() => {
                  const execMap: Record<string, { scores: number[]; nombre: string }> = {};
                  for (const c of tramitesFiltrados as any[]) {
                    const score = c.review_scores?.[0]?.score_total;
                    const nombre = c.executives?.nombre;
                    if (!nombre || score == null) continue;
                    if (!execMap[nombre]) execMap[nombre] = { scores: [], nombre };
                    execMap[nombre].scores.push(Number(score));
                  }
                  const ranking = Object.values(execMap)
                    .map((e) => ({ nombre: e.nombre, avg: Math.round(e.scores.reduce((a, b) => a + b, 0) / e.scores.length), count: e.scores.length }))
                    .sort((a, b) => b.avg - a.avg);
                  return (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">#</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Ejecutivo</th>
                          <th className="text-center px-4 py-2.5 font-semibold text-muted-foreground">Trámites</th>
                          <th className="text-center px-4 py-2.5 font-semibold text-muted-foreground">Prom. Calif.</th>
                          <th className="px-4 py-2.5 w-32"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {ranking.map((e, i) => (
                          <tr key={e.nombre} className="border-b hover:bg-muted/20">
                            <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                            <td className="px-4 py-2 font-medium">{e.nombre}</td>
                            <td className="px-4 py-2 text-center">{e.count}</td>
                            <td className="px-4 py-2 text-center">
                              <span className={`font-bold ${e.avg >= 85 ? "text-success" : e.avg >= 70 ? "text-warning" : "text-destructive"}`}>
                                {e.avg}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div className="h-full rounded-full bg-primary transition-all"
                                  style={{ width: `${e.avg}%` }} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Branch bar chart */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Calificación promedio y trámites por sucursal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(() => {
                  const branchMap: Record<string, { scores: number[]; nombre: string }> = {};
                  for (const c of tramitesFiltrados as any[]) {
                    const score = c.review_scores?.[0]?.score_total;
                    const nombre = c.branches?.nombre;
                    if (!nombre || score == null) continue;
                    if (!branchMap[nombre]) branchMap[nombre] = { scores: [], nombre };
                    branchMap[nombre].scores.push(Number(score));
                  }
                  const branches = Object.values(branchMap)
                    .map((b) => ({ nombre: b.nombre, avg: Math.round(b.scores.reduce((a, v) => a + v, 0) / b.scores.length), count: b.scores.length }))
                    .sort((a, b) => b.avg - a.avg);
                  const maxCount = Math.max(...branches.map((b) => b.count), 1);
                  return branches.map((b) => (
                    <div key={b.nombre} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{b.nombre}</span>
                        <span className="text-muted-foreground text-xs">
                          {b.count} trámite{b.count !== 1 ? "s" : ""} ·
                          <span className={`ml-1 font-bold ${b.avg >= 85 ? "text-success" : b.avg >= 70 ? "text-warning" : "text-destructive"}`}>
                            {b.avg} pts
                          </span>
                        </span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <div className="flex-1 h-5 rounded bg-muted overflow-hidden relative">
                          <div className="h-full rounded bg-primary/80 transition-all"
                            style={{ width: `${b.avg}%` }} />
                          <span className="absolute inset-0 flex items-center px-2 text-[10px] font-medium text-primary-foreground mix-blend-difference">
                            {b.avg}/100
                          </span>
                        </div>
                        <div className="w-16 h-5 rounded bg-secondary/40 overflow-hidden">
                          <div className="h-full rounded bg-secondary transition-all"
                            style={{ width: `${(b.count / maxCount) * 100}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-6 text-right">{b.count}</span>
                      </div>
                    </div>
                  ));
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Reportes;
