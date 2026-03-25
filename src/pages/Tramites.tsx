import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, FilePlus, Layers, Package, List } from "lucide-react";
import { PedimentoForm } from "@/components/tramites/PedimentoForm";
import { AltaRemesaForm } from "@/components/tramites/AltaRemesaForm";
import { RemesaForm } from "@/components/tramites/RemesaForm";
import { ConsolidadoForm } from "@/components/tramites/ConsolidadoForm";
import { TramitesTable } from "@/components/tramites/TramitesTable";

const Tramites = () => {
  const [activeTab, setActiveTab] = useState("listado");

  const handleSuccess = () => {
    setActiveTab("listado");
  };

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Trámites</h1>
          <p className="text-sm text-muted-foreground">
            Pre-registro y seguimiento de trámites
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="listado" className="gap-2">
              <List className="h-4 w-4" />
              Listado
            </TabsTrigger>
            <TabsTrigger value="pedimento" className="gap-2">
              <FileText className="h-4 w-4" />
              Pedimento
            </TabsTrigger>
            <TabsTrigger value="alta_remesa" className="gap-2">
              <FilePlus className="h-4 w-4" />
              Alta Remesa
            </TabsTrigger>
            <TabsTrigger value="remesa" className="gap-2">
              <Layers className="h-4 w-4" />
              Remesa
            </TabsTrigger>
            <TabsTrigger value="consolidado" className="gap-2">
              <Package className="h-4 w-4" />
              Consolidado
            </TabsTrigger>
          </TabsList>

          <TabsContent value="listado">
            <TramitesTable />
          </TabsContent>

          <TabsContent value="pedimento">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Registrar Pedimento
                </CardTitle>
                <CardDescription>
                  Registre un nuevo pedimento. Si asigna glosador, el estatus será ASIGNADO, de lo contrario quedará REGISTRADO.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PedimentoForm onSuccess={handleSuccess} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alta_remesa">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FilePlus className="h-5 w-5 text-primary" />
                  Alta de Remesa
                </CardTitle>
                <CardDescription>
                  Registre una nueva remesa base. Se creará automáticamente la primera revisión de remesa asociada.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AltaRemesaForm onSuccess={handleSuccess} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="remesa">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  Registrar Remesa
                </CardTitle>
                <CardDescription>
                  Agregue una nueva revisión de remesa a partir de una remesa activa. El consecutivo se incrementa automáticamente.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RemesaForm onSuccess={handleSuccess} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="consolidado">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Registrar Consolidado
                </CardTitle>
                <CardDescription>
                  Consolide una remesa activa. La remesa base dejará de estar disponible para nuevas revisiones.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ConsolidadoForm onSuccess={handleSuccess} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Tramites;
