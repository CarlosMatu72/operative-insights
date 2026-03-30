import { AppLayout } from "@/components/AppLayout";
import { AltaTramiteSection } from "@/components/pre-registro/AltaTramiteSection";
import { PendientesSection } from "@/components/pre-registro/PendientesSection";
import { GlosadoresSection } from "@/components/pre-registro/GlosadoresSection";
import { useKPIs, useRealtimeSessions } from "@/hooks/useTableroData";
import { FileText, ClipboardCheck, CheckCircle, Layers } from "lucide-react";

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
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Módulo Pre-Registro</h1>
          <p className="text-sm text-muted-foreground">
            Control de glosas pendientes y distribución
          </p>
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

        {/* Alta de Trámites */}
        <AltaTramiteSection />

        {/* Cola de Pendientes */}
        <PendientesSection />

        {/* Control de Distribución */}
        <GlosadoresSection />
      </div>
    </AppLayout>
  );
};

export default PreRegistro;
