import { AppLayout } from "@/components/AppLayout";
import { BarChart3 } from "lucide-react";

const Reportes = () => (
  <AppLayout>
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reportes</h1>
        <p className="text-sm text-muted-foreground">
          Reportes de eficiencia operativa
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-16 shadow-sm">
        <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <p className="text-muted-foreground">
          Módulo de reportes — próximamente
        </p>
      </div>
    </div>
  </AppLayout>
);

export default Reportes;
