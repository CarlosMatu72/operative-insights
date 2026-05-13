import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCatalogs, useActiveRemesas } from "@/hooks/useCatalogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { PrefixReferenceInput } from "./PrefixReferenceInput";

function parseRangeInput(input: string): number[] {
  const nums = new Set<number>();
  const parts = input.split(",").map(p => p.trim()).filter(Boolean);
  for (const part of parts) {
    if (part.includes("-")) {
      const [a, b] = part.split("-").map(n => parseInt(n.trim()));
      if (!isNaN(a) && !isNaN(b) && a <= b && b - a <= 500) {
        for (let i = a; i <= b; i++) nums.add(i);
      }
    } else {
      const n = parseInt(part);
      if (!isNaN(n) && n > 0) nums.add(n);
    }
  }
  return Array.from(nums).sort((a, b) => a - b);
}

export function ConsolidadoForm({ onSuccess }: { onSuccess: () => void }) {
  const { user } = useAuth();
  const { glosadores, documentTypes } = useCatalogs();
  const { data: activeRemesas = [] } = useActiveRemesas();
  const queryClient = useQueryClient();

  const [remesaBaseId, setRemesaBaseId] = useState("");
  const [glosadorId, setGlosadorId] = useState("");
  const [referenciaConsolidado, setReferenciaConsolidado] = useState("");
  const [sinRemesaBase, setSinRemesaBase] = useState(false);
  const [selectedPrefix, setSelectedPrefix] = useState("");
  const [referenceSuffix, setReferenceSuffix] = useState("");
  const [comentarioFaltantes, setComentarioFaltantes] = useState("");

  const fullReference = selectedPrefix ? `${selectedPrefix}${referenceSuffix}` : "";

  const selectedRemesa = activeRemesas.find(r => r.id === remesaBaseId);

  const { data: remesasRegistradas = [] } = useQuery({
    queryKey: ["remesas-para-consolidado", selectedRemesa?.remesa_base_reference],
    queryFn: async () => {
      if (!selectedRemesa?.remesa_base_reference) return [];
      const { data } = await supabase
        .from("review_cases")
        .select("remesa_lote_descripcion, remesa_revision_number, status, reference")
        .eq("remesa_base_reference", selectedRemesa.remesa_base_reference)
        .not("remesa_lote_descripcion", "is", null)
        .order("remesa_revision_number", { ascending: true });
      return data ?? [];
    },
    enabled: !!selectedRemesa?.remesa_base_reference && !sinRemesaBase,
  });

  const validacionSecuencia = useMemo(() => {
    if (!selectedRemesa || remesasRegistradas.length === 0) return null;

    const coveredNums = new Set<number>();
    for (const r of remesasRegistradas) {
      if (r.remesa_lote_descripcion) {
        parseRangeInput(r.remesa_lote_descripcion).forEach(n => coveredNums.add(n));
      } else if (r.remesa_revision_number) {
        coveredNums.add(r.remesa_revision_number);
      }
    }

    const totalEsperado = selectedRemesa.total_remesas_esperadas;
    if (!totalEsperado) return { faltantes: [] as number[], covered: coveredNums.size, totalEsperado: null };

    const faltantes: number[] = [];
    for (let i = 1; i <= totalEsperado; i++) {
      if (!coveredNums.has(i)) faltantes.push(i);
    }
    return { faltantes, covered: coveredNums.size, totalEsperado };
  }, [remesasRegistradas, selectedRemesa]);

  const mutation = useMutation({
    mutationFn: async () => {
      const docType = (documentTypes.data ?? []).find(d => d.code === "CONSOLIDADO");
      if (!docType) throw new Error("Tipo CONSOLIDADO no encontrado");

      const hasGlosador = glosadorId && glosadorId !== "_none";

      if (sinRemesaBase) {
        if (!referenciaLibre.trim() || referenciaLibre.trim().length < 11) {
          throw new Error("La referencia debe tener al menos 11 caracteres");
        }

        const { count } = await supabase
          .from("review_cases")
          .select("id", { count: "exact", head: true })
          .eq("reference", referenciaLibre.trim())
          .eq("document_type_id", docType.id)
          .is("deleted_at", null);
        if (count && count > 0) {
          throw new Error(`Ya existe un consolidado con la referencia "${referenciaLibre.trim()}"`);
        }

        const { data: folio } = await supabase.rpc("generate_internal_folio", { doc_code: "CONSOLIDADO" });
        if (!folio) throw new Error("Error generando folio");

        const { error: insertError } = await supabase.from("review_cases").insert({
          internal_folio: folio,
          reference: referenciaLibre.trim(),
          document_type_id: docType.id,
          assigned_glosador_user_id: hasGlosador ? glosadorId : null,
          status: hasGlosador ? "ASIGNADO" : "REGISTRADO",
          assigned_at: hasGlosador ? new Date().toISOString() : null,
          created_by: user?.id,
          updated_by: user?.id,
        });
        if (insertError) throw insertError;
      } else {
        if (!selectedRemesa) throw new Error("Seleccione una remesa activa");

        if (validacionSecuencia?.faltantes.length && !comentarioFaltantes.trim()) {
          throw new Error("Debes indicar el motivo de las remesas faltantes antes de consolidar");
        }

        if (referenciaConsolidado.trim()) {
          if (referenciaConsolidado.trim().length < 11) {
            throw new Error("La referencia debe tener al menos 11 caracteres");
          }
          const { count } = await supabase
            .from("review_cases")
            .select("id", { count: "exact", head: true })
            .eq("reference", referenciaConsolidado.trim())
            .eq("document_type_id", docType.id)
            .is("deleted_at", null);
          if (count && count > 0) {
            throw new Error(`Ya existe un consolidado con la referencia "${referenciaConsolidado.trim()}"`);
          }
        }

        const { data: folio } = await supabase.rpc("generate_internal_folio", { doc_code: "CONSOLIDADO" });
        if (!folio) throw new Error("Error generando folio");

        const { error: insertError } = await supabase.from("review_cases").insert({
          internal_folio: folio,
          reference: referenciaConsolidado.trim() || selectedRemesa.remesa_base_reference || `CON-${selectedRemesa.internal_folio}`,
          document_type_id: docType.id,
          branch_id: selectedRemesa.branch_id,
          client_id: selectedRemesa.client_id,
          assigned_glosador_user_id: hasGlosador ? glosadorId : null,
          status: hasGlosador ? "ASIGNADO" : "REGISTRADO",
          assigned_at: hasGlosador ? new Date().toISOString() : null,
          parent_case_id: selectedRemesa.id,
          remesa_base_reference: selectedRemesa.remesa_base_reference,
          remesas_faltantes_comentario: comentarioFaltantes.trim() || null,
          created_by: user?.id,
          updated_by: user?.id,
        });
        if (insertError) throw insertError;

        const { error: updateError } = await supabase
          .from("review_cases")
          .update({ is_active_remesa: false, updated_by: user?.id })
          .eq("id", selectedRemesa.id);
        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      toast.success(sinRemesaBase
        ? "Consolidado registrado sin remesa base."
        : "Consolidado registrado. La remesa base fue desactivada.");
      setRemesaBaseId("");
      setGlosadorId("");
      setReferenciaConsolidado("");
      setReferenciaLibre("");
      setSinRemesaBase(false);
      setComentarioFaltantes("");
      queryClient.invalidateQueries({ queryKey: ["review-cases"] });
      queryClient.invalidateQueries({ queryKey: ["active-remesas"] });
      onSuccess();
    },
    onError: (err: Error) => toast.error(err.message || "Error al registrar consolidado"),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <Checkbox
              id="sin-remesa"
              checked={sinRemesaBase}
              onCheckedChange={(v) => { setSinRemesaBase(!!v); setRemesaBaseId(""); setComentarioFaltantes(""); }}
            />
            <label htmlFor="sin-remesa" className="text-sm cursor-pointer">
              Registrar consolidado sin remesa base previa
            </label>
          </div>
        </div>

        {!sinRemesaBase && (
          <>
            <div className="space-y-2 sm:col-span-2">
              <Label>Remesa activa a consolidar *</Label>
              <Select value={remesaBaseId} onValueChange={setRemesaBaseId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar remesa activa" /></SelectTrigger>
                <SelectContent>
                  {activeRemesas.length === 0 ? (
                    <SelectItem value="_empty" disabled>No hay remesas activas</SelectItem>
                  ) : (
                    activeRemesas.map(r => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.remesa_base_reference || r.reference} — {r.branches?.nombre ?? "Sin sucursal"}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            {selectedRemesa && (
              <div className="sm:col-span-2 rounded-lg bg-accent p-3 text-sm text-accent-foreground">
                <p><strong>Sucursal:</strong> {selectedRemesa.branches?.nombre ?? "—"}</p>
                <p><strong>Cliente:</strong> {selectedRemesa.clients?.nombre ?? "—"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Al consolidar, esta remesa dejará de estar activa para nuevas revisiones.
                </p>
              </div>
            )}

            {validacionSecuencia && (
              <div className="sm:col-span-2 space-y-2">
                {validacionSecuencia.faltantes.length > 0 ? (
                  <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <span className="font-medium text-warning">
                          {validacionSecuencia.faltantes.length} número(s) sin registrar:
                        </span>
                        <span className="text-muted-foreground ml-2 font-mono text-xs">
                          {validacionSecuencia.faltantes.join(", ")}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Motivo de faltantes * (requerido para consolidar)</Label>
                      <Textarea
                        value={comentarioFaltantes}
                        onChange={e => setComentarioFaltantes(e.target.value)}
                        placeholder="Explica por qué estas remesas no fueron enviadas a revisión..."
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                  </div>
                ) : validacionSecuencia.totalEsperado ? (
                  <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                    <span className="text-success font-medium">
                      Secuencia completa: {validacionSecuencia.covered}/{validacionSecuencia.totalEsperado}
                    </span>
                  </div>
                ) : null}
              </div>
            )}

            <div className="space-y-2">
              <Label>Referencia consolidado (opcional)</Label>
              <Input value={referenciaConsolidado} onChange={e => setReferenciaConsolidado(e.target.value)} minLength={11} placeholder={selectedRemesa ? selectedRemesa.remesa_base_reference ?? "Auto-generado" : "Selecciona una remesa primero"} />
              <p className="text-xs text-muted-foreground">Mínimo 11 caracteres si se ingresa manualmente</p>
            </div>
          </>
        )}

        {sinRemesaBase && (
          <div className="space-y-2 sm:col-span-2">
            <Label>Referencia *</Label>
            <Input value={referenciaLibre} onChange={e => setReferenciaLibre(e.target.value)} required minLength={11} placeholder="Ej: CON-2026-001" />
            <p className="text-xs text-muted-foreground">Mínimo 11 caracteres</p>
          </div>
        )}

        <div className="space-y-2">
          <Label>Glosador</Label>
          <Select value={glosadorId} onValueChange={setGlosadorId}>
            <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Sin asignar</SelectItem>
              {(glosadores.data ?? []).map(g => (
                <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={
            mutation.isPending ||
            (!sinRemesaBase && !remesaBaseId) ||
            (sinRemesaBase && !referenciaLibre.trim()) ||
            (!!(validacionSecuencia?.faltantes.length) && !comentarioFaltantes.trim())
          }
        >
          {mutation.isPending ? "Registrando..." : "Registrar Consolidado"}
        </Button>
      </div>
    </form>
  );
}
