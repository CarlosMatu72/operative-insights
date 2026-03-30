import { useGlosadores } from "@/hooks/useTableroData";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users } from "lucide-react";

export function GlosadoresSection() {
  const { data: glosadores = [], isLoading } = useGlosadores();
  const activeCount = glosadores.filter((g) => g.isActive).length;

  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-semibold text-foreground tracking-tight">Control de Distribución</h2>
        <span className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          <Users className="h-3 w-3" />
          {activeCount} activos de {glosadores.length}
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Cargando glosadores...
        </div>
      ) : glosadores.length === 0 ? (
        <div className="rounded-lg border bg-muted/30 p-8 text-center text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-20" />
          <p className="text-sm">No hay ejecutivos de glosa registrados</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {glosadores.map((g) => {
            const initials = g.nombre
              .split(" ")
              .map((w: string) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <div
                key={g.id}
                className={`rounded-xl border p-4 transition-all ${
                  g.isActive
                    ? "border-primary/40 bg-primary/[0.03] shadow-md"
                    : "bg-card hover:shadow-sm"
                }`}
              >
                <div className="flex flex-col items-center text-center gap-3">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={g.avatar_url ?? undefined} />
                    <AvatarFallback className="text-lg font-bold bg-muted">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <Badge
                    variant={g.isActive ? "default" : "secondary"}
                    className={`text-[11px] ${
                      g.isActive
                        ? "bg-destructive/10 text-destructive border-destructive/20"
                        : "bg-success/10 text-success border-success/20"
                    }`}
                  >
                    {g.isActive ? "🔴 GLOSANDO" : "🟢 DISPONIBLE"}
                  </Badge>

                  <p className="text-sm font-semibold text-foreground">{g.nombre}</p>

                  <div className="w-full space-y-2 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Ped/Con mes:</span>
                      <span className="font-medium text-foreground">{g.pedConsolidados}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Remesas mes:</span>
                      <span className="font-medium text-foreground">{g.remesas}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Distribución</span>
                        <span className="font-bold text-foreground">{g.cargaPct}%</span>
                      </div>
                      <Progress value={g.cargaPct} className="h-2.5" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
