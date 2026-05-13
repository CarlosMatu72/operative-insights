import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCatalogs } from "@/hooks/useCatalogs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { PrefixReferenceInput } from "./PrefixReferenceInput";

export function AltaRemesaForm({ onSuccess }: { onSuccess: () => void }) {
  const { user } = useAuth();
  const { branches, clients, documentTypes } = useCatalogs();
  const queryClient = useQueryClient();

  const [selectedPrefix, setSelectedPrefix] = useState("");
  const [referenceSuffix, setReferenceSuffix] = useState("");
  const [sucursalId, setSucursalId] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [totalEsperado, setTotalEsperado] = useState("");

  const fullReference = selectedPrefix ? `${selectedPrefix}${referenceSuffix}` : "";

  const mutation = useMutation({
    mutationFn: async () => {
      const docTypeAlta = (documentTypes.data ?? []).find(d => d.code === "ALTA_REMESA");
      const docTypeRemesa = (documentTypes.data ?? []).find(d => d.code === "REMESA");
      if (!docTypeAlta || !docTypeRemesa) throw new Error("Tipos de documento no encontrados");

      if (!selectedPrefix) {
        throw new Error("Debes seleccionar un prefijo de referencia");
      }
      if (referenceSuffix.trim().length !== 7) {
        throw new Error("El código de referencia debe tener exactamente 7 caracteres");
      }

      const { count } = await supabase
        .from("review_cases")
        .select("id", { count: "exact", head: true })
        .eq("reference", fullReference)
        .eq("document_type_id", docTypeAlta.id)
        .is("deleted_at", null);
      if (count && count > 0) throw new Error(`La referencia "${fullReference}" ya existe en el sistema`);

      const { data: folioAlta } = await supabase.rpc("generate_internal_folio", { doc_code: "ALTA_REMESA" });
      if (!folioAlta) throw new Error("Error generando folio");

      const { error: altaError } = await supabase.from("review_cases").insert({
        internal_folio: folioAlta,
        reference: fullReference,
        document_type_id: docTypeAlta.id,
        branch_id: sucursalId || null,
        client_id: clienteId || null,
        status: "REGISTRADO",
        remesa_base_reference: fullReference,
        is_active_remesa: true,
        total_remesas_esperadas: totalEsperado ? parseInt(totalEsperado) : null,
        created_by: user?.id,
        updated_by: user?.id,
      }).select().single();
      if (altaError) throw altaError;
    },
    onSuccess: () => {
      toast.success("Alta de Remesa registrada. Ya puedes agregar revisiones con el formulario de Remesa.");
      setSelectedPrefix("");
      setReferenceSuffix("");
      setSucursalId("");
      setClienteId("");
      setTotalEsperado("");
      queryClient.invalidateQueries({ queryKey: ["review-cases"] });
      queryClient.invalidateQueries({ queryKey: ["active-remesas"] });
      onSuccess();
    },
    onError: (err: Error) => toast.error(err.message || "Error al registrar alta de remesa"),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <PrefixReferenceInput
            selectedPrefix={selectedPrefix}
            referenceSuffix={referenceSuffix}
            onPrefixChange={(prefix, branchId) => {
              setSelectedPrefix(prefix);
              setSucursalId(branchId);
            }}
            onSuffixChange={setReferenceSuffix}
          />
        </div>
        <div className="space-y-2">
          <Label>Sucursal</Label>
          <Select value={sucursalId} onValueChange={setSucursalId} disabled={!!selectedPrefix}>
            <SelectTrigger><SelectValue placeholder="Seleccionar sucursal" /></SelectTrigger>
            <SelectContent>
              {(branches.data ?? []).map(b => (
                <SelectItem key={b.id} value={b.id}>{b.nombre} ({b.clave})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedPrefix && sucursalId && (
            <p className="text-xs text-muted-foreground">
              Auto-seleccionada por el prefijo "{selectedPrefix}"
            </p>
          )}
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
        Una vez registrada, podrás agregar revisiones de remesa desde la pestaña "Remesa".
      </p>
      <div className="flex justify-end">
        <Button type="submit" disabled={mutation.isPending || !selectedPrefix || referenceSuffix.trim().length !== 7}>
          {mutation.isPending ? "Registrando..." : "Registrar Alta de Remesa"}
        </Button>
      </div>
    </form>
  );
}
