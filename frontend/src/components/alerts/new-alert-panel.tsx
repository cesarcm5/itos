"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { WATCHLIST_KEY } from "@/components/dashboard/watchlist-panel";
import { DataError, dataErrorMessage } from "@/components/data-error";
import { StaleBadge } from "@/components/stale-badge";
import { AlertFields } from "@/components/stock/alert-form";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api-client";
import { ALERT_LIMIT, normalizeSymbol, quoteKey, retryApi, type Quote } from "@/lib/market";
import type { Watchlist } from "@/lib/recommendation";

export const NEW_ALERT_INPUT_ID = "new-alert-symbol";

type NewAlertPanelProps = {
  /** True when ALERT_LIMIT alerts are already active. */
  atLimit: boolean;
};

export function NewAlertPanel({ atLimit }: NewAlertPanelProps) {
  const [draft, setDraft] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [symbol, setSymbol] = useState<string | null>(null);

  // Saved symbols as one-tap picks. Costs no market credits.
  const watchlist = useQuery({ queryKey: WATCHLIST_KEY, queryFn: () => api<Watchlist>("/watchlist") });
  const picks = (watchlist.data?.items ?? []).map((item) => item.symbol).slice(0, 6);

  const pick = (raw: string) => {
    const normalized = normalizeSymbol(raw);
    if (!normalized) {
      setInputError("Escribe una clave válida, por ejemplo VOO o AAPL.");
      return;
    }
    setInputError(null);
    setDraft(normalized);
    setSymbol(normalized);
  };

  return (
    <section id="new-alert" aria-labelledby="new-alert-title" className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2">
        <Plus className="size-5 text-ocean-600" strokeWidth={2} aria-hidden="true" />
        <h2 id="new-alert-title" className="text-lg font-semibold">
          Nueva alerta
        </h2>
      </div>

      {atLimit ? (
        <p className="mt-3 rounded-lg bg-muted px-3 py-3 text-sm leading-relaxed text-muted-foreground">
          Tienes {ALERT_LIMIT} alertas activas, el máximo. Pausa o borra una para crear otra.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Elige un activo y el precio al que quieres que te avisemos.
          </p>

          <form
            noValidate
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              pick(draft);
            }}
            className="mt-4 flex flex-col gap-2"
          >
            <label htmlFor={NEW_ALERT_INPUT_ID} className="text-sm font-medium">
              Clave del activo
            </label>
            <div className="flex gap-2">
              <input
                id={NEW_ALERT_INPUT_ID}
                type="text"
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value.toUpperCase());
                  setInputError(null);
                }}
                placeholder="VOO"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={10}
                aria-invalid={inputError ? true : undefined}
                aria-describedby={inputError ? "new-alert-symbol-error" : undefined}
                className="h-12 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 font-mono text-lg uppercase outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
              />
              <Button type="submit" variant="outline" className="h-12 px-4 text-base" aria-label="Buscar activo">
                <Search strokeWidth={2} aria-hidden="true" />
              </Button>
            </div>
            {inputError && (
              <p id="new-alert-symbol-error" className="text-sm text-destructive">
                {inputError}
              </p>
            )}
          </form>

          {picks.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground">De tu lista:</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {picks.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => pick(s)}
                    aria-pressed={symbol === s}
                    className="inline-flex min-h-11 cursor-pointer items-center rounded-full border px-3 font-mono text-sm font-semibold text-ocean-700 transition-colors duration-150 hover:bg-ocean-50 aria-pressed:border-primary aria-pressed:bg-ocean-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {symbol && <SymbolQuote key={symbol} symbol={symbol} />}
        </>
      )}

      <p className="mt-4 text-xs leading-snug text-muted-foreground">
        No es en tiempo real: revisamos los precios cada 15 minutos mientras abre el mercado de EE. UU.
      </p>
    </section>
  );
}

function SymbolQuote({ symbol }: { symbol: string }) {
  const quote = useQuery({
    queryKey: quoteKey(symbol),
    queryFn: () => api<Quote>(`/stocks/${encodeURIComponent(symbol)}/quote`),
    staleTime: 60_000,
    retry: retryApi,
  });

  if (quote.isPending) {
    return (
      <div aria-busy="true" aria-label={`Cargando el precio de ${symbol}`} className="mt-5 animate-pulse border-t pt-5">
        <div className="h-4 w-40 rounded bg-muted" />
        <div className="mt-4 h-11 rounded-lg bg-muted" />
        <div className="mt-4 h-12 rounded-lg bg-muted" />
        <div className="mt-4 h-11 rounded-lg bg-muted" />
      </div>
    );
  }

  if (quote.isError) {
    if (quote.error instanceof ApiError && quote.error.code === "NOT_FOUND") {
      return (
        <p role="alert" className="mt-5 rounded-lg bg-muted px-3 py-3 text-sm text-muted-foreground">
          No encontramos {symbol}. Por ahora solo tenemos acciones y ETFs de EE. UU.
        </p>
      );
    }
    return (
      <DataError
        className="mt-5"
        message={dataErrorMessage(quote.error, `el precio de ${symbol}`)}
        onRetry={() => void quote.refetch()}
        retrying={quote.isFetching}
      />
    );
  }

  return (
    <div className="mt-5 border-t pt-5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-mono text-sm font-semibold text-ocean-700">{quote.data.symbol}</span>
        <span className="min-w-0 truncate text-sm text-muted-foreground">{quote.data.name}</span>
        {quote.data.stale && <StaleBadge asOf={quote.data.cachedAt} label="Precio" />}
      </div>
      <AlertFields symbol={quote.data.symbol} currentPrice={quote.data.price} className="mt-4" />
    </div>
  );
}
