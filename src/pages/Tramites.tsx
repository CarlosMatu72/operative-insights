import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, FilePlus, Layers, Package, List, Info } from "lucide-react";
import { PedimentoForm } from "@/components/tramites/PedimentoForm";
import { AltaRemesaForm } from "@/components/tramites/AltaRemesaForm";
import { RemesaForm } from "@/components/tramites/RemesaForm";
import { ConsolidadoForm } from "@/components/tramites/ConsolidadoForm";
import { TramitesTable } from "@/components/tramites/TramitesTable";

const tabHelp: Record<string, { title: string; description: string; result: string }> = {
  pedimento: {
    title: "Registrar Pedimento",
    description: "Trámite independiente. Puede asignarse a un glosador de inmediato o dejarse pendiente de asignación.",
    result: "Si asigna glosador → ASIGNADO. Sin glosador → REGISTRADO.",
  },
  alta_remesa: {
    title: "Alta de Remesa",
    description: "Crea una remesa base y automáticamente la primera revisión asociada (sufijo -1).",
    result: "Se creará la base y la primera revisión. Ambas quedan como REGISTRADO.",
  },
  remesa: {
    title: "Registrar Remesa",
    description: "Agrega una nueva revisión incremental a una remesa activa existente. El consecutivo se incrementa automáticamente.",
    result: "Si asigna glosador → ASIGNADO. Sin glosador → REGISTRADO.",
  },
  consolidado: {
    title: "Registrar Consolidado",
    description: "Consolida una remesa activa. Al registrarlo, la remesa base se desactiva y no podrá recibir más revisiones.",
    result: "La remesa base queda inactiva. El consolidado hereda sucursal y cliente.",
  },
};

const Tramites = () => {
  const [activeTab, setActiveTab] = useState("listado");

  const handleSuccess = () => {
    setActiveTab("listado");
  };

  const currentHelp = tabHelp[activeTab];

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Trámites</h1>
          <p className="text-sm text-muted-foreground">
            Pre-registro y seguimiento de trámites
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-10 p-1">
            <TabsTrigger value="listado" className="gap-1.5 text-sm">
              <List className="h-4 w-4" />
              Listado
            </TabsTrigger>
            <TabsTrigger value="pedimento" className="gap-1.5 text-sm">
              <FileText className="h-4 w-4" />
              Pedimento
            </TabsTrigger>
            <TabsTrigger value="alta_remesa" className="gap-1.5 text-sm">
              <FilePlus className="h-4 w-4" />
              Alta Remesa
            </TabsTrigger>
            <TabsTrigger value="remesa" className="gap-1.5 text-sm">
              <Layers className="h-4 w-4" />
              Remesa
            </TabsTrigger>
            <TabsTrigger value="consolidado" className="gap-1.5 text-sm">
              <Package className="h-4 w-4" />
              Consolidado
            </TabsTrigger>
          </TabsList>

          {/* Contextual help banner */}
          {currentHelp && (
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-accent bg-accent/30 px-4 py-3">
              <Info className="h-4 w-4 text-accent-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{currentHelp.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{currentHelp.description}</p>
                <p className="text-xs font-medium text-accent-foreground mt-1">→ {currentHelp.result}</p>
              </div>
            </div>
          )}

          <TabsContent value="listado" className="mt-4">
            <TramitesTable />
          </TabsContent>

          <TabsContent value="pedimento" className="mt-4">
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <PedimentoForm onSuccess={handleSuccess} />
            </div>
          </TabsContent>

          <TabsContent value="alta_remesa" className="mt-4">
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <AltaRemesaForm onSuccess={handleSuccess} />
            </div>
          </TabsContent>

          <TabsContent value="remesa" className="mt-4">
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <RemesaForm onSuccess={handleSuccess} />
            </div>
          </TabsContent>

          <TabsContent value="consolidado" className="mt-4">
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <ConsolidadoForm onSuccess={handleSuccess} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Tramites;
