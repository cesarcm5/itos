"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LineChart } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { cn } from "cn";
import { MoneyInput } from "@/components/money-input";
import { Segmented } from "@/components/segmented";
import { Button } from "@/components/ui/button";
import { formatMxn, formatUsd } from "@/lib/format";
import { SIMULATOR_YEARS, type SimulatorYears } from "@/lib/market";
import type { SuggestedAsset } from "@/lib/recommendation";
import { parseMoney } from "@/lib/schemas/profile";
import { simulatorFormSchema, type SimulatorFormInput, type SimulatorFormOutput } from "@/lib/schemas/simulator";

export type SimulatorDefaults = {
  symbol: string;
  amount: number;
  years: SimulatorYears;
  /** MXN when today's USD/MXN rate is known; otherwise the user types dollars. */
  currency: "MXN" | "USD";
  fxRate: number | null;
};

const YEAR_OPTIONS = SIMULATOR_YEARS.map((years) => ({ value: years, label: years === 1 ? "1 año" : `${years} años` }));

const plain = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 });

type SimulatorFormProps = {
  defaults: SimulatorDefaults;
  /** Assets from the user's plan, offered as one-tap choices. */
  suggestions: SuggestedAsset[];
  submitting: boolean;
  onSubmit: (values: SimulatorFormOutput) => void;
};

export function SimulatorForm({ defaults, suggestions, submitting, onSubmit }: SimulatorFormProps) {
  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SimulatorFormInput, unknown, SimulatorFormOutput>({
    resolver: zodResolver(simulatorFormSchema),
    defaultValues: { symbol: defaults.symbol, amount: plain.format(defaults.amount), years: defaults.years },
  });

  const symbol = useWatch({ control, name: "symbol" }).trim().toUpperCase();
  const amount = parseMoney(useWatch({ control, name: "amount" }));
  const usdPreview = defaults.fxRate && amount && amount > 0 ? amount / defaults.fxRate : null;

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      className="flex flex-col gap-6 rounded-xl border bg-card p-5"
      aria-label="Datos de la simulación"
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="sim-symbol" className="text-sm font-medium">
          Activo
        </label>
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Activos de tu plan">
            {suggestions.map((asset) => {
              const selected = asset.symbol === symbol;
              return (
                <button
                  key={asset.symbol}
                  type="button"
                  aria-pressed={selected}
                  title={asset.name}
                  onClick={() => setValue("symbol", asset.symbol, { shouldValidate: true })}
                  className={cn(
                    "inline-flex min-h-11 cursor-pointer items-center rounded-lg border px-3 font-mono text-sm font-semibold transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    selected
                      ? "border-primary bg-ocean-50 text-ocean-700"
                      : "bg-card text-foreground hover:border-ocean-200 hover:bg-ocean-50/40",
                  )}
                >
                  {asset.symbol}
                </button>
              );
            })}
          </div>
        )}
        <input
          id="sim-symbol"
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="Ej. VOO"
          maxLength={10}
          aria-invalid={errors.symbol ? true : undefined}
          aria-describedby={errors.symbol ? "sim-symbol-error" : "sim-symbol-hint"}
          className={cn(
            "h-12 w-full rounded-lg border border-input bg-background px-3 font-mono text-lg uppercase transition-colors outline-none placeholder:font-sans placeholder:normal-case placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            errors.symbol && "border-destructive ring-3 ring-destructive/20",
          )}
          {...register("symbol")}
        />
        {errors.symbol ? (
          <p id="sim-symbol-error" className="text-sm text-destructive">
            {errors.symbol.message}
          </p>
        ) : (
          <p id="sim-symbol-hint" className="text-sm text-muted-foreground">
            {suggestions.length > 0 ? "Elige uno de tu plan o escribe otra clave de EE. UU." : "Escribe la clave de una acción o ETF de EE. UU."}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="sim-amount" className="text-sm font-medium">
          Cada mes
        </label>
        <MoneyInput
          id="sim-amount"
          currency={defaults.currency}
          invalid={Boolean(errors.amount)}
          aria-describedby={errors.amount ? "sim-amount-error" : "sim-amount-hint"}
          {...register("amount")}
        />
        {errors.amount ? (
          <p id="sim-amount-error" className="text-sm text-destructive">
            {errors.amount.message}
          </p>
        ) : (
          <p id="sim-amount-hint" className="min-h-5 text-sm text-muted-foreground tabular-nums" aria-live="polite">
            {defaults.fxRate
              ? usdPreview
                ? `≈ ${formatUsd(usdPreview)} con 1 USD = ${formatMxn(defaults.fxRate)}`
                : `Lo convertimos a dólares con 1 USD = ${formatMxn(defaults.fxRate)}`
              : "En dólares: los activos de EE. UU. cotizan en USD."}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span aria-hidden="true" className="text-sm font-medium">
          Durante los últimos
        </span>
        <Controller
          control={control}
          name="years"
          render={({ field }) => (
            <Segmented
              label="Durante los últimos"
              options={YEAR_OPTIONS}
              value={field.value}
              onChange={field.onChange}
              className="flex w-full"
            />
          )}
        />
      </div>

      <Button
        type="submit"
        disabled={submitting}
        className="h-11 bg-violet-500 text-base text-white hover:bg-violet-600 active:bg-violet-700"
      >
        <LineChart data-icon="inline-start" strokeWidth={2} aria-hidden="true" />
        {submitting ? "Calculando…" : "Simular"}
      </Button>
    </form>
  );
}
