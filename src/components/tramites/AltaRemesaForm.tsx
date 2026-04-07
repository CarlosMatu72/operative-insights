import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCatalogs } from "@/hooks/useCatalogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export function AltaRemesaForm({ onSuccess }: { onSuccess: () => void }) {
  const { user } = useAuth();
  const { branches, clients, documentTypes } = useCatalogs();
  const queryClient = useQueryClient();

  const [referencia, setReferencia] = useState("");
  const [sucursalId, setSucursalId] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [totalEsperado, setTotalEsperado] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const docTypeAlta = (documentTypes.data ?? []).find(d => d.code === "ALTA_REMESA");
      const docTypeRemesa = (documentTypes.data ?? []).find(d => d.code === "REMESA");
      if (!docTypeAlta || !docTypeRemesa) throw new Error("Tipos de documento no encontrados");

      // Check for duplicate reference
      if (referencia.trim()) {
        const { count } = await supabase
          .from("review_cases")
          .select("id", { count: "exact", head: true })
          .eq("reference", referencia.trim());
        if (count && count > 0) throw new Error(`La referencia "${referencia.trim()}" ya existe en el sistema`);
      }

      // Create the alta remesa base case
      const { data: folioAlta } = await supabase.rpc("generate_internal_folio", { doc_code: "ALTA_REMESA" });
      if (!folioAlta) throw new Error("Error generando folio");

      const { data: altaCase, error: altaError } = await supabase.from("review_cases").insert({
        internal_folio: folioAlta,
        reference: referencia,
        document_type_id: docTypeAlta.id,
        branch_id: sucursalId || null,
        client_id: clienteId || null,
        status: "REGISTRADO",
        remesa_base_reference: referencia,
        is_active_remesa: true,
        total_remesas_esperadas: totalEsperado ? parseInt(totalEsperado) : null,
        created_by: user?.id,
        updated_by: user?.id,
      }).select().single();
      if (altaError) throw altaError;

      // Create the first remesa revision automatically
      const { data: folioRemesa } = await supabase.rpc("generate_internal_folio", { doc_code: "REMESA" });
      if (!folioRemesa) throw new Error("Error generando folio de remesa");

      const { error: remesaError } = await supabase.from("review_cases").insert({
        internal_folio: folioRemesa,
        reference: `${referencia}-1`,
        document_type_id: docTypeRemesa.id,
        branch_id: sucursalId || null,
        client_id: clienteId || null,
        status: "REGISTRADO",
        parent_case_id: altaCase.id,
        remesa_base_reference: referencia,
        remesa_revision_number: 1,
        is_active_remesa: false,
        created_by: user?.id,
        updated_by: user?.id,
      });
      if (remesaError) throw remesaError;
    },
    onSuccess: () => {
      toast.success("Alta de Remesa registrada con primera revisión creada");
      setReferencia("");
      setSucursalId("");
      setClienteId("");
      queryClient.invalidateQueries({ queryKey: ["review-cases"] });
      queryClient.invalidateQueries({ queryKey: ["active-remesas"] });
      onSuccess();
    },
    onError: (err: any) => toast.error(err.message || "Error al registrar alta de remesa"),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>Referencia *</Label>
          <Input value={referencia} onChange={e => setReferencia(e.target.value)} required placeholder="Ej: REM-2026-001" />
        </div>
        <div className="space-y-2">
          <Label>Sucursal</Label>
          <Select value={sucursalId} onValueChange={setSucursalId}>
            <SelectTrigger><SelectValue placeholder="Seleccionar sucursal" /></SelectTrigger>
            <SelectContent>
              {(branches.data ?? []).map(b => (
                <SelectItem key={b.id} value={b.id}>{b.nombre} ({b.clave})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Cliente</Label>
          <Select value={clienteId} onValueChange={setClienteId}>
            <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
            <SelectContent>
              {(clients.data ?? []).map(c => (
                <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Total de remesas esperadas <span className="text-muted-foreground font-normal">(opcional)</span></Label>
          <Input
            type="number"
            min="1"
            value={totalEsperado}
            onChange={e => setTotalEsperado(e.target.value)}
            placeholder="Ej: 27"
            className="max-w-[120px]"
          />
          <p className="text-xs text-muted-foreground">
            Indica cuántas remesas se revisarán en total. Ayuda a validar el consolidado al cierre.
          </p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Se creará automáticamente la primera revisión de remesa asociada.
      </p>
      <div className="flex justify-end">
        <Button type="submit" disabled={mutation.isPending || !referencia}>
          {mutation.isPending ? "Registrando..." : "Registrar Alta de Remesa"}
        </Button>
      </div>
    </form>
  );
}
