import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCatalogs, useReferencePrefixes } from "@/hooks/useCatalogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function AltaRemesaForm({ onSuccess }: { onSuccess: () => void }) {
  const { user } = useAuth();
  const { branches, clients, documentTypes } = useCatalogs();
  const { data: prefixes = [] } = useReferencePrefixes();
  const queryClient = useQueryClient();

  const [selectedPrefix, setSelectedPrefix] = useState("");
  const [referenceSuffix, setReferenceSuffix] = useState("");
  const [prefixPopoverOpen, setPrefixPopoverOpen] = useState(false);
  const [sucursalId, setSucursalId] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [totalEsperado, setTotalEsperado] = useState("");

  const fullReference = selectedPrefix
    ? `${selectedPrefix}${referenceSuffix}`
    : referenceSuffix;

  const mutation = useMutation({
    mutationFn: async () => {
      const docTypeAlta = (documentTypes.data ?? []).find(d => d.code === "ALTA_REMESA");
      const docTypeRemesa = (documentTypes.data ?? []).find(d => d.code === "REMESA");
      if (!docTypeAlta || !docTypeRemesa) throw new Error("Tipos de documento no encontrados");

      if (fullReference.trim().length < 11) {
        throw new Error("La referencia debe tener al menos 11 caracteres");
      }

      if (fullReference.trim()) {
        const { count } = await supabase
          .from("review_cases")
          .select("id", { count: "exact", head: true })
          .eq("reference", fullReference.trim())
          .eq("document_type_id", docTypeAlta.id)
          .is("deleted_at", null);
        if (count && count > 0) throw new Error(`La referencia "${fullReference.trim()}" ya existe en el sistema`);
      }

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
        <div className="space-y-2 sm:col-span-2">
          <Label>Referencia *</Label>
          <div className="flex gap-2">
            <Popover open={prefixPopoverOpen} onOpenChange={setPrefixPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  className="h-9 w-[180px] justify-between"
                >
                  <span className="truncate">{selectedPrefix || "Prefijo..."}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[260px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar prefijo..." />
                  <CommandList>
                    <CommandEmpty>Sin prefijos configurados</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="__none__"
                        onSelect={() => {
                          setSelectedPrefix("");
                          setSucursalId("");
                          setPrefixPopoverOpen(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", !selectedPrefix ? "opacity-100" : "opacity-0")} />
                        Sin prefijo
                      </CommandItem>
                      {prefixes.map((p) => (
                        <CommandItem
                          key={p.id}
                          value={`${p.prefix} ${p.branches?.nombre ?? ""}`}
                          onSelect={() => {
                            setSelectedPrefix(p.prefix);
                            setSucursalId(p.branch_id);
                            setPrefixPopoverOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", selectedPrefix === p.prefix ? "opacity-100" : "opacity-0")} />
                          <div className="flex flex-col">
                            <span className="font-medium">{p.prefix}</span>
                            {p.branches?.nombre && (
                              <span className="text-xs text-muted-foreground">{p.branches.nombre}</span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <Input
              value={referenceSuffix}
              onChange={(e) => setReferenceSuffix(e.target.value)}
              placeholder="Número o código..."
              className="h-9 flex-1"
            />
          </div>
          {fullReference && (
            <p className="text-xs text-muted-foreground">
              Referencia completa: <span className="font-medium text-foreground">{fullReference}</span>
            </p>
          )}
          <p className="text-xs text-muted-foreground">Mínimo 11 caracteres</p>
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
        <Button type="submit" disabled={mutation.isPending || fullReference.trim().length < 11}>
          {mutation.isPending ? "Registrando..." : "Registrar Alta de Remesa"}
        </Button>
      </div>
    </form>
  );
}
