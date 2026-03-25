import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Users, FileText, ClipboardCheck, BarChart3 } from "lucide-react";

const stats = [
  { label: "Trámites registrados", value: "—", icon: FileText, color: "bg-primary/10 text-primary" },
  { label: "En revisión", value: "—", icon: ClipboardCheck, color: "bg-warning/10 text-warning" },
  { label: "Aprobados", value: "—", icon: BarChart3, color: "bg-success/10 text-success" },
  { label: "Usuarios activos", value: "—", icon: Users, color: "bg-accent text-accent-foreground" },
];

const Index = () => {
  const { profile } = useAuth();

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
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
              className="rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
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

        <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
          <p className="text-muted-foreground">
            Los módulos de trámites, panel de glosa y reportes se irán habilitando progresivamente.
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
