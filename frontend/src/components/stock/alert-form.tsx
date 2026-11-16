"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BellRing, CheckCircle2 } from "lucide-react";
import { useId, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { cn } from "cn";
import { MoneyInput } from "@/components/money-input";
import { Segmented } from "@/components/segmented";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api-client";
import { formatUsd } from "@/lib/format";
import { ALERTS_KEY, type Alert, type AlertCondition } from "@/lib/market";
import { alertFormSchema, type AlertFormInput, type AlertFormOutput } from "@/lib/schemas/alert";

const CONDITIONS: readonly { value: AlertCondition; label: string }[] = [
  { value: "above", label: "Sube a" },
  { value: "below", label: "Baja a" },
];

function createErrorMessage(error: Error): string {
  if (error instanceof ApiError && error.code === "ALERT_LIMIT") {
    return "Ya tienes 5 alertas activas. Pausa o borra una para crear otra.";
  }
  if (error instanceof ApiError && error.code === "VALIDATION_ERROR") return "Revisa el precio e intenta de nuevo.";
  return "No pudimos crear la alerta. Intenta de nuevo.";
}

type AlertFormProps = {
  symbol: string;
  /** Today's price, shown as a reference and used to check the target. Null while the quote loads or fails. */
  currentPrice: number | null;
};

export function AlertForm({ symbol, currentPrice }: AlertFormProps) {
  return (
    <section aria-labelledby="alert-title" className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2">
        <BellRing className="size-5 text-ocean-600" strokeWidth={2} aria-hidden="true" />
        <h2 id="alert-title" className="text-lg font-semibold">
          Avísame por correo
        </h2>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Te escribimos una vez cuando {symbol} llegue al precio que elijas.
      </p>

      <AlertFields symbol={symbol} currentPrice={currentPrice} className="mt-4" />

      <p className="mt-3 text-xs leading-snug text-muted-foreground">
        No es en tiempo real: revisamos los precios cada 15 minutos mientras abre el mercado de EE. UU.
      </p>
    </section>
  );
}

type AlertFieldsProps = AlertFormProps & {
  className?: string;
  /** Called after the API saves the alert. */
  onCreated?: (alert: Alert) => void;
};

/** Condition + target + submit. Used inside AlertForm and on the alerts page. */
export function AlertFields({ symbol, currentPrice, className, onCreated }: AlertFieldsProps) {
  const queryClient = useQueryClient();
  const targetId = useId();
  const schema = useMemo(() => alertFormSchema(currentPrice), [currentPrice]);
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AlertFormInput, unknown, AlertFormOutput>({
    resolver: zodResolver(schema),
    defaultValues: { condition: "above", targetPrice: "" },
  });

  const create = useMutation({
    mutationFn: (values: AlertFormOutput) =>
      api<Alert>("/alerts", { method: "POST", body: JSON.stringify({ symbol, ...values }) }),
    onSuccess: (alert) => {
      void queryClient.invalidateQueries({ queryKey: ALERTS_KEY });
      reset({ condition: "above", targetPrice: "" });
      onCreated?.(alert);
    },
  });

  const targetError = errors.targetPrice?.message;
  const created = create.isSuccess ? create.data : null;

  return (
    <form
      noValidate
      onSubmit={(event) => {
        create.reset();
        void handleSubmit((values) => create.mutate(values))(event);
      }}
      className={cn("flex flex-col gap-4", className)}
    >
      <Controller
        control={control}
        name="condition"
        render={({ field }) => (
          <Segmented
            label="Cuándo avisarte"
            options={CONDITIONS}
            value={field.value}
            onChange={field.onChange}
            className="flex w-full"
          />
        )}
      />

      <div className="flex flex-col gap-2">
        <label htmlFor={targetId} className="text-sm font-medium">
          Precio objetivo
        </label>
        <MoneyInput
          id={targetId}
          currency="USD"
          invalid={Boolean(targetError)}
          aria-describedby={`${targetId}-${targetError ? "error" : "hint"}`}
          {...register("targetPrice")}
        />
        {targetError ? (
          <p id={`${targetId}-error`} className="text-sm text-destructive">
            {targetError}
          </p>
        ) : (
          <p id={`${targetId}-hint`} className="text-sm text-muted-foreground tabular-nums">
            {currentPrice !== null ? `Precio actual: ${formatUsd(currentPrice)}` : "Cargando el precio actual…"}
          </p>
        )}
      </div>

      <Button type="submit" disabled={create.isPending} className="h-11 text-base">
        {create.isPending ? "Creando alerta…" : "Crear alerta"}
      </Button>

      <div aria-live="polite">
        {created && (
          <p className="flex gap-2 rounded-lg bg-gain/10 px-3 py-2 text-sm text-gain">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            <span>
              Alerta creada. Te avisamos por correo cuando {created.symbol}{" "}
              {created.condition === "above" ? "suba a" : "baje a"} {formatUsd(created.targetPrice)}.
            </span>
          </p>
        )}
        {create.isError && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {createErrorMessage(create.error)}
          </p>
        )}
      </div>
    </form>
  );
}
