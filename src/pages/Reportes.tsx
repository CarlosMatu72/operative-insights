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
import { Download, FileSpreadsheet, BarChart3, AlertCircle } from "lucide-react";
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

  const { data: tramites = [], isLoading: loadingTramites } = useQuery({
    queryKey: ["reporte-tramites", dateFrom, dateTo],
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
        .gte("approved_at", dateFrom)
        .lte("approved_at", dateTo + "T23:59:59")
        .order("approved_at", { ascending: false });
      if (error) throw error;

      const ids = (data ?? []).map(c => c.id);
      const { data: findings } = ids.length > 0
        ? await supabase.from("review_findings").select("review_case_id").in("review_case_id", ids)
        : { data: [] as { review_case_id: string }[] };
      const { data: rounds } = ids.length > 0
        ? await supabase.from("review_rounds").select("review_case_id").in("review_case_id", ids)
        : { data: [] as { review_case_id: string }[] };

      const findingsMap: Record<string, number> = {};
      for (const f of findings ?? []) findingsMap[f.review_case_id] = (findingsMap[f.review_case_id] ?? 0) + 1;
      const roundsMap: Record<string, number> = {};
      for (const r of rounds ?? []) roundsMap[r.review_case_id] = (roundsMap[r.review_case_id] ?? 0) + 1;

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
    queryFn: async () => {
      const { data: cases } = await supabase
        .from("review_cases")
        .select("id, reference, approved_at, document_types(name), branches(nombre), clients(nombre)")
        .eq("status", "APROBADO")
        .is("deleted_at", null)
        .gte("approved_at", dateFrom)
        .lte("approved_at", dateTo + "T23:59:59");

      if (!cases || cases.length === 0) return [];
      const caseIds = cases.map(c => c.id);
      const caseMap = Object.fromEntries(cases.map(c => [c.id, c]));

      const { data: findings, error } = await supabase
        .from("review_findings")
        .select(`
          id, review_case_id, current_status, comentario_inicial,
          observation_categories(nombre),
          observation_subcategories(nombre),
          observation_errors(descripcion, codigo_error, descuento_puntos)
        `)
        .in("review_case_id", caseIds)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (findings ?? []).map(f => ({ ...f, case: caseMap[f.review_case_id] }));
    },
    enabled: !!dateFrom && !!dateTo,
  });

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
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Reportes;
