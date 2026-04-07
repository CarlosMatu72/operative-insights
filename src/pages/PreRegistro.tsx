import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PendientesSection } from "@/components/pre-registro/PendientesSection";
import { GlosadoresSection } from "@/components/pre-registro/GlosadoresSection";
import { useKPIs, useRealtimeSessions } from "@/hooks/useTableroData";
import { FileText, ClipboardCheck, CheckCircle, Layers, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PedimentoForm } from "@/components/tramites/PedimentoForm";
import { AltaRemesaForm } from "@/components/tramites/AltaRemesaForm";
import { RemesaForm } from "@/components/tramites/RemesaForm";
import { ConsolidadoForm } from "@/components/tramites/ConsolidadoForm";

function AltaTramiteButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="h-4 w-4" /> Nuevo Registro
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Alta de Trámite</DialogTitle></DialogHeader>
          <Tabs defaultValue="pedimento">
            <TabsList className="h-9 w-full">
              <TabsTrigger value="pedimento" className="text-xs flex-1">Pedimento</TabsTrigger>
              <TabsTrigger value="alta_remesa" className="text-xs flex-1">Alta Remesa</TabsTrigger>
              <TabsTrigger value="remesa" className="text-xs flex-1">Remesa</TabsTrigger>
              <TabsTrigger value="consolidado" className="text-xs flex-1">Consolidado</TabsTrigger>
            </TabsList>
            <TabsContent value="pedimento" className="mt-4"><PedimentoForm onSuccess={() => setOpen(false)} /></TabsContent>
            <TabsContent value="alta_remesa" className="mt-4"><AltaRemesaForm onSuccess={() => setOpen(false)} /></TabsContent>
            <TabsContent value="remesa" className="mt-4"><RemesaForm onSuccess={() => setOpen(false)} /></TabsContent>
            <TabsContent value="consolidado" className="mt-4"><ConsolidadoForm onSuccess={() => setOpen(false)} /></TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}

const PreRegistro = () => {
  useRealtimeSessions();
  const { data: kpis } = useKPIs();

  const kpiItems = [
    { label: "Pendientes", value: kpis?.pendientes ?? 0, icon: FileText, color: "bg-muted text-muted-foreground" },
    { label: "En revisión", value: kpis?.enRevision ?? 0, icon: ClipboardCheck, color: "bg-primary/10 text-primary" },
    { label: "Aprobados (mes)", value: kpis?.aprobadosMes ?? 0, icon: CheckCircle, color: "bg-success/10 text-success" },
    { label: "Total (mes)", value: (kpis?.remesasMes ?? 0) + (kpis?.pedConMes ?? 0), icon: Layers, color: "bg-accent text-accent-foreground" },
  ];

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Pre-Registro</h1>
            <p className="text-sm text-muted-foreground">Cola de pendientes y distribución</p>
          </div>
          <AltaTramiteButton />
        </div>

        {/* KPIs */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {kpiItems.map((k) => (
            <div key={k.label} className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${k.color}`}>
                  <k.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{k.value}</p>
                  <p className="text-[11px] text-muted-foreground">{k.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Cola de Pendientes */}
        <PendientesSection />

        {/* Control de Distribución */}
        <GlosadoresSection />
      </div>
    </AppLayout>
  );
};

export default PreRegistro;
