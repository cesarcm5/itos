"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useReducedMotion, type Variants } from "motion/react";
import * as m from "motion/react-m";
import Link from "next/link";
import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Disclaimer } from "@/components/disclaimer";
import { SimulatorForm, type SimulatorDefaults } from "@/components/simulator/simulator-form";
import { DataError, dataErrorMessage } from "@/components/data-error";
import { SimulatorResult, SimulatorResultSkeleton } from "@/components/simulator/simulator-result";
import { api, ApiError } from "@/lib/api-client";
import { retryApi, type Simulation, type SimulationRequest, type SimulatorYears } from "@/lib/market";
import type { Recommendation } from "@/lib/recommendation";

const EASE = [0.22, 1, 0.36, 1] as const;
const FALLBACK_SYMBOL = "VOO";
const FALLBACK_MXN = 2000;
const FALLBACK_USD = 100;

export function Simulator({ initialSymbol }: { initialSymbol: string | null }) {
  // Shares the dashboard's cache: pre-fills the amount, the first tip and the USD/MXN rate.
  const rec = useQuery({
    queryKey: ["recommendations"],
    queryFn: () => api<Recommendation>("/recommendations"),
    retry: retryApi,
  });

  return (
    <div className="flex flex-1 flex-col bg-muted/60">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-12 sm:px-6 sm:pt-8">
        <Link
          href="/dashboard"
          className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" strokeWidth={2} aria-hidden="true" />
          Tu plan
        </Link>
        <div className="mt-3">
          <h1 className="text-[2rem] leading-[1.15] font-bold sm:text-5xl">¿Cuánto habría generado?</h1>
          <p className="mt-2 max-w-prose text-muted-foreground">
            Imagina que invertiste la misma cantidad cada mes. Así se vería hoy, con precios reales.
          </p>
        </div>

        {/* Without a profile or rate the simulator still works, in USD and with generic defaults. */}
        {rec.isPending ? (
          <SimulatorSkeleton />
        ) : (
          <SimulatorBody
            initialSymbol={initialSymbol}
            rec={rec.isSuccess ? rec.data : null}
          />
        )}
      </main>
    </div>
  );
}

function defaultsFrom(rec: Recommendation | null, initialSymbol: string | null): SimulatorDefaults {
  const fxRate = rec?.fx?.rate ?? null;
  const symbol = initialSymbol ?? rec?.where.assets[0]?.symbol ?? FALLBACK_SYMBOL;
  if (fxRate !== null) {
    const amount = rec && rec.suggestedMonthly > 0 ? rec.suggestedMonthly : FALLBACK_MXN;
    return { symbol, amount, years: 5, currency: "MXN", fxRate };
  }
  const usd = rec?.suggestedMonthlyUsd;
  return { symbol, amount: usd && usd > 0 ? usd : FALLBACK_USD, years: 5, currency: "USD", fxRate: null };
}

function toRequest(values: { symbol: string; amount: number; years: SimulatorYears }, fxRate: number | null): SimulationRequest {
  const usd = fxRate ? Math.round((values.amount / fxRate) * 100) / 100 : values.amount;
  return {
    symbol: values.symbol,
    monthlyAmountUsd: usd,
    years: values.years,
    monthlyAmountMxn: fxRate ? values.amount : null,
    fxRate,
  };
}

function SimulatorBody({ initialSymbol, rec }: { initialSymbol: string | null; rec: Recommendation | null }) {
  const reduceMotion = useReducedMotion();
  const [defaults] = useState(() => defaultsFrom(rec, initialSymbol));
  // Runs once with the pre-filled values so the page opens with a result.
  const [request, setRequest] = useState<SimulationRequest>(() => toRequest(defaults, defaults.fxRate));

  const simulation = useQuery({
    queryKey: ["simulation", request.symbol, request.monthlyAmountUsd, request.years],
    queryFn: () =>
      api<Simulation>("/simulator", {
        method: "POST",
        body: JSON.stringify({
          symbol: request.symbol,
          monthlyAmountUsd: request.monthlyAmountUsd,
          years: request.years,
        }),
      }),
    placeholderData: keepPreviousData,
    staleTime: 10 * 60_000,
    retry: retryApi,
  });

  const suggestions = rec?.where.assets ?? [];
  const notFound = simulation.error instanceof ApiError && simulation.error.code === "NOT_FOUND";

  const container: Variants = { hidden: {}, show: { transition: { staggerChildren: reduceMotion ? 0 : 0.04 } } };
  const item: Variants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE } },
  };

  return (
    <m.div variants={container} initial="hidden" animate="show">
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-8">
        <m.div variants={item} className="lg:sticky lg:top-6">
          <SimulatorForm
            defaults={defaults}
            suggestions={suggestions}
            submitting={simulation.isFetching}
            onSubmit={(values) => setRequest(toRequest(values, defaults.fxRate))}
          />
        </m.div>

        <m.div variants={item} className="min-w-0">
          {simulation.isPending ? (
            <SimulatorResultSkeleton />
          ) : simulation.isError ? (
            <DataError
              className="bg-card py-12"
              message={
                notFound
                  ? `No encontramos precios de ${request.symbol}. Revisa la clave o elige uno de tus activos sugeridos.`
                  : dataErrorMessage(simulation.error, "la simulación")
              }
              onRetry={() => void simulation.refetch()}
              retrying={simulation.isFetching}
            />
          ) : (
            <SimulatorResult
              key={`${simulation.data.symbol}-${simulation.data.years}-${simulation.data.monthlyAmountUsd}`}
              result={simulation.data}
              request={request}
              updating={simulation.isPlaceholderData}
            />
          )}
        </m.div>
      </div>

      <m.div variants={item} className="mt-10 border-t pt-6">
        <Disclaimer>
          Simulación con precios de cierre mensuales; solo cuenta el cambio de precio, sin dividendos ni comisiones.
        </Disclaimer>
      </m.div>
    </m.div>
  );
}

/** Whole-page placeholder while the route reads `?symbol=`. */
export function SimulatorFallback() {
  return (
    <div className="flex flex-1 flex-col bg-muted/60">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-12 sm:px-6 sm:pt-8">
        <div className="h-11" />
        <div className="mt-3 h-9 w-72 max-w-full animate-pulse rounded-lg bg-border/70 sm:h-12 sm:w-[28rem]" />
        <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-border/70" />
        <SimulatorSkeleton />
      </main>
    </div>
  );
}

function SimulatorSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando el simulador" className="mt-8 grid animate-pulse items-start gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-8">
      <div className="flex flex-col gap-5 rounded-xl border bg-card p-5">
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <div className="h-4 w-28 rounded bg-muted" />
            <div className="mt-2 h-12 rounded-lg bg-muted" />
          </div>
        ))}
        <div className="h-11 rounded-lg bg-muted" />
      </div>
      <SimulatorResultSkeleton />
    </div>
  );
}
