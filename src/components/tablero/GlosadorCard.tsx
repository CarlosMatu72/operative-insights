import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

interface GlosadorCardProps {
  nombre: string;
  avatar_url: string | null;
  isActive: boolean;
  pedConsolidados: number;
  remesas: number;
  cargaPct: number;
}

export function GlosadorCard({ nombre, avatar_url, isActive, pedConsolidados, remesas, cargaPct }: GlosadorCardProps) {
  const initials = nombre
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={avatar_url ?? undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{nombre}</p>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
              isActive
                ? "bg-destructive/15 text-destructive"
                : "bg-success/15 text-success"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-destructive" : "bg-success"}`} />
            {isActive ? "Glosando" : "Disponible"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-lg font-bold text-foreground">{pedConsolidados}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">Ped/Con mes</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-lg font-bold text-foreground">{remesas}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">Remesas mes</p>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Carga</span>
          <span>{cargaPct}%</span>
        </div>
        <Progress value={cargaPct} className="h-1.5" />
      </div>
    </div>
  );
}
