import { Clock } from "lucide-react";
import { formatAge } from "@/lib/format";

type StaleBadgeProps = {
  /** ISO timestamp of the cached data. */
  asOf: string;
  /** What the data is, e.g. "Datos" or "Tipo de cambio". */
  label?: string;
};

// Shown when the API answers with `stale: true`. Always text, never color alone.
export function StaleBadge({ asOf, label = "Datos" }: StaleBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
      <Clock className="size-3.5" strokeWidth={2} aria-hidden="true" />
      {label} de {formatAge(asOf)}
    </span>
  );
}
