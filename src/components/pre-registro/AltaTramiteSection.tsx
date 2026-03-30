import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PedimentoForm } from "@/components/tramites/PedimentoForm";
import { AltaRemesaForm } from "@/components/tramites/AltaRemesaForm";
import { RemesaForm } from "@/components/tramites/RemesaForm";
import { ConsolidadoForm } from "@/components/tramites/ConsolidadoForm";

export function AltaTramiteSection() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground tracking-tight">Registrar Nueva Glosa</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Selecciona el tipo de trámite a revisar</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Nuevo Registro
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Alta de Trámite para Revisión</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="pedimento">
            <TabsList className="h-9 w-full">
              <TabsTrigger value="pedimento" className="text-xs flex-1">Pedimento</TabsTrigger>
              <TabsTrigger value="alta_remesa" className="text-xs flex-1">Alta Remesa</TabsTrigger>
              <TabsTrigger value="remesa" className="text-xs flex-1">Remesa</TabsTrigger>
              <TabsTrigger value="consolidado" className="text-xs flex-1">Consolidado</TabsTrigger>
            </TabsList>
            <TabsContent value="pedimento" className="mt-4">
              <PedimentoForm onSuccess={() => setOpen(false)} />
            </TabsContent>
            <TabsContent value="alta_remesa" className="mt-4">
              <AltaRemesaForm onSuccess={() => setOpen(false)} />
            </TabsContent>
            <TabsContent value="remesa" className="mt-4">
              <RemesaForm onSuccess={() => setOpen(false)} />
            </TabsContent>
            <TabsContent value="consolidado" className="mt-4">
              <ConsolidadoForm onSuccess={() => setOpen(false)} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
