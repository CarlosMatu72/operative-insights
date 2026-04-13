import { useState } from "react";
import { usePendientes } from "@/hooks/useTableroData";
import { PendientesTable } from "@/components/tablero/PendientesTable";
import { Button } from "@/components/ui/button";

export function PendientesSection() {
  const [sortAsc, setSortAsc] = useState(true);
  const { data: pendientes = [], isLoading } = usePendientes(sortAsc);

  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-foreground tracking-tight">Cola de Pendientes</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setSortAsc(!sortAsc)}
            title={sortAsc ? "Más recientes primero" : "Más antiguos primero"}
          >
            {sortAsc ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8l4-4 4 4"/><path d="M7 4v16"/><path d="M11 12h4"/><path d="M11 16h7"/><path d="M11 20h10"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 16l4 4 4-4"/><path d="M7 20V4"/><path d="M11 4h4"/><path d="M11 8h7"/><path d="M11 12h10"/></svg>
            )}
            {sortAsc ? "Más antiguos" : "Más recientes"}
          </Button>
          <span className="text-sm text-muted-foreground">{pendientes.length} trámites en espera</span>
        </div>
      </div>
      <PendientesTable cases={pendientes} isLoading={isLoading} />
    </div>
  );
}
