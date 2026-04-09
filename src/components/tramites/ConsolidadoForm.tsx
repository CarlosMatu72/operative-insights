import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCatalogs, useActiveRemesas } from "@/hooks/useCatalogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export function ConsolidadoForm({ onSuccess }: { onSuccess: () => void }) {
  const { user } = useAuth();
  const { glosadores, documentTypes } = useCatalogs();
  const { data: activeRemesas = [] } = useActiveRemesas();
  const queryClient = useQueryClient();

  const [remesaBaseId, setRemesaBaseId] = useState("");
  const [glosadorId, setGlosadorId] = useState("");
  const [referenciaConsolidado, setReferenciaConsolidado] = useState("");

  const selectedRemesa = activeRemesas.find(r => r.id === remesaBaseId);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedRemesa) throw new Error("Seleccione una remesa activa");
      const docType = (documentTypes.data ?? []).find(d => d.code === "CONSOLIDADO");
      if (!docType) throw new Error("Tipo CONSOLIDADO no encontrado");

      // Check for duplicate reference
      const refToCheck = referenciaConsolidado || `CON-${selectedRemesa.remesa_base_reference}`;
      if (refToCheck.trim()) {
        const { count } = await supabase
          .from("review_cases")
          .select("id", { count: "exact", head: true })
          .eq("reference", refToCheck.trim());
        if (count && count > 0) throw new Error(`La referencia "${refToCheck.trim()}" ya existe en el sistema`);
      }

      const { data: folio } = await supabase.rpc("generate_internal_folio", { doc_code: "CONSOLIDADO" });
      if (!folio) throw new Error("Error generando folio");

      const hasGlosador = glosadorId && glosadorId !== "_none";

      // Create consolidado inheriting branch and client from remesa
      const { error: insertError } = await supabase.from("review_cases").insert({
        internal_folio: folio,
        reference: referenciaConsolidado || `CON-${selectedRemesa.remesa_base_reference}`,
        document_type_id: docType.id,
        branch_id: selectedRemesa.branch_id,
        client_id: selectedRemesa.client_id,
        assigned_glosador_user_id: hasGlosador ? glosadorId : null,
        status: hasGlosador ? "ASIGNADO" : "REGISTRADO",
        assigned_at: hasGlosador ? new Date().toISOString() : null,
        parent_case_id: selectedRemesa.id,
        remesa_base_reference: selectedRemesa.remesa_base_reference,
        created_by: user?.id,
        updated_by: user?.id,
      });
      if (insertError) throw insertError;

      // Deactivate the remesa base
      const { error: updateError } = await supabase
        .from("review_cases")
        .update({ is_active_remesa: false, updated_by: user?.id })
        .eq("id", selectedRemesa.id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast.success("Consolidado registrado. La remesa base fue desactivada.");
      setRemesaBaseId("");
      setGlosadorId("");
      setReferenciaConsolidado("");
      queryClient.invalidateQueries({ queryKey: ["review-cases"] });
      queryClient.invalidateQueries({ queryKey: ["active-remesas"] });
      onSuccess();
    },
    onError: (err: Error) => toast.error(err.message || "Error al registrar consolidado"),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
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
        <div className="space-y-2">
          <Label>Referencia consolidado (opcional)</Label>
          <Input value={referenciaConsolidado} onChange={e => setReferenciaConsolidado(e.target.value)} placeholder="Ej: CON-2026-001" />
        </div>
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
        <Button type="submit" disabled={mutation.isPending || !remesaBaseId}>
          {mutation.isPending ? "Registrando..." : "Registrar Consolidado"}
        </Button>
      </div>
    </form>
  );
}
