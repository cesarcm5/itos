import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "cn";
import { StaleBadge } from "@/components/stale-badge";
import { TermHint } from "@/components/term-hint";
import { formatAge, formatCompactNumber, formatSignedPct, formatUsd } from "@/lib/format";
import type { Quote } from "@/lib/market";

/** Prices are USD on the free plan; anything else still gets a proper currency format. */
export function formatPrice(value: number, currency: string): string {
  if (currency === "USD") return formatUsd(value);
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(value);
}

function signedPrice(value: number, currency: string): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatPrice(Math.abs(value), currency)}`;
}

export function QuoteCard({ quote }: { quote: Quote }) {
  const direction = quote.change > 0 ? "up" : quote.change < 0 ? "down" : "flat";
  const Icon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;
  const price = (value: number) => formatPrice(value, quote.currency);

  const facts: { label: string; value: string }[] = [
    { label: "Apertura", value: price(quote.open) },
    { label: "Cierre anterior", value: price(quote.previousClose) },
    { label: "Máximo del día", value: price(quote.high) },
    { label: "Mínimo del día", value: price(quote.low) },
  ];
  if (quote.volume !== null) facts.push({ label: "Volumen", value: formatCompactNumber(quote.volume) });

  const hasRange = quote.fiftyTwoWeekLow !== null && quote.fiftyTwoWeekHigh !== null;

  return (
    <section aria-labelledby="quote-title" className="rounded-xl border bg-card p-5 sm:p-8">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 id="quote-title" className="font-sans text-sm font-medium tracking-normal text-muted-foreground">
          Precio actual
        </h2>
        {quote.isMarketOpen !== null && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
              quote.isMarketOpen ? "bg-gain/10 text-gain" : "bg-muted text-muted-foreground",
            )}
          >
            <span
              aria-hidden="true"
              className={cn("size-1.5 rounded-full", quote.isMarketOpen ? "bg-gain" : "bg-muted-foreground")}
            />
            {quote.isMarketOpen ? "Mercado abierto" : "Mercado cerrado"}
          </span>
        )}
        {quote.stale && <StaleBadge asOf={quote.cachedAt} />}
      </div>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="font-heading text-4xl leading-[1.1] font-semibold tracking-tight tabular-nums sm:text-5xl">
          {price(quote.price)}
        </p>
        <p
          className={cn(
            "inline-flex items-center gap-1 font-medium tabular-nums",
            direction === "up" && "text-gain",
            direction === "down" && "text-loss",
            direction === "flat" && "text-muted-foreground",
          )}
        >
          <Icon className="size-4" strokeWidth={2} aria-hidden="true" />
          {signedPrice(quote.change, quote.currency)} ({formatSignedPct(quote.percentChange)})
          <span className="font-normal text-muted-foreground">hoy</span>
        </p>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        Actualizado {formatAge(quote.asOf)} · Puede tener retraso, no es en tiempo real.
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t pt-5 sm:grid-cols-3">
        {facts.map((fact) => (
          <div key={fact.label}>
            <dt className="text-xs text-muted-foreground">{fact.label}</dt>
            <dd className="mt-0.5 font-medium tabular-nums">{fact.value}</dd>
          </div>
        ))}
      </dl>

      {hasRange && (
        <FiftyTwoWeekRange
          low={quote.fiftyTwoWeekLow!}
          high={quote.fiftyTwoWeekHigh!}
          current={quote.price}
          format={price}
        />
      )}
    </section>
  );
}

function FiftyTwoWeekRange({
  low,
  high,
  current,
  format,
}: {
  low: number;
  high: number;
  current: number;
  format: (value: number) => string;
}) {
  const position = high > low ? Math.min(Math.max((current - low) / (high - low), 0), 1) : 0.5;

  return (
    <div className="mt-6">
      <p className="text-xs text-muted-foreground">
        Rango de{" "}
        <TermHint term="52 semanas">
          El precio más bajo y el más alto del último año. Te ayuda a ver si hoy está cerca de un extremo.
        </TermHint>
      </p>
      <div
        className="relative mt-3 h-2 rounded-full bg-ocean-100"
        role="img"
        aria-label={`En el último año osciló entre ${format(low)} y ${format(high)}. Hoy está en ${format(current)}.`}
      >
        <span
          aria-hidden="true"
          className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ocean-600 ring-2 ring-card"
          style={{ left: `${position * 100}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-xs tabular-nums" aria-hidden="true">
        <span>
          <span className="text-muted-foreground">Mín. </span>
          <span className="font-medium">{format(low)}</span>
        </span>
        <span>
          <span className="text-muted-foreground">Máx. </span>
          <span className="font-medium">{format(high)}</span>
        </span>
      </div>
    </div>
  );
}
