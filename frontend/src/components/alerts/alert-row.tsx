"use client";

import { Pause, Play, RotateCcw, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { formatShortDate, formatUsd } from "@/lib/format";
import type { Alert, AlertStatus } from "@/lib/market";

const STATUS_PILL: Record<AlertStatus, { label: string; className: string }> = {
  active: { label: "Activa", className: "bg-ocean-50 text-ocean-700" },
  triggered: { label: "Te avisamos", className: "bg-violet-50 text-violet-700" },
  cancelled: { label: "Pausada", className: "bg-muted text-muted-foreground" },
};

type AlertRowProps = {
  alert: Alert;
  /** False when 5 alerts are already active, so resuming would hit ALERT_LIMIT. */
  canActivate: boolean;
  onSetStatus: (status: "active" | "cancelled") => void;
  onDelete: () => void;
};

export function AlertRow({ alert, canActivate, onSetStatus, onDelete }: AlertRowProps) {
  const [confirming, setConfirming] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const trashRef = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);

  // Keyboard users land on "Cancelar" when the confirmation opens and back on the trash icon when it closes.
  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
    else if (wasConfirming.current) trashRef.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);

  const pill = STATUS_PILL[alert.status];
  const ConditionIcon = alert.condition === "above" ? TrendingUp : TrendingDown;
  const verb = alert.condition === "above" ? "sube a" : "baja a";

  return (
    <div className="py-3">
      <div className="flex items-center gap-3">
        <Link
          href={`/stock/${encodeURIComponent(alert.symbol)}`}
          className="group flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg px-2 transition-colors duration-150 hover:bg-muted"
        >
          <span
            aria-hidden="true"
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              alert.status === "cancelled" ? "bg-muted text-muted-foreground" : "bg-ocean-50 text-ocean-600",
            )}
          >
            <ConditionIcon className="size-4" strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-mono text-sm font-semibold text-ocean-700">{alert.symbol}</span>
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", pill.className)}>{pill.label}</span>
            </span>
            <span className="mt-0.5 block text-sm tabular-nums">
              Si {verb} <strong className="font-semibold">{formatUsd(alert.targetPrice)}</strong>
            </span>
            {alert.status === "triggered" && alert.triggeredAt && (
              <span className="block text-xs text-muted-foreground tabular-nums">
                El {formatShortDate(alert.triggeredAt)} llegó a{" "}
                {alert.triggeredPrice !== null ? formatUsd(alert.triggeredPrice) : "tu precio"}
              </span>
            )}
          </span>
        </Link>

        {!confirming && (
          <div className="flex shrink-0 items-center">
            <StatusAction alert={alert} canActivate={canActivate} onSetStatus={onSetStatus} />
            <button
              ref={trashRef}
              type="button"
              onClick={() => setConfirming(true)}
              aria-label={`Borrar alerta de ${alert.symbol}`}
              className="flex size-11 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-4" strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {confirming && (
        <div
          role="group"
          aria-label={`Confirmar borrar alerta de ${alert.symbol}`}
          className="mt-2 flex flex-wrap items-center justify-end gap-2 rounded-lg bg-destructive/5 px-3 py-2"
        >
          <p className="mr-auto text-sm">¿Borrar esta alerta? No se puede deshacer.</p>
          <Button ref={cancelRef} variant="ghost" onClick={() => setConfirming(false)} className="h-11 px-3 text-sm">
            Cancelar
          </Button>
          <Button onClick={onDelete} className="h-11 bg-destructive px-4 text-sm text-white hover:bg-destructive/90">
            Borrar
          </Button>
        </div>
      )}
    </div>
  );
}

function StatusAction({
  alert,
  canActivate,
  onSetStatus,
}: Pick<AlertRowProps, "alert" | "canActivate" | "onSetStatus">) {
  const base =
    "inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50";

  if (alert.status === "active") {
    return (
      <button
        type="button"
        onClick={() => onSetStatus("cancelled")}
        aria-label={`Pausar alerta de ${alert.symbol}`}
        className={cn(base, "text-muted-foreground hover:bg-muted hover:text-foreground")}
      >
        <Pause className="size-4" strokeWidth={2} aria-hidden="true" />
        <span className="hidden sm:inline">Pausar</span>
      </button>
    );
  }

  const label = alert.status === "triggered" ? "Reactivar" : "Reanudar";
  const Icon = alert.status === "triggered" ? RotateCcw : Play;
  return (
    <button
      type="button"
      onClick={() => onSetStatus("active")}
      disabled={!canActivate}
      aria-label={`${label} alerta de ${alert.symbol}`}
      title={canActivate ? undefined : "Ya tienes 5 alertas activas"}
      className={cn(base, "text-primary hover:bg-ocean-50")}
    >
      <Icon className="size-4" strokeWidth={2} aria-hidden="true" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
