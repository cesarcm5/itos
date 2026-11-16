import { RotateCw } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-client";

/** Friendly copy for a failed data view. `what` completes "No pudimos cargar …". */
export function dataErrorMessage(error: Error, what: string): string {
  if (error instanceof ApiError && error.code === "RATE_LIMITED") {
    return "Llegamos al límite de datos del mercado. Intenta de nuevo en un minuto.";
  }
  return `No pudimos cargar ${what}.`;
}

type DataErrorProps = {
  message: string;
  onRetry: () => void;
  retrying?: boolean;
  className?: string;
};

export function DataError({ message, onRetry, retrying, className }: DataErrorProps) {
  return (
    <div
      role="alert"
      className={cn("flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-6 text-center", className)}
    >
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" onClick={onRetry} disabled={retrying} className="h-11 px-4 text-sm">
        <RotateCw
          data-icon="inline-start"
          strokeWidth={2}
          className={cn(retrying && "motion-safe:animate-spin")}
          aria-hidden="true"
        />
        Reintentar
      </Button>
    </div>
  );
}
