import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCatalogs, useActiveRemesas } from "@/hooks/useCatalogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2 } from "lucide-react";

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

function buildLoteDescription(numbers: number[]): string {
  if (numbers.length === 0) return "";
  const sorted = [...numbers].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0], end = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) { end = sorted[i]; }
    else { ranges.push(start === end ? `${start}` : `${start}-${end}`); start = end = sorted[i]; }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return ranges.join(", ");
}

export function RemesaForm({ onSuccess }: { onSuccess: () => void }) {
  const { user } = useAuth();
  const { glosadores, documentTypes } = useCatalogs();
  const { data: activeRemesas = [] } = useActiveRemesas();
  const queryClient = useQueryClient();

  const [remesaBaseId, setRemesaBaseId] = useState("");
  const [glosadorId, setGlosadorId] = useState("");
  const [rangeInput, setRangeInput] = useState("");
  const [remesasCountOverride, setRemesasCountOverride] = useState<number | null>(null);

  const selectedRemesa = activeRemesas.find(r => r.id === remesaBaseId);

  const parsedNumbers = useMemo(() => {
    if (!rangeInput.trim()) return [];
    return parseRangeInput(rangeInput);
  }, [rangeInput]);

  const isValidInput = parsedNumbers.length > 0 && parsedNumbers.length <= 100;
  const calculatedCount = parsedNumbers.length;
  const effectiveCount = remesasCountOverride ?? calculatedCount;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedRemesa) throw new Error("Seleccione una remesa activa");
      if (!isValidInput) throw new Error("Ingresa números de remesa válidos");
      const docType = (documentTypes.data ?? []).find(d => d.code === "REMESA");
      if (!docType) throw new Error("Tipo REMESA no encontrado");

      const loteDescripcion = buildLoteDescription(parsedNumbers);
      const referencia = `${selectedRemesa.remesa_base_reference} - ${loteDescripcion}`;

      // Check this lote reference doesn't already exist
      const { count } = await supabase
        .from("review_cases")
        .select("id", { count: "exact", head: true })
        .eq("reference", referencia)
        .eq("remesa_base_reference", selectedRemesa.remesa_base_reference!)
        .is("deleted_at", null);
      if (count && count > 0) {
        throw new Error(`Ya existe un registro para el lote "${loteDescripcion}" de esta remesa`);
      }

      const { data: folio } = await supabase.rpc("generate_internal_folio", { doc_code: "REMESA" });
      if (!folio) throw new Error("Error generando folio");

      const hasGlosador = glosadorId && glosadorId !== "_none";

      const { error } = await supabase.from("review_cases").insert({
        internal_folio: folio,
        reference: referencia,
        document_type_id: docType.id,
        branch_id: selectedRemesa.branch_id,
        client_id: selectedRemesa.client_id,
        assigned_glosador_user_id: hasGlosador ? glosadorId : null,
        status: hasGlosador ? "ASIGNADO" as const : "REGISTRADO" as const,
        assigned_at: hasGlosador ? new Date().toISOString() : null,
        parent_case_id: selectedRemesa.id,
        remesa_base_reference: selectedRemesa.remesa_base_reference,
        remesa_revision_number: parsedNumbers[0],
        remesa_lote_descripcion: loteDescripcion,
        is_active_remesa: false,
        created_by: user?.id,
        updated_by: user?.id,
      });
      if (error) throw error;

      return { referencia, loteDescripcion };
    },
    onSuccess: (result) => {
      toast.success(`Remesa registrada: ${result.referencia}`);
      setRemesaBaseId(""); setGlosadorId(""); setRangeInput("");
      queryClient.invalidateQueries({ queryKey: ["review-cases"] });
      queryClient.invalidateQueries({ queryKey: ["active-remesas"] });
      queryClient.invalidateQueries({ queryKey: ["pendientes"] });
      queryClient.invalidateQueries({ queryKey: ["tablero-kpis"] });
      onSuccess();
    },
    onError: (err: Error) => toast.error(err.message || "Error al registrar remesas"),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
      <div className="space-y-2">
        <Label>Remesa base activa *</Label>
        <Select value={remesaBaseId} onValueChange={setRemesaBaseId}>
          <SelectTrigger><SelectValue placeholder="Seleccionar remesa base activa" /></SelectTrigger>
          <SelectContent>
            {activeRemesas.length === 0 ? (
              <SelectItem value="_empty" disabled>No hay remesas activas</SelectItem>
            ) : (
              activeRemesas.map(r => (
                <SelectItem key={r.id} value={r.id}>
                  {r.remesa_base_reference || r.reference} — {r.branches?.nombre ?? "Sin sucursal"}
                  {r.total_remesas_esperadas ? ` (${r.total_remesas_esperadas} esperadas)` : ""}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {selectedRemesa && (
        <div className="text-sm text-muted-foreground">
          Sucursal: {selectedRemesa.branches?.nombre ?? "—"}
          {"  ·  "}
          Cliente: {selectedRemesa.clients?.nombre ?? "—"}
          {selectedRemesa.total_remesas_esperadas && (
            <>
              {"  ·  "}
              Total esperado: {selectedRemesa.total_remesas_esperadas}
            </>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label>Números de remesa a registrar *</Label>
        <Input
          value={rangeInput}
          onChange={e => setRangeInput(e.target.value)}
          placeholder="Ej: 1-10, 13, 25-27"
          disabled={!remesaBaseId}
        />
        <p className="text-xs text-muted-foreground">
          Usa rangos (1-10) o números individuales separados por coma (11, 13, 25).
        </p>
      </div>

      {parsedNumbers.length > 0 && (
        <div className="rounded-lg border bg-card p-3 space-y-1">
          <div className="flex items-center gap-2">
            {isValidInput ? (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            ) : (
              <AlertCircle className="h-4 w-4 text-destructive" />
            )}
            <span className="text-sm font-medium">
              Lote: <span className="font-mono">{buildLoteDescription(parsedNumbers)}</span>
              <span className="text-muted-foreground ml-2">({parsedNumbers.length} remesas)</span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Referencia: <span className="font-mono">{selectedRemesa?.remesa_base_reference} - {buildLoteDescription(parsedNumbers)}</span>
          </p>
          {parsedNumbers.length > 100 && (
            <p className="text-xs text-destructive">Máximo 100 remesas por registro. Divide en lotes.</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label>Glosador (opcional)</Label>
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

      <div className="flex justify-end">
        <Button type="submit" disabled={mutation.isPending || !remesaBaseId || !isValidInput}>
          {mutation.isPending ? "Registrando..." : "Registrar Remesa"}
        </Button>
      </div>
    </form>
  );
}
