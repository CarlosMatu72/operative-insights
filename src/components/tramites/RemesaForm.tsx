import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCatalogs, useActiveRemesas } from "@/hooks/useCatalogs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export function RemesaForm({ onSuccess }: { onSuccess: () => void }) {
  const { user } = useAuth();
  const { branches, clients, glosadores, documentTypes } = useCatalogs();
  const { data: activeRemesas = [] } = useActiveRemesas();
  const queryClient = useQueryClient();

  const [remesaBaseId, setRemesaBaseId] = useState("");
  const [sucursalId, setSucursalId] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [glosadorId, setGlosadorId] = useState("");

  const selectedRemesa = activeRemesas.find(r => r.id === remesaBaseId);

  const handleRemesaChange = (id: string) => {
    setRemesaBaseId(id);
    const remesa = activeRemesas.find(r => r.id === id);
    if (remesa) {
      setSucursalId(remesa.branch_id ?? "");
      setClienteId(remesa.client_id ?? "");
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedRemesa) throw new Error("Seleccione una remesa activa");
      const docType = (documentTypes.data ?? []).find(d => d.code === "REMESA");
      if (!docType) throw new Error("Tipo REMESA no encontrado");

      // Get next revision number
      const { data: existingRevisions } = await supabase
        .from("review_cases")
        .select("remesa_revision_number")
        .eq("remesa_base_reference", selectedRemesa.remesa_base_reference!)
        .not("remesa_revision_number", "is", null)
        .order("remesa_revision_number", { ascending: false })
        .limit(1);

      const nextRevision = ((existingRevisions?.[0]?.remesa_revision_number) ?? 0) + 1;

      const { data: folio } = await supabase.rpc("generate_internal_folio", { doc_code: "REMESA" });
      if (!folio) throw new Error("Error generando folio");

      const hasGlosador = glosadorId && glosadorId !== "_none";
      const { error } = await supabase.from("review_cases").insert({
        internal_folio: folio,
        reference: `${selectedRemesa.remesa_base_reference}-${nextRevision}`,
        document_type_id: docType.id,
        branch_id: sucursalId || null,
        client_id: clienteId || null,
        assigned_glosador_user_id: hasGlosador ? glosadorId : null,
        status: hasGlosador ? "ASIGNADO" : "REGISTRADO",
        assigned_at: hasGlosador ? new Date().toISOString() : null,
        parent_case_id: selectedRemesa.id,
        remesa_base_reference: selectedRemesa.remesa_base_reference,
        remesa_revision_number: nextRevision,
        is_active_remesa: false,
        created_by: user?.id,
        updated_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Remesa registrada exitosamente");
      setRemesaBaseId("");
      setSucursalId("");
      setClienteId("");
      setGlosadorId("");
      queryClient.invalidateQueries({ queryKey: ["review-cases"] });
      queryClient.invalidateQueries({ queryKey: ["active-remesas"] });
      onSuccess();
    },
    onError: (err: any) => toast.error(err.message || "Error al registrar remesa"),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>Remesa activa *</Label>
          <Select value={remesaBaseId} onValueChange={handleRemesaChange}>
            <SelectTrigger><SelectValue placeholder="Seleccionar remesa base activa" /></SelectTrigger>
            <SelectContent>
              {activeRemesas.length === 0 ? (
                <SelectItem value="_empty" disabled>No hay remesas activas</SelectItem>
              ) : (
                activeRemesas.map(r => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.remesa_base_reference || r.reference} — {(r.branches as any)?.nombre ?? "Sin sucursal"}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
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
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={mutation.isPending || !remesaBaseId}>
          {mutation.isPending ? "Registrando..." : "Registrar Remesa"}
        </Button>
      </div>
    </form>
  );
}
