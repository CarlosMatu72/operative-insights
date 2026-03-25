import { AppLayout } from "@/components/AppLayout";
import { ClipboardCheck } from "lucide-react";

const Glosa = () => (
  <AppLayout>
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Panel de Glosa</h1>
        <p className="text-sm text-muted-foreground">
          Revisión y control de calidad
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-16 shadow-sm">
        <ClipboardCheck className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <p className="text-muted-foreground">
          Panel de Glosa — próximamente
        </p>
      </div>
    </div>
  </AppLayout>
);

export default Glosa;
