import { Info } from "lucide-react";
import type { ReactNode } from "react";

// Required on the dashboard, simulator and stock pages (brand guide §7).
export function Disclaimer({ children }: { children?: ReactNode }) {
  return (
    <p className="flex gap-2 text-xs leading-snug text-muted-foreground">
      <Info className="mt-px size-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
      <span>
        {children}
        {children ? " " : null}
        El rendimiento pasado no garantiza resultados futuros. Esto no es asesoría financiera.
      </span>
    </p>
  );
}
