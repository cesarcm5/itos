"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useReducedMotion } from "motion/react";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { cn } from "cn";
import { DataError, dataErrorMessage } from "@/components/data-error";
import { Segmented } from "@/components/segmented";
import { StaleBadge } from "@/components/stale-badge";
import { api } from "@/lib/api-client";
import {
  formatCompactUsd,
  formatMarketDate,
  formatMarketDay,
  formatMonthYear,
  formatSignedPct,
  formatUsd,
} from "@/lib/format";
import { historyKey, RANGES, retryApi, type History, type PricePoint, type Range } from "@/lib/market";

const RANGE_LABEL: Record<Range, string> = {
  "1M": "el último mes",
  "6M": "los últimos 6 meses",
  "1Y": "el último año",
  "5Y": "los últimos 5 años",
};

const RANGE_OPTIONS = RANGES.map((range) => ({ value: range, label: range }));

// 1M/6M are daily closes, 1Y/5Y monthly closes (backend/src/routes/stocks.ts).
const isDaily = (range: Range) => range === "1M" || range === "6M";

export function PriceChart({ symbol }: { symbol: string }) {
  const [range, setRange] = useState<Range>("1Y");
  const query = useQuery({
    queryKey: historyKey(symbol, range),
    queryFn: () => api<History>(`/stocks/${encodeURIComponent(symbol)}/history?range=${range}`),
    // Keep the old line on screen while the next range loads, instead of flashing a skeleton.
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
    retry: retryApi,
  });

  const points = query.data?.points ?? [];
  const switching = query.isPlaceholderData;

  return (
    <section aria-labelledby="chart-title" className="rounded-xl border bg-card p-5 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 id="chart-title" className="text-lg font-semibold">
            Cómo se ha movido
          </h2>
          <PeriodChange points={points} range={range} loading={query.isPending || switching} />
        </div>
        <Segmented label="Periodo de la gráfica" options={RANGE_OPTIONS} value={range} onChange={setRange} />
      </div>

      {query.data?.stale && (
        <p className="mt-3">
          <StaleBadge asOf={query.data.cachedAt} />
        </p>
      )}

      <div className="mt-6">
        {query.isPending ? (
          <div aria-busy="true" aria-label="Cargando la gráfica" className="h-64 animate-pulse rounded-lg bg-muted sm:h-80" />
        ) : query.isError && !query.data ? (
          <DataError
            className="h-64 justify-center sm:h-80"
            message={dataErrorMessage(query.error, "la gráfica")}
            onRetry={() => void query.refetch()}
            retrying={query.isFetching}
          />
        ) : points.length < 2 ? (
          <div className="flex h-64 items-center justify-center rounded-lg bg-muted px-4 text-center text-sm text-muted-foreground sm:h-80">
            No hay suficientes precios para {RANGE_LABEL[range]}. Prueba otro periodo.
          </div>
        ) : (
          <div
            className={cn("transition-opacity duration-150", switching && "opacity-50")}
            aria-busy={switching || undefined}
          >
            <Chart points={points} range={query.data?.range ?? range} />
            <PriceTable points={points} />
          </div>
        )}
      </div>
    </section>
  );
}

function PeriodChange({ points, range, loading }: { points: PricePoint[]; range: Range; loading: boolean }) {
  const first = points[0];
  const last = points.at(-1);
  if (loading || !first || !last || first.close <= 0) {
    return <p className="mt-1 h-5 w-48 max-w-full rounded bg-muted motion-safe:animate-pulse" aria-hidden="true" />;
  }
  const pct = ((last.close - first.close) / first.close) * 100;
  return (
    <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
      <span className={cn("font-medium tabular-nums", pct > 0 && "text-gain", pct < 0 && "text-loss")}>
        {formatSignedPct(pct)}
      </span>{" "}
      en {RANGE_LABEL[range]}
    </p>
  );
}

function Chart({ points, range }: { points: PricePoint[]; range: Range }) {
  const reduceMotion = useReducedMotion();
  const tickDate = isDaily(range) ? formatMarketDay : formatMonthYear;
  const first = points[0]!;
  const last = points.at(-1)!;
  const lows = points.map((p) => p.close);
  const min = Math.min(...lows);
  const max = Math.max(...lows);

  return (
    <div
      className="h-64 sm:h-80"
      role="img"
      aria-label={`Precio de cierre de ${formatMarketDate(first.date)} a ${formatMarketDate(last.date)}: de ${formatUsd(first.close)} a ${formatUsd(last.close)}. Mínimo ${formatUsd(min)}, máximo ${formatUsd(max)}.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--color-border)" />
          <XAxis
            dataKey="date"
            tickFormatter={tickDate}
            tickLine={false}
            axisLine={false}
            minTickGap={40}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
            dy={8}
          />
          <YAxis
            domain={["auto", "auto"]}
            tickFormatter={formatCompactUsd}
            tickLine={false}
            axisLine={false}
            width="auto"
            tickCount={5}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
          />
          <Tooltip
            content={PriceTooltip}
            cursor={{ stroke: "var(--color-chart-5)", strokeWidth: 1 }}
            isAnimationActive={false}
          />
          <Area
            type="linear"
            dataKey="close"
            name="Precio"
            stroke="var(--color-chart-1)"
            strokeWidth={2}
            fill="var(--color-chart-1)"
            fillOpacity={0.1}
            activeDot={{ r: 5, fill: "var(--color-chart-1)", stroke: "var(--color-card)", strokeWidth: 2 }}
            isAnimationActive={!reduceMotion}
            animationDuration={600}
            animationEasing="ease-in-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function PriceTooltip({ active, payload }: TooltipContentProps) {
  const point = payload?.[0]?.payload as PricePoint | undefined;
  if (!active || !point) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-sm shadow-sm">
      <p className="text-xs text-muted-foreground">{formatMarketDate(point.date)}</p>
      <p className="mt-0.5 font-semibold tabular-nums">{formatUsd(point.close)}</p>
    </div>
  );
}

// Table alternative to the chart (screen readers, exact values).
function PriceTable({ points }: { points: PricePoint[] }) {
  return (
    <details className="group mt-4">
      <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-lg px-2 text-sm font-medium text-primary transition-colors duration-150 hover:bg-ocean-50">
        <span className="group-open:hidden">Ver precios en tabla</span>
        <span className="hidden group-open:inline">Ocultar tabla</span>
      </summary>
      <div className="mt-2 max-h-72 overflow-y-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted text-left text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">
                Fecha
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Cierre
              </th>
            </tr>
          </thead>
          <tbody>
            {[...points].reverse().map((point) => (
              <tr key={point.date} className="border-t">
                <td className="px-3 py-2">{formatMarketDate(point.date)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatUsd(point.close)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
