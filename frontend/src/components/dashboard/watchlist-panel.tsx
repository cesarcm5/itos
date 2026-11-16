"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, X } from "lucide-react";
import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import Image from "next/image";
import Link from "next/link";
import { DataError, dataErrorMessage } from "@/components/data-error";
import { api } from "@/lib/api-client";
import { formatShortDate } from "@/lib/format";
import type { Watchlist } from "@/lib/recommendation";

const EASE = [0.22, 1, 0.36, 1] as const;
export const WATCHLIST_KEY = ["watchlist"] as const;

type WatchlistPanelProps = {
  /** Known asset names (from the suggestions) to show under the ticker. */
  names: Record<string, string>;
  /** Asset to point to from the empty state. */
  exploreSymbol?: string;
};

export function WatchlistPanel({ names, exploreSymbol }: WatchlistPanelProps) {
  const queryClient = useQueryClient();
  const reduceMotion = useReducedMotion();
  const query = useQuery({ queryKey: WATCHLIST_KEY, queryFn: () => api<Watchlist>("/watchlist") });

  // Optimistic: the row leaves right away and comes back if the request fails.
  const remove = useMutation({
    mutationFn: (symbol: string) => api<Watchlist>(`/watchlist/${encodeURIComponent(symbol)}`, { method: "DELETE" }),
    onMutate: async (symbol) => {
      await queryClient.cancelQueries({ queryKey: WATCHLIST_KEY });
      const previous = queryClient.getQueryData<Watchlist>(WATCHLIST_KEY);
      queryClient.setQueryData<Watchlist>(WATCHLIST_KEY, (old) =>
        old ? { items: old.items.filter((item) => item.symbol !== symbol) } : old,
      );
      return { previous };
    },
    onError: (_error, _symbol, context) => {
      if (context?.previous) queryClient.setQueryData(WATCHLIST_KEY, context.previous);
    },
    onSuccess: (data) => queryClient.setQueryData(WATCHLIST_KEY, data),
  });

  const items = query.data?.items ?? [];

  return (
    <section aria-labelledby="watchlist-title" className="rounded-xl border bg-card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="watchlist-title" className="text-lg font-semibold">
          Tu lista
        </h2>
        {query.isSuccess && items.length > 0 && (
          <span className="text-sm text-muted-foreground tabular-nums">
            {items.length} {items.length === 1 ? "activo" : "activos"}
          </span>
        )}
      </div>

      {remove.isError && (
        <p role="alert" className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          No pudimos quitar {remove.variables}. Intenta de nuevo.
        </p>
      )}

      {query.isPending ? (
        <ul aria-busy="true" aria-label="Cargando tu lista" className="mt-4 flex animate-pulse flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-14 rounded-lg bg-muted" />
          ))}
        </ul>
      ) : query.isError ? (
        <DataError
          className="mt-4"
          message={dataErrorMessage(query.error, "tu lista")}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : items.length === 0 ? (
        <EmptyWatchlist exploreSymbol={exploreSymbol} />
      ) : (
        <ul className="mt-3 flex flex-col">
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <m.li
                key={item.symbol}
                layout={!reduceMotion}
                initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: reduceMotion ? 0 : -12, transition: { duration: 0.15 } }}
                transition={{ duration: 0.25, ease: EASE }}
                className="flex items-center gap-1 border-b last:border-b-0"
              >
                <Link
                  href={`/stock/${encodeURIComponent(item.symbol)}`}
                  className="group flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-150 hover:bg-muted"
                >
                  <span className="w-14 shrink-0 font-mono text-sm font-semibold text-ocean-700">{item.symbol}</span>
                  <span className="min-w-0 flex-1">
                    {names[item.symbol] && (
                      <span className="block truncate text-sm">{names[item.symbol]}</span>
                    )}
                    <span className="block text-xs text-muted-foreground">
                      Guardado el {formatShortDate(item.createdAt)}
                    </span>
                  </span>
                  <ChevronRight
                    className="size-4 shrink-0 text-muted-foreground transition-colors duration-150 group-hover:text-primary"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </Link>
                <button
                  type="button"
                  onClick={() => remove.mutate(item.symbol)}
                  aria-label={`Quitar ${item.symbol} de tu lista`}
                  className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="size-4" strokeWidth={2} aria-hidden="true" />
                </button>
              </m.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}

function EmptyWatchlist({ exploreSymbol }: { exploreSymbol?: string }) {
  return (
    <div className="mt-4 flex flex-col items-center rounded-lg bg-muted px-4 py-6 text-center">
      <Image src="/itos_icons/search_itos.svg" alt="" width={40} height={40} className="size-10" />
      <p className="mt-3 text-sm font-medium">Aún no guardas activos.</p>
      <p className="mt-1 text-sm text-muted-foreground">Guarda los que quieras seguir desde la página de cada activo.</p>
      {exploreSymbol && (
        <Link
          href={`/stock/${encodeURIComponent(exploreSymbol)}`}
          className="mt-3 inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-primary transition-colors duration-150 hover:bg-ocean-50"
        >
          Explorar {exploreSymbol}
        </Link>
      )}
    </div>
  );
}
