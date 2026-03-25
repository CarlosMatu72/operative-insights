import { AppLayout } from "@/components/AppLayout";
import { FileText } from "lucide-react";

const Tramites = () => (
  <AppLayout>
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Trámites</h1>
        <p className="text-sm text-muted-foreground">
          Registro y seguimiento de trámites
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-16 shadow-sm">
        <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <p className="text-muted-foreground">
          Módulo de trámites — próximamente
        </p>
      </div>
    </div>
  </AppLayout>
);

export default Tramites;
