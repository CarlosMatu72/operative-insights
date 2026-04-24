import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; className: string }> = {
  REGISTRADO: {
    label: "Registrado",
    className: "bg-muted text-muted-foreground border-border",
  },
  ASIGNADO: {
    label: "Asignado",
    className: "bg-accent text-accent-foreground border-accent",
  },
  EN_REVISION: {
    label: "En Revisión",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  PAUSADO: {
    label: "Pausado",
    className: "bg-warning/10 text-warning border-warning/20",
  },
  CORRECCION_PENDIENTE: {
    label: "Corrección Pend.",
    className: "bg-warning/10 text-warning border-warning/20 font-semibold",
  },
  EN_CORRECCION: {
    label: "En Corrección",
    className: "bg-warning/10 text-warning border-warning/20",
  },
  APROBADO: {
    label: "Aprobado",
    className: "bg-success/10 text-success border-success/20",
  },
  RECHAZADO: {
    label: "Rechazado",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  REABIERTO: {
    label: "Reabierto",
    className: "bg-info/10 text-info border-info/20",
  },
  DOCUMENTO_PENDIENTE: {
    label: "Doc. Pendiente",
    className: "bg-info/10 text-info border-info/20",
  },
  CONSULTA_PENDIENTE: {
    label: "Consulta Pendiente",
    className: "bg-secondary/20 text-secondary-foreground border-secondary/30 font-semibold",
  },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground border-border",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {(status === "EN_REVISION" || status === "CORRECCION_PENDIENTE") && (
        <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${status === "EN_REVISION" ? "bg-primary animate-pulse" : "bg-warning"}`} />
      )}
      {config.label}
    </span>
  );
}

export { statusConfig };
