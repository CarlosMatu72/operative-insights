import { usePendientes } from "@/hooks/useTableroData";
import { PendientesTable } from "@/components/tablero/PendientesTable";

export function PendientesSection() {
  const { data: pendientes = [], isLoading } = usePendientes();

  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-foreground tracking-tight">Cola de Pendientes</h2>
        <span className="text-sm text-muted-foreground">{pendientes.length} trámites en espera</span>
      </div>
      <PendientesTable cases={pendientes} isLoading={isLoading} />
    </div>
  );
}
