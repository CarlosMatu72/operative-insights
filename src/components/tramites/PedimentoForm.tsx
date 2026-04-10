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

export function PedimentoForm({ onSuccess }: { onSuccess: () => void }) {
  const { user } = useAuth();
  const { branches, executives, glosadores, documentTypes } = useCatalogs();
  const queryClient = useQueryClient();

  const [referencia, setReferencia] = useState("");
  const [sucursalId, setSucursalId] = useState("");
  const [ejecutivoId, setEjecutivoId] = useState("");
  const [glosadorId, setGlosadorId] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const docType = (documentTypes.data ?? []).find(d => d.code === "PEDIMENTO");
      if (!docType) throw new Error("Tipo de documento PEDIMENTO no encontrado");

      // Minimum length validation
      if (referencia.trim().length < 11) {
        throw new Error("La referencia debe tener al menos 11 caracteres");
      }

      // Check for duplicate reference
      if (referencia.trim()) {
        const { count } = await supabase
          .from("review_cases")
          .select("id", { count: "exact", head: true })
          .eq("reference", referencia.trim());
        if (count && count > 0) throw new Error(`La referencia "${referencia.trim()}" ya existe en el sistema`);
      }

      const { data: folio } = await supabase.rpc("generate_internal_folio", { doc_code: "PEDIMENTO" });
      if (!folio) throw new Error("Error generando folio");

      const hasGlosador = glosadorId && glosadorId !== "_none";
      const { error } = await supabase.from("review_cases").insert({
        internal_folio: folio,
        reference: referencia,
        document_type_id: docType.id,
        branch_id: sucursalId || null,
        executive_id: ejecutivoId || null,
        assigned_glosador_user_id: hasGlosador ? glosadorId : null,
        status: hasGlosador ? "ASIGNADO" : "REGISTRADO",
        assigned_at: hasGlosador ? new Date().toISOString() : null,
        created_by: user?.id,
        updated_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pedimento registrado exitosamente");
      setReferencia("");
      setSucursalId("");
      setEjecutivoId("");
      setGlosadorId("");
      queryClient.invalidateQueries({ queryKey: ["review-cases"] });
      onSuccess();
    },
    onError: (err: Error) => toast.error(err.message || "Error al registrar pedimento"),
  });

  const filteredExecs = (executives.data ?? []).filter(
    e => !sucursalId || e.sucursal_id === sucursalId
  );

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Referencia *</Label>
          <Input value={referencia} onChange={e => setReferencia(e.target.value)} required minLength={11} placeholder="Ej: REF-2026-001" />
          <p className="text-xs text-muted-foreground">Mínimo 11 caracteres</p>
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
          <Label>Ejecutivo</Label>
          <Select value={ejecutivoId} onValueChange={setEjecutivoId}>
            <SelectTrigger><SelectValue placeholder="Seleccionar ejecutivo" /></SelectTrigger>
            <SelectContent>
              {filteredExecs.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
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
        <Button type="submit" disabled={mutation.isPending || !referencia || referencia.trim().length < 11}>
          {mutation.isPending ? "Registrando..." : "Registrar Pedimento"}
        </Button>
      </div>
    </form>
  );
}
