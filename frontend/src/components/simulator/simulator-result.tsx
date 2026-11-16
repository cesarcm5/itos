"use client";

import { Info } from "lucide-react";
import { useReducedMotion } from "motion/react";
import Link from "next/link";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { cn } from "cn";
import { AnimatedNumber } from "@/components/animated-number";
import { StaleBadge } from "@/components/stale-badge";
import {
  formatCompactUsd,
  formatLongMonthYear,
  formatMonthYear,
  formatMxn,
  formatSignedPct,
  formatSignedUsd,
  formatUsd,
} from "@/lib/format";
import type { Simulation, SimulationPoint, SimulationRequest } from "@/lib/market";

const shares = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 4 });

type SimulatorResultProps = {
  result: Simulation;
  /** The latest request; its MXN amount is used only when it matches `result`. */
  request: SimulationRequest;
  /** A newer simulation is loading; `result` is the previous one. */
  updating: boolean;
};

export function SimulatorResult({ result, request, updating }: SimulatorResultProps) {
  const first = result.series[0];
  const matches =
    request.symbol === result.symbol &&
    request.years === result.years &&
    request.monthlyAmountUsd === result.monthlyAmountUsd;
  const mxn = matches ? request.monthlyAmountMxn : null;
  const direction = result.gain > 0 ? "gain" : result.gain < 0 ? "loss" : "flat";
  const shortHistory = result.months < result.years * 12;

  if (!first) {
    return (
      <div className="rounded-xl border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
        No hay precios suficientes de {result.symbol} para simular este periodo.
      </div>
    );
  }

  const amountText = mxn !== null ? `${formatMxn(mxn)} (≈ ${formatUsd(result.monthlyAmountUsd)})` : formatUsd(result.monthlyAmountUsd);

  return (
    <section
      aria-labelledby="sim-result-title"
      aria-busy={updating || undefined}
      className={cn("rounded-xl border bg-card p-5 transition-opacity duration-150 sm:p-8", updating && "opacity-50")}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 id="sim-result-title" className="font-sans text-sm font-medium tracking-normal text-muted-foreground">
          Lo que tendrías hoy
        </h2>
        {result.stale && <StaleBadge asOf={result.cachedAt} label="Precios" />}
      </div>

      <p className="mt-2 font-heading text-4xl leading-[1.1] font-semibold tracking-tight tabular-nums sm:text-5xl">
        <AnimatedNumber value={result.value} format={formatUsd} />
      </p>

      <p className="mt-4 max-w-prose leading-relaxed text-muted-foreground" aria-live="polite">
        Si hubieras invertido <strong className="font-semibold text-foreground tabular-nums">{amountText} al mes</strong> en{" "}
        <Link
          href={`/stock/${encodeURIComponent(result.symbol)}`}
          className="rounded-sm font-mono font-semibold text-ocean-700 underline decoration-ocean-200 underline-offset-4 transition-colors duration-150 hover:decoration-ocean-600"
        >
          {result.symbol}
        </Link>{" "}
        desde {formatLongMonthYear(first.date)}, habrías aportado{" "}
        <strong className="font-semibold text-foreground tabular-nums">{formatUsd(result.contributed)}</strong> y hoy
        tendrías <strong className="font-semibold text-foreground tabular-nums">{formatUsd(result.value)}</strong>.
      </p>

      {shortHistory && (
        <p className="mt-2 text-sm text-muted-foreground">
          {result.symbol} solo tiene precios desde {formatLongMonthYear(first.date)}, así que simulamos {result.months}{" "}
          {result.months === 1 ? "mes" : "meses"}.
        </p>
      )}

      {/* Next to the figures on purpose: the result must never read as a promise (product spec, simulator). */}
      <p className="mt-4 flex gap-2 rounded-lg bg-ocean-50 px-3 py-2.5 text-sm leading-snug text-ocean-800">
        <Info className="mt-0.5 size-4 shrink-0 text-ocean-600" strokeWidth={2} aria-hidden="true" />
        <span>
          <strong className="font-semibold">Resultados anteriores no garantizan resultados futuros.</strong> Esto es lo que
          habría pasado con precios reales, no lo que va a pasar.
        </span>
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t pt-5 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted-foreground">Aportaste</dt>
          <dd className="mt-0.5 font-medium tabular-nums">{formatUsd(result.contributed)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{direction === "loss" ? "Pérdida" : "Ganancia"}</dt>
          <dd
            className={cn(
              "mt-0.5 font-medium tabular-nums",
              direction === "gain" && "text-gain",
              direction === "loss" && "text-loss",
            )}
          >
            {formatSignedUsd(result.gain)}{" "}
            <span className="text-sm">({formatSignedPct(result.gainPct)})</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Compras mensuales</dt>
          <dd className="mt-0.5 font-medium tabular-nums">
            {result.months} · {shares.format(result.shares)} {result.shares === 1 ? "título" : "títulos"}
          </dd>
        </div>
      </dl>

      <SimulationChart series={result.series} />

      {mxn !== null && request.fxRate !== null && (
        <p className="mt-4 text-xs leading-snug text-muted-foreground">
          Calculado en dólares con el tipo de cambio de hoy (1 USD = {formatMxn(request.fxRate)}). No incluye cómo cambió el
          peso frente al dólar en ese tiempo.
        </p>
      )}
    </section>
  );
}

const SERIES = [
  { key: "value", label: "Valor de tu inversión", color: "var(--color-chart-1)" },
  { key: "contributed", label: "Lo que aportaste", color: "var(--color-chart-2)" },
] as const;

function SimulationChart({ series }: { series: SimulationPoint[] }) {
  const reduceMotion = useReducedMotion();
  const last = series.at(-1)!;
  const animate = !reduceMotion;

  return (
    <div className="mt-6">
      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Leyenda">
        {SERIES.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span aria-hidden="true" className="h-0.5 w-4 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-muted-foreground">{s.label}</span>
            <span className="font-medium tabular-nums">{formatUsd(last[s.key])}</span>
          </li>
        ))}
      </ul>

      <div
        className="mt-4 h-64 sm:h-80"
        role="img"
        aria-label={`Mes a mes, de ${formatMonthYear(series[0]!.date)} a ${formatMonthYear(last.date)}: aportaste ${formatUsd(last.contributed)} y tu inversión llegó a ${formatUsd(last.value)}.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis
              dataKey="date"
              tickFormatter={formatMonthYear}
              tickLine={false}
              axisLine={false}
              minTickGap={40}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
              dy={8}
            />
            <YAxis
              tickFormatter={formatCompactUsd}
              tickLine={false}
              axisLine={false}
              width="auto"
              tickCount={5}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
            />
            <Tooltip
              content={SimulationTooltip}
              cursor={{ stroke: "var(--color-chart-5)", strokeWidth: 1 }}
              isAnimationActive={false}
            />
            <Area
              type="linear"
              dataKey="value"
              name={SERIES[0].label}
              stroke={SERIES[0].color}
              strokeWidth={2}
              fill={SERIES[0].color}
              fillOpacity={0.1}
              activeDot={{ r: 5, fill: SERIES[0].color, stroke: "var(--color-card)", strokeWidth: 2 }}
              isAnimationActive={animate}
              animationDuration={600}
              animationEasing="ease-in-out"
            />
            <Line
              type="linear"
              dataKey="contributed"
              name={SERIES[1].label}
              stroke={SERIES[1].color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: SERIES[1].color, stroke: "var(--color-card)", strokeWidth: 2 }}
              isAnimationActive={animate}
              animationDuration={600}
              animationEasing="ease-in-out"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <details className="group mt-4">
        <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-lg px-2 text-sm font-medium text-primary transition-colors duration-150 hover:bg-ocean-50">
          <span className="group-open:hidden">Ver mes a mes en tabla</span>
          <span className="hidden group-open:inline">Ocultar tabla</span>
        </summary>
        <div className="mt-2 max-h-72 overflow-y-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted text-left text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  Mes
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Aportado
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Valor
                </th>
              </tr>
            </thead>
            <tbody>
              {series.map((point) => (
                <tr key={point.date} className="border-t">
                  <td className="px-3 py-2">{formatMonthYear(point.date)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatUsd(point.contributed)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatUsd(point.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function SimulationTooltip({ active, payload }: TooltipContentProps) {
  const point = payload?.[0]?.payload as SimulationPoint | undefined;
  if (!active || !point) return null;
  const gain = point.value - point.contributed;
  return (
    <div className="min-w-44 rounded-lg border bg-card px-3 py-2 text-sm shadow-sm">
      <p className="text-xs text-muted-foreground">{formatMonthYear(point.date)}</p>
      <dl className="mt-1 flex flex-col gap-0.5">
        {SERIES.map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <span aria-hidden="true" className="h-0.5 w-3 rounded-full" style={{ backgroundColor: s.color }} />
            <dt className="text-muted-foreground">{s.key === "value" ? "Valor" : "Aportado"}</dt>
            <dd className="ml-auto font-medium tabular-nums">{formatUsd(point[s.key])}</dd>
          </div>
        ))}
        <div className="mt-1 flex items-center gap-2 border-t pt-1">
          <dt className="text-muted-foreground">{gain < 0 ? "Pérdida" : "Ganancia"}</dt>
          <dd className={cn("ml-auto font-medium tabular-nums", gain > 0 && "text-gain", gain < 0 && "text-loss")}>
            {formatSignedUsd(gain)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function SimulatorResultSkeleton() {
  return (
    <div aria-busy="true" aria-label="Calculando la simulación" className="animate-pulse rounded-xl border bg-card p-5 sm:p-8">
      <div className="h-4 w-32 rounded bg-muted" />
      <div className="mt-3 h-10 w-56 max-w-full rounded-lg bg-muted sm:h-12" />
      <div className="mt-5 h-4 w-full max-w-md rounded bg-muted" />
      <div className="mt-2 h-4 w-3/4 max-w-sm rounded bg-muted" />
      <div className="mt-6 grid grid-cols-2 gap-4 border-t pt-5 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <div className="h-3 w-20 rounded bg-muted" />
            <div className="mt-2 h-5 w-24 rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="mt-6 h-64 rounded-lg bg-muted sm:h-80" />
    </div>
  );
}
