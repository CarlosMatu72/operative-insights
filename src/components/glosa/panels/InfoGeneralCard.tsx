import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ReviewPanelState } from "@/hooks/useReviewPanelState";

interface Props {
  state: ReviewPanelState;
}

export function InfoGeneralCard({ state }: Props) {
  const {
    reviewCase, isReadOnly,
    branchId, setBranchId, clientId, setClientId, executiveId, setExecutiveId,
    customsKeyId, setCustomsKeyId, partidas, setPartidas,
    comments, setComments, detectedRange,
    branches, clients, executives, customsKeys,
    showNewClientDialog, setShowNewClientDialog,
    newClientNombre, setNewClientNombre, savingNewClient, setSavingNewClient,
    queryClient,
  } = state;

  if (!reviewCase) return null;

  return (
    <>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold tracking-tight">Información General</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Referencia</Label>
              <Input value={reviewCase.reference ?? ""} disabled className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Sucursal</Label>
              <Select value={branchId} onValueChange={setBranchId} disabled={isReadOnly}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{(branches.data ?? []).map((b) => <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Ejecutivo</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    disabled={isReadOnly}
                    className="h-9 text-sm w-full justify-between font-normal"
                  >
                    <span className="truncate">
                      {executiveId
                        ? (executives.data ?? []).find(e => e.id === executiveId)?.nombre ?? "Seleccionar..."
                        : "Seleccionar ejecutivo..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar ejecutivo..." className="h-9" />
                    <CommandList>
                      <CommandEmpty>Sin resultados</CommandEmpty>
                      <CommandGroup>
                        {(executives.data ?? []).map(e => (
                          <CommandItem key={e.id} value={e.nombre} onSelect={() => setExecutiveId(e.id)}>
                            <Check className={cn("mr-2 h-4 w-4", executiveId === e.id ? "opacity-100" : "opacity-0")} />
                            {e.nombre}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">Muestra todos los ejecutivos activos</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Cliente</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    disabled={isReadOnly}
                    className="h-9 text-sm w-full justify-between font-normal"
                  >
                    <span className="truncate">
                      {clientId
                        ? (clients.data ?? []).find(c => c.id === clientId)?.nombre ?? "Seleccionar..."
                        : "Seleccionar cliente..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar cliente..." className="h-9" />
                    <CommandList>
                      <CommandEmpty>Sin resultados</CommandEmpty>
                      <CommandGroup>
                        {(clients.data ?? []).map(c => (
                          <CommandItem key={c.id} value={c.nombre} onSelect={() => setClientId(c.id)}>
                            <Check className={cn("mr-2 h-4 w-4", clientId === c.id ? "opacity-100" : "opacity-0")} />
                            {c.nombre}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {!isReadOnly && (
                <button
                  type="button"
                  className="text-xs text-primary underline underline-offset-2 hover:no-underline mt-0.5 text-left"
                  onClick={() => setShowNewClientDialog(true)}
                >
                  + Registrar nuevo cliente
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Clave Aduanera</Label>
              <Select value={customsKeyId} onValueChange={setCustomsKeyId} disabled={isReadOnly}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{customsKeys.map((k) => <SelectItem key={k.id} value={k.id}>{k.clave} — {k.descripcion}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Partidas</Label>
              <div className="flex gap-2">
                <Input type="number" value={partidas} onChange={(e) => setPartidas(e.target.value)} disabled={isReadOnly} className="h-9 text-sm flex-1" placeholder="0" />
                {detectedRange && <Badge variant="outline" className="text-[10px] whitespace-nowrap self-center">{detectedRange.nombre_rango}</Badge>}
              </div>
            </div>
          </div>
          {!isReadOnly && (
            <div className="mt-4 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Comentarios generales</Label>
              <Textarea value={comments} onChange={(e) => setComments(e.target.value)} className="text-sm" rows={2} placeholder="Comentarios sobre el trámite..." />
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Client Dialog */}
      <Dialog open={showNewClientDialog} onOpenChange={setShowNewClientDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nuevo Cliente</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Nombre del cliente</Label>
            <Input
              value={newClientNombre}
              onChange={e => setNewClientNombre(e.target.value)}
              placeholder="Nombre de la empresa o persona"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewClientDialog(false)}>Cancelar</Button>
            <Button
              disabled={!newClientNombre.trim() || savingNewClient}
              onClick={async () => {
                setSavingNewClient(true);
                try {
                  const { data, error } = await supabase.from("clients").insert({ nombre: newClientNombre.trim() }).select().single();
                  if (error) throw error;
                  toast.success("Cliente registrado");
                  setClientId(data.id);
                  setNewClientNombre("");
                  setShowNewClientDialog(false);
                  queryClient.invalidateQueries({ queryKey: ["clients-active"] });
                } catch (e: unknown) {
                  toast.error(e instanceof Error ? e.message : "Error al crear cliente");
                } finally {
                  setSavingNewClient(false);
                }
              }}
            >
              {savingNewClient ? "Guardando..." : "Crear cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
