import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCatalogs, useActiveRemesas } from "@/hooks/useCatalogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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

export function RemesaForm({ onSuccess }: { onSuccess: () => void }) {
  const { user } = useAuth();
  const { glosadores, documentTypes } = useCatalogs();
  const { data: activeRemesas = [] } = useActiveRemesas();
  const queryClient = useQueryClient();

  const [remesaBaseId, setRemesaBaseId] = useState("");
  const [glosadorId, setGlosadorId] = useState("");
  const [rangeInput, setRangeInput] = useState("");

  const selectedRemesa = activeRemesas.find(r => r.id === remesaBaseId);

  const parsedNumbers = useMemo(() => {
    if (!rangeInput.trim()) return [];
    return parseRangeInput(rangeInput);
  }, [rangeInput]);

  const isValidInput = parsedNumbers.length > 0 && parsedNumbers.length <= 100;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedRemesa) throw new Error("Seleccione una remesa activa");
      if (!isValidInput) throw new Error("Ingresa números de remesa válidos");
      const docType = (documentTypes.data ?? []).find(d => d.code === "REMESA");
      if (!docType) throw new Error("Tipo REMESA no encontrado");

      // Check which numbers already exist for this base reference
      const { data: existing } = await supabase
        .from("review_cases")
        .select("remesa_revision_number")
        .eq("remesa_base_reference", selectedRemesa.remesa_base_reference!)
        .not("remesa_revision_number", "is", null);

      const existingNums = new Set((existing ?? []).map(r => r.remesa_revision_number));
      const toCreate = parsedNumbers.filter(n => !existingNums.has(n));
      const duplicates = parsedNumbers.filter(n => existingNums.has(n));

      if (toCreate.length === 0) {
        throw new Error(`Todas las remesas indicadas ya existen: ${duplicates.join(", ")}`);
      }

      // Create remesas sequentially to avoid duplicate folio race condition
      const hasGlosador = glosadorId && glosadorId !== "_none";
      for (const num of toCreate) {
        const { data: folio } = await supabase.rpc("generate_internal_folio", { doc_code: "REMESA" });
        if (!folio) throw new Error("Error generando folio");

        const { error } = await supabase.from("review_cases").insert({
          internal_folio: folio,
          reference: `${selectedRemesa.remesa_base_reference}-${num}`,
          document_type_id: docType.id,
          branch_id: selectedRemesa.branch_id,
          client_id: selectedRemesa.client_id,
          assigned_glosador_user_id: hasGlosador ? glosadorId : null,
          status: hasGlosador ? "ASIGNADO" as const : "REGISTRADO" as const,
          assigned_at: hasGlosador ? new Date().toISOString() : null,
          parent_case_id: selectedRemesa.id,
          remesa_base_reference: selectedRemesa.remesa_base_reference,
          remesa_revision_number: num,
          is_active_remesa: false,
          created_by: user?.id,
          updated_by: user?.id,
        });
        if (error) throw error;
      }

      return { created: toCreate, skipped: duplicates };
    },
    onSuccess: (result) => {
      const msg = result.skipped.length > 0
        ? `${result.created.length} remesa(s) creada(s). Omitidas por duplicado: ${result.skipped.join(", ")}`
        : `${result.created.length} remesa(s) registrada(s) exitosamente`;
      toast.success(msg);
      setRemesaBaseId("");
      setGlosadorId("");
      setRangeInput("");
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
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {isValidInput ? (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            ) : (
              <AlertCircle className="h-4 w-4 text-destructive" />
            )}
            <span className="text-sm font-medium">
              {parsedNumbers.length} remesa{parsedNumbers.length !== 1 ? "s" : ""} a registrar
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {parsedNumbers.slice(0, 50).map(n => (
              <Badge key={n} variant="secondary" className="text-xs">
                {selectedRemesa?.remesa_base_reference ?? "REM"}-{n}
              </Badge>
            ))}
            {parsedNumbers.length > 50 && (
              <Badge variant="outline" className="text-xs">+{parsedNumbers.length - 50} más</Badge>
            )}
          </div>
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
          {mutation.isPending ? "Registrando..." : `Registrar ${parsedNumbers.length > 0 ? parsedNumbers.length : ""} remesa${parsedNumbers.length !== 1 ? "s" : ""}`}
        </Button>
      </div>
    </form>
  );
}
