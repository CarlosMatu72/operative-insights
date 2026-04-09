import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  colorClass: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: { text: "text-lg", icon: "h-4 w-4", pad: "p-2" },
  md: { text: "text-2xl", icon: "h-5 w-5", pad: "p-2.5" },
  lg: { text: "text-3xl", icon: "h-6 w-6", pad: "p-3" },
};

export function KpiCard({ label, value, icon: Icon, colorClass, size = "md" }: KpiCardProps) {
  const s = sizeMap[size];
  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3">
        <div className={cn("rounded-lg", s.pad, colorClass)}>
          <Icon className={s.icon} />
        </div>
        <div>
          <p className={cn("font-bold text-foreground", s.text)}>{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}
