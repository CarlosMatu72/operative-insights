import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Users, FileText, ClipboardCheck, BarChart3 } from "lucide-react";
import { useKPIs } from "@/hooks/useTableroData";

const Index = () => {
  const { profile } = useAuth();
  const { data: kpis } = useKPIs();

  const stats = [
    { label: "Trámites registrados", value: kpis?.pendientes ?? "—", icon: FileText, color: "bg-primary/10 text-primary" },
    { label: "En revisión", value: kpis?.enRevision ?? "—", icon: ClipboardCheck, color: "bg-warning/10 text-warning" },
    { label: "Aprobados", value: kpis?.aprobadosMes ?? "—", icon: BarChart3, color: "bg-success/10 text-success" },
    { label: "Usuarios activos", value: "—", icon: Users, color: "bg-accent text-accent-foreground" },
  ];

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Bienvenido, {profile?.nombre}
          </h1>
          <p className="text-sm text-muted-foreground">
            Panel de Control de Glosa y Eficiencia Operativa
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2.5 ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
