import { AppLayout } from "@/components/AppLayout";
import { GlosadorCard } from "@/components/tablero/GlosadorCard";
import { PendientesTable } from "@/components/tablero/PendientesTable";
import { useGlosadores, usePendientes, useKPIs, useRealtimeSessions } from "@/hooks/useTableroData";
import { FileText, ClipboardCheck, CheckCircle, Package, Layers } from "lucide-react";

const Tablero = () => {
  useRealtimeSessions();
  const { data: glosadores = [], isLoading: loadingGlosadores } = useGlosadores();
  const { data: pendientes = [], isLoading: loadingPendientes } = usePendientes();
  const { data: kpis } = useKPIs();

  const kpiItems = [
    { label: "Pendientes", value: kpis?.pendientes ?? 0, icon: FileText, color: "bg-muted text-muted-foreground" },
    { label: "En revisión", value: kpis?.enRevision ?? 0, icon: ClipboardCheck, color: "bg-primary/10 text-primary" },
    { label: "Aprobados (mes)", value: kpis?.aprobadosMes ?? 0, icon: CheckCircle, color: "bg-success/10 text-success" },
    { label: "Remesas (mes)", value: kpis?.remesasMes ?? 0, icon: Package, color: "bg-accent text-accent-foreground" },
    { label: "Ped/Con (mes)", value: kpis?.pedConMes ?? 0, icon: Layers, color: "bg-warning/10 text-warning" },
  ];

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Tablero Operativo</h1>
          <p className="text-sm text-muted-foreground">
            Distribución de revisiones y estado de glosadores
          </p>
        </div>

        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
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

        <div>
          <h2 className="text-lg font-semibold text-foreground tracking-tight mb-3">Glosadores</h2>
          {loadingGlosadores ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {glosadores.map((g) => (
                <GlosadorCard
                  key={g.id}
                  nombre={g.nombre}
                  avatar_url={g.avatar_url}
                  isActive={g.isActive}
                  pedConsolidados={g.pedConsolidados}
                  remesas={g.remesas}
                  cargaPct={g.cargaPct}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground tracking-tight mb-3">
            Cola de Pendientes
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({pendientes.length} trámites)
            </span>
          </h2>
          <PendientesTable cases={pendientes} isLoading={loadingPendientes} />
        </div>
      </div>
    </AppLayout>
  );
};

export default Tablero;
