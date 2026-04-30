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

async function loadJSZip(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).JSZip) { resolve((window as any).JSZip); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    s.onload = () => resolve((window as any).JSZip);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function chunk<T>(arr: T[], n = 100): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function fetchAllPages(
  buildQuery: (from: number, to: number) => any,
  pageSize = 500
): Promise<any[]> {
  const all: any[] = [];
  let page = 0;
  while (true) {
    const from = page * pageSize;
    const { data, error } = await buildQuery(from, from + pageSize - 1);
    if (error || !data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    page++;
  }
  return all;
}

const Reportes = () => {
  const today = format(new Date(), "yyyy-MM-dd");
  const firstOfMonth = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd");

  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [isExporting, setIsExporting] = useState(false);
  const [rankingTipo, setRankingTipo] = useState("all");
  const [isExportingBI, setIsExportingBI] = useState(false);
  const [biProgress, setBiProgress] = useState("");

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
          status, remesas_count, document_types(name, code),
          branches(nombre), clients(nombre), executives(nombre),
          glosador:profiles!review_cases_glosador_profile_fkey(nombre),
          review_scores(score_total, correction_rounds, total_errors),
          review_case_details(customs_key_id, customs_keys(clave))
        `)
        .eq("status", "APROBADO")
        .is("deleted_at", null)
        .gte("approved_at", dateFrom + "T00:00:00-06:00")
        .lte("approved_at", dateTo + "T23:59:59-06:00")
        .limit(200)
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
        return results.flatMap(r => ((r.data ?? []) as unknown as { review_case_id: string }[]));
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

  const tramitesFiltrados = rankingTipo === "all"
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
      // Fetch ALL records for export (no limit)
      let allData: any[] = [];
      let page = 0;
      const pageSize = 1000;
      while (true) {
        const { data: batch } = await supabase
          .from("review_cases")
          .select(`
            id, reference, internal_folio, registered_at, assigned_at, approved_at,
            status, remesas_count, document_types(name, code),
            branches(nombre), clients(nombre), executives(nombre),
            glosador:profiles!review_cases_glosador_profile_fkey(nombre),
            review_scores(score_total, correction_rounds, total_errors),
            review_case_details(customs_key_id, customs_keys(clave))
          `)
          .eq("status", "APROBADO")
          .is("deleted_at", null)
          .gte("approved_at", dateFrom + "T00:00:00-06:00")
          .lte("approved_at", dateTo + "T23:59:59-06:00")
          .order("approved_at", { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (!batch || batch.length === 0) break;
        allData = [...allData, ...batch];
        if (batch.length < pageSize) break;
        page++;
      }

      // Fetch findings and rounds for all IDs using chunking
      const allIds = allData.map(c => c.id);
      const chunkSize = 100;
      const chunks: string[][] = [];
      for (let i = 0; i < allIds.length; i += chunkSize) {
        chunks.push(allIds.slice(i, i + chunkSize));
      }
      const [findingsRaw, roundsRaw] = await Promise.all([
        Promise.all(chunks.map(ch => supabase.from("review_findings").select("review_case_id").in("review_case_id", ch))).then(r => r.flatMap(x => x.data ?? [])),
        Promise.all(chunks.map(ch => supabase.from("review_rounds").select("review_case_id").in("review_case_id", ch))).then(r => r.flatMap(x => x.data ?? [])),
      ]);
      const fMap: Record<string, number> = {};
      for (const f of findingsRaw) fMap[f.review_case_id] = (fMap[f.review_case_id] ?? 0) + 1;
      const rMap: Record<string, number> = {};
      for (const r of roundsRaw) rMap[r.review_case_id] = (rMap[r.review_case_id] ?? 0) + 1;

      const rows = allData.map((c: any) => ({
        "Referencia": c.reference ?? c.internal_folio,
        "Tipo": c.document_types?.name ?? "",
        "Remesas en lote": c.remesas_count ?? 1,
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
        "Núm. revisiones": rMap[c.id] ?? c.review_scores?.[0]?.correction_rounds ?? 0,
        "Núm. observaciones": fMap[c.id] ?? c.review_scores?.[0]?.total_errors ?? 0,
        "Calificación": c.review_scores?.[0]?.score_total ?? "",
        "Glosador": c.glosador?.nombre ?? "",
      }));
      downloadCSV(toCSV(rows), `tramites_evaluados_${dateFrom}_${dateTo}.csv`);
      toast.success(`${rows.length} registros exportados`);
    } catch (e) {
      toast.error("Error al exportar");
    } finally {
      setIsExporting(false);
    }
  }, [dateFrom, dateTo]);

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

  const exportPowerBI = useCallback(async () => {
    setIsExportingBI(true);
    setBiProgress("Cargando compresor...");
    try {
      const JSZip = await loadJSZip();
      const zip = new JSZip();
      const BOM = "\uFEFF";
      const tz = "T00:00:00-06:00";
      const tzEnd = "T23:59:59-06:00";

      // ── HOJA 1: TRÁMITES ──────────────────────────────────────────────
      setBiProgress("Descargando trámites (1/4)...");
      const casesData = await fetchAllPages((from, to) =>
        supabase.from("review_cases")
          .select(`
            id, reference, internal_folio, status,
            registered_at, assigned_at, approved_at, rejected_at,
            first_started_at, remesas_count, remesa_lote_descripcion,
            document_types(name),
            branches(nombre), clients(nombre), executives(nombre),
            glosador:profiles!review_cases_glosador_profile_fkey(nombre),
            review_scores(score_total, score_classification, score_observations,
              score_revisions, correction_rounds, total_errors),
            review_case_details(partidas, customs_keys(clave), comments_generales)
          `)
          .in("status", ["APROBADO", "RECHAZADO"])
          .is("deleted_at", null)
          .gte("registered_at", dateFrom + tz)
          .lte("registered_at", dateTo + tzEnd)
          .order("registered_at", { ascending: false })
          .range(from, to)
      );

      const rejectedIds = casesData.filter((c: any) => c.status === "RECHAZADO").map((c: any) => c.id);
      const rejections: any[] = rejectedIds.length > 0
        ? (await Promise.all(
            chunk(rejectedIds).map(ch =>
              supabase.from("rejection_histories")
                .select("review_case_id, motivo, comentario, rejected_at")
                .in("review_case_id", ch)
                .order("rejected_at", { ascending: false })
            )
          )).flatMap(r => r.data ?? [])
        : [];
      const rejMap: Record<string, any> = {};
      for (const r of rejections) {
        if (!rejMap[r.review_case_id]) rejMap[r.review_case_id] = r;
      }

      const allIds = casesData.map((c: any) => c.id);
      const [sessionsRaw, commentsRaw, roundsRaw] = await Promise.all([
        Promise.all(chunk(allIds).map(ch =>
          supabase.from("review_sessions")
            .select("review_case_id, duration_seconds")
            .in("review_case_id", ch)
        )).then(r => r.flatMap(x => x.data ?? [])),
        Promise.all(chunk(allIds).map(ch =>
          supabase.from("review_comments")
            .select("review_case_id")
            .in("review_case_id", ch)
        )).then(r => r.flatMap(x => x.data ?? [])),
        Promise.all(chunk(allIds).map(ch =>
          supabase.from("review_rounds")
            .select("review_case_id")
            .in("review_case_id", ch)
        )).then(r => r.flatMap(x => x.data ?? [])),
      ]);
      const sesMap: Record<string, number> = {};
      for (const s of sessionsRaw)
        sesMap[s.review_case_id] = (sesMap[s.review_case_id] ?? 0) + (s.duration_seconds ?? 0);
      const comMap: Record<string, number> = {};
      for (const c of commentsRaw)
        comMap[c.review_case_id] = (comMap[c.review_case_id] ?? 0) + 1;
      const rndMap: Record<string, number> = {};
      for (const r of roundsRaw)
        rndMap[r.review_case_id] = (rndMap[r.review_case_id] ?? 0) + 1;

      const tramitesRows = casesData.map((c: any) => ({
        "tramite_id": c.id,
        "folio_interno": c.internal_folio,
        "referencia": c.reference ?? c.internal_folio,
        "tipo_tramite": c.document_types?.name ?? "",
        "remesas_en_lote": c.remesas_count ?? 1,
        "descripcion_lote": c.remesa_lote_descripcion
          ? `="${c.remesa_lote_descripcion}"`
          : "",
        "sucursal": c.branches?.nombre ?? "",
        "cliente": c.clients?.nombre ?? "",
        "ejecutivo": c.executives?.nombre ?? "",
        "glosador": c.glosador?.nombre ?? "",
        "clave_aduanera": c.review_case_details?.[0]?.customs_keys?.clave ?? "",
        "partidas": c.review_case_details?.[0]?.partidas ?? "",
        "comentarios_generales": c.review_case_details?.[0]?.comments_generales ?? "",
        "estatus_final": c.status,
        "motivo_rechazo": rejMap[c.id]?.motivo ?? "",
        "comentario_rechazo": rejMap[c.id]?.comentario ?? "",
        "fecha_registro": fmt(c.registered_at, "date"),
        "hora_registro": fmt(c.registered_at, "time"),
        "fecha_asignacion": fmt(c.assigned_at, "date"),
        "hora_asignacion": fmt(c.assigned_at, "time"),
        "fecha_inicio_glosa": fmt(c.first_started_at, "date"),
        "hora_inicio_glosa": fmt(c.first_started_at, "time"),
        "fecha_aprobacion": fmt(c.approved_at, "date"),
        "hora_aprobacion": fmt(c.approved_at, "time"),
        "fecha_rechazo": fmt(c.rejected_at, "date"),
        "hora_rechazo": fmt(c.rejected_at, "time"),
        "dias_ciclo": c.registered_at && (c.approved_at || c.rejected_at)
          ? Math.round((new Date(c.approved_at ?? c.rejected_at).getTime() -
              new Date(c.registered_at).getTime()) / 86400000)
          : "",
        "tiempo_total_minutos": sesMap[c.id]
          ? Math.round(sesMap[c.id] / 60)
          : "",
        "num_revisiones": rndMap[c.id] ?? c.review_scores?.[0]?.correction_rounds ?? 0,
        "num_observaciones": c.review_scores?.[0]?.total_errors ?? 0,
        "num_comentarios": comMap[c.id] ?? 0,
        "calificacion_total": c.review_scores?.[0]?.score_total ?? "",
        "pts_errores": c.review_scores?.[0]?.score_classification ?? "",
        "pts_observaciones": c.review_scores?.[0]?.score_observations ?? "",
        "pts_revisiones": c.review_scores?.[0]?.score_revisions ?? "",
      }));
      zip.file("1_tramites.csv", BOM + toCSV(tramitesRows));

      // ── HOJA 2: OBSERVACIONES ─────────────────────────────────────────
      setBiProgress("Descargando observaciones (2/4)...");
      const findingsData = allIds.length > 0 ? (await Promise.all(
        chunk(allIds).map(ch =>
          supabase.from("review_findings")
            .select(`
              id, review_case_id, created_at, current_status,
              comentario_inicial,
              observation_categories(nombre),
              observation_subcategories(nombre),
              observation_errors(descripcion, codigo_error, descuento_puntos),
              finding_histories(new_status, comment, created_at)
            `)
            .in("review_case_id", ch)
            .order("created_at", { ascending: true })
        )
      )).flatMap(r => r.data ?? []) : [];
      console.log(`[PowerBI] findings: ${findingsData.length}, sessions: 0, comments: 0`);

      const caseCtx: Record<string, any> = {};
      for (const c of casesData)
        caseCtx[c.id] = {
          ref: c.reference ?? c.internal_folio,
          sucursal: c.branches?.nombre ?? "",
          glosador: c.glosador?.nombre ?? "",
        };

      const obsRows = findingsData.map((f: any) => {
        const histories = [...(f.finding_histories ?? [])]
          .sort((a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const latestEval = histories.find((h: any) =>
          ["CORRECTED","NOT_CORRECTED","PARTIALLY_CORRECTED"].includes(h.new_status));
        return {
          "observacion_id": f.id,
          "tramite_id": f.review_case_id,
          "referencia": caseCtx[f.review_case_id]?.ref ?? "",
          "sucursal": caseCtx[f.review_case_id]?.sucursal ?? "",
          "glosador": caseCtx[f.review_case_id]?.glosador ?? "",
          "fecha_registro_obs": fmt(f.created_at, "date"),
          "hora_registro_obs": fmt(f.created_at, "time"),
          "categoria": f.observation_categories?.nombre ?? "",
          "subcategoria": f.observation_subcategories?.nombre ?? "",
          "error": f.observation_errors?.descripcion ?? "",
          "codigo_error": f.observation_errors?.codigo_error ?? "",
          "puntos_descontados": f.observation_errors?.descuento_puntos ?? "",
          "comentario_glosador": f.comentario_inicial ?? "",
          "estatus_obs": f.current_status,
          "comentario_evaluacion": latestEval?.comment ?? "",
          "resultado_evaluacion": latestEval?.new_status ?? "",
        };
      });
      zip.file("2_observaciones.csv", BOM + toCSV(obsRows));

      // ── HOJA 3: COMENTARIOS ───────────────────────────────────────────
      setBiProgress("Descargando comentarios (3/4)...");
      const commentsData = allIds.length > 0 ? (await Promise.all(
        chunk(allIds).map(ch =>
          supabase.from("review_comments")
            .select(`
              id, review_case_id, comment_text, created_at, is_closed, closed_at,
              observation_categories(nombre),
              observation_subcategories(nombre),
              author:profiles!review_comments_created_by_fkey(nombre)
            `)
            .in("review_case_id", ch)
            .order("created_at", { ascending: true })
        )
      )).flatMap(r => r.data ?? []) : [];

      const comRows = commentsData.map((c: any) => ({
        "comentario_id": c.id,
        "tramite_id": c.review_case_id,
        "referencia": caseCtx[c.review_case_id]?.ref ?? "",
        "sucursal": caseCtx[c.review_case_id]?.sucursal ?? "",
        "categoria": c.observation_categories?.nombre ?? "",
        "subcategoria": c.observation_subcategories?.nombre ?? "",
        "texto": c.comment_text,
        "autor": c.author?.nombre ?? "",
        "fecha_creacion": fmt(c.created_at, "date"),
        "hora_creacion": fmt(c.created_at, "time"),
        "cerrado": c.is_closed ? "Sí" : "No",
        "fecha_cierre": fmt(c.closed_at, "date"),
      }));
      zip.file("3_comentarios.csv", BOM + toCSV(comRows));

      // ── HOJA 4: SESIONES ──────────────────────────────────────────────
      setBiProgress("Descargando sesiones (4/4)...");
      const sessionsData = allIds.length > 0 ? (await Promise.all(
        chunk(allIds).map(ch =>
          supabase.from("review_sessions")
            .select(`
              id, review_case_id, started_at, paused_at,
              duration_seconds, session_status
            `)
            .in("review_case_id", ch)
            .order("started_at", { ascending: true })
        )
      )).flatMap(r => r.data ?? []) : [];
      console.log(`[PowerBI] tramites: ${casesData.length}, findings: ${findingsData.length}, sessions: ${sessionsData.length}, comments: ${commentsData.length}`);

      const sesCountMap: Record<string, number> = {};
      const sesRows = sessionsData.map((s: any) => {
        sesCountMap[s.review_case_id] = (sesCountMap[s.review_case_id] ?? 0) + 1;
        return {
          "sesion_id": s.id,
          "tramite_id": s.review_case_id,
          "referencia": caseCtx[s.review_case_id]?.ref ?? "",
          "glosador": caseCtx[s.review_case_id]?.glosador ?? "",
          "numero_sesion": sesCountMap[s.review_case_id],
          "fecha_inicio": fmt(s.started_at, "date"),
          "hora_inicio": fmt(s.started_at, "time"),
          "duracion_minutos": s.duration_seconds
            ? Math.round(s.duration_seconds / 60)
            : "",
          "estatus_sesion": s.session_status,
        };
      });
      zip.file("4_sesiones.csv", BOM + toCSV(sesRows));

      setBiProgress("Comprimiendo archivos...");
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte_powerbi_${dateFrom}_${dateTo}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(
        `ZIP generado: ${tramitesRows.length} trámites · ${obsRows.length} obs · ${comRows.length} comentarios · ${sesRows.length} sesiones`
      );
    } catch (e) {
      console.error(e);
      toast.error("Error al generar el reporte");
    } finally {
      setIsExportingBI(false);
      setBiProgress("");
    }
  }, [dateFrom, dateTo]);

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

            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-sm font-medium">Reporte Power BI</p>
                  <p className="text-xs text-muted-foreground">
                    ZIP con 4 hojas: trámites, observaciones, comentarios y sesiones
                    — aprobados y rechazados del período seleccionado
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {biProgress && (
                    <span className="text-xs text-muted-foreground animate-pulse">
                      {biProgress}
                    </span>
                  )}
                  <Button
                    onClick={exportPowerBI}
                    disabled={isExportingBI}
                    variant="outline"
                    className="gap-2"
                  >
                    {isExportingBI ? (
                      <><div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Generando...</>
                    ) : (
                      <><Download className="h-4 w-4" /> Descargar ZIP (Power BI)</>
                    )}
                  </Button>
                </div>
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
              {tramites.length >= 200 && (
                <CardHeader className="pb-3">
                  <p className="text-xs text-warning flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Vista previa limitada a 200 registros. El CSV descarga todos los trámites del período.
                  </p>
                </CardHeader>
              )}
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
