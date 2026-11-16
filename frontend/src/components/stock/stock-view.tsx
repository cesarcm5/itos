"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, LineChart } from "lucide-react";
import { useReducedMotion, type Variants } from "motion/react";
import * as m from "motion/react-m";
import Image from "next/image";
import Link from "next/link";
import { cn } from "cn";
import { AppHeader } from "@/components/app-header";
import { DataError, dataErrorMessage } from "@/components/data-error";
import { Disclaimer } from "@/components/disclaimer";
import { AlertForm } from "@/components/stock/alert-form";
import { PriceChart } from "@/components/stock/price-chart";
import { QuoteCard } from "@/components/stock/quote-card";
import { WatchlistToggle } from "@/components/stock/watchlist-toggle";
import { buttonVariants } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api-client";
import { quoteKey, retryApi, type Quote } from "@/lib/market";

const EASE = [0.22, 1, 0.36, 1] as const;

export function StockView({ symbol }: { symbol: string }) {
  const reduceMotion = useReducedMotion();
  const quote = useQuery({
    queryKey: quoteKey(symbol),
    queryFn: () => api<Quote>(`/stocks/${encodeURIComponent(symbol)}/quote`),
    // Matches the API's 60 s quote cache: refetching sooner can't return a newer price.
    staleTime: 60_000,
    retry: retryApi,
  });

  const notFound = quote.error instanceof ApiError && quote.error.code === "NOT_FOUND";

  // Same entrance as the dashboard: 250 ms per block, 40 ms apart.
  const container: Variants = { hidden: {}, show: { transition: { staggerChildren: reduceMotion ? 0 : 0.04 } } };
  const item: Variants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE } },
  };

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

        {notFound ? (
          <SymbolNotFound symbol={symbol} />
        ) : (
          <m.div variants={container} initial="hidden" animate="show" className="mt-3">
            <m.div variants={item}>
              <StockTitle symbol={symbol} quote={quote.data} loading={quote.isPending} />
            </m.div>

            <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
              <div className="flex min-w-0 flex-col gap-6">
                <m.div variants={item}>
                  {quote.isPending ? (
                    <QuoteSkeleton />
                  ) : quote.isError ? (
                    <DataError
                      className="bg-card"
                      message={dataErrorMessage(quote.error, "el precio")}
                      onRetry={() => void quote.refetch()}
                      retrying={quote.isFetching}
                    />
                  ) : (
                    <QuoteCard quote={quote.data} />
                  )}
                </m.div>
                <m.div variants={item}>
                  <PriceChart symbol={symbol} />
                </m.div>
              </div>

              <div className="flex flex-col gap-6 lg:sticky lg:top-6">
                <m.div variants={item} className="flex flex-col gap-3 rounded-xl border bg-card p-5">
                  <Link
                    href={`/simulator?symbol=${encodeURIComponent(symbol)}`}
                    className={cn(
                      buttonVariants(),
                      "h-11 bg-violet-500 px-5 text-base text-white hover:bg-violet-600 active:bg-violet-700",
                    )}
                  >
                    <LineChart data-icon="inline-start" strokeWidth={2} aria-hidden="true" />
                    Simular con {symbol}
                  </Link>
                  <p className="text-center text-xs text-muted-foreground">
                    Mira cuánto tendrías hoy si hubieras invertido cada mes.
                  </p>
                  <div className="border-t pt-3">
                    <WatchlistToggle symbol={symbol} />
                  </div>
                </m.div>
                <m.div variants={item}>
                  <AlertForm symbol={symbol} currentPrice={quote.data?.price ?? null} />
                </m.div>
              </div>
            </div>

            <m.div variants={item} className="mt-10 border-t pt-6">
              <Disclaimer>Precios con posible retraso. Información educativa, no una recomendación de compra.</Disclaimer>
            </m.div>
          </m.div>
        )}
      </main>
    </div>
  );
}

function StockTitle({ symbol, quote, loading }: { symbol: string; quote?: Quote; loading: boolean }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-[2rem] leading-[1.15] font-bold tracking-normal text-ocean-700 sm:text-5xl">
          {symbol}
        </h1>
        {quote && (
          <span className="rounded-full bg-ocean-50 px-2.5 py-1 text-xs font-semibold text-ocean-700">
            {quote.exchange} · {quote.currency}
          </span>
        )}
      </div>
      {loading ? (
        <p className="mt-3 h-5 w-64 max-w-full animate-pulse rounded bg-border/70" aria-hidden="true" />
      ) : quote ? (
        <p className="mt-2 text-lg text-muted-foreground">{quote.name}</p>
      ) : null}
    </div>
  );
}

/** Whole-page placeholder while the route reads the symbol. */
export function StockFallback() {
  return (
    <div className="flex flex-1 flex-col bg-muted/60">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-12 sm:px-6 sm:pt-8">
        <div className="h-11" />
        <div className="mt-3 h-9 w-32 animate-pulse rounded-lg bg-border/70 sm:h-12" />
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
          <QuoteSkeleton />
          <div className="h-40 animate-pulse rounded-xl border bg-card" />
        </div>
      </main>
    </div>
  );
}

function QuoteSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando el precio" className="animate-pulse rounded-xl border bg-card p-5 sm:p-8">
      <div className="h-4 w-28 rounded bg-muted" />
      <div className="mt-3 h-10 w-56 max-w-full rounded-lg bg-muted sm:h-12" />
      <div className="mt-3 h-4 w-72 max-w-full rounded bg-muted" />
      <div className="mt-6 grid grid-cols-2 gap-4 border-t pt-5 sm:grid-cols-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i}>
            <div className="h-3 w-20 rounded bg-muted" />
            <div className="mt-2 h-5 w-24 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SymbolNotFound({ symbol }: { symbol: string }) {
  return (
    <div className="mx-auto mt-10 flex max-w-md flex-col items-center rounded-xl border bg-card px-6 py-10 text-center">
      <Image src="/itos_icons/search_itos.svg" alt="" width={48} height={48} className="size-12" />
      <h1 className="mt-4 text-2xl font-semibold">No encontramos {symbol}</h1>
      <p className="mt-2 text-muted-foreground">
        Revisa la clave del activo. Por ahora solo tenemos acciones y ETFs de EE. UU.
      </p>
      <Link href="/dashboard" className={cn(buttonVariants(), "mt-6 h-11 px-5 text-base")}>
        Volver a tu plan
      </Link>
    </div>
  );
}
