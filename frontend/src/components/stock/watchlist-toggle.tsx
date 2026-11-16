"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { cn } from "cn";
import { WATCHLIST_KEY } from "@/components/dashboard/watchlist-panel";
import { api } from "@/lib/api-client";
import type { Watchlist } from "@/lib/recommendation";

// Save / unsave a symbol. Optimistic: flips right away and rolls back if the request fails.
export function WatchlistToggle({ symbol }: { symbol: string }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: WATCHLIST_KEY, queryFn: () => api<Watchlist>("/watchlist") });
  const saved = query.data?.items.some((item) => item.symbol === symbol) ?? false;

  const toggle = useMutation({
    mutationFn: (save: boolean) =>
      save
        ? api<Watchlist>("/watchlist", { method: "POST", body: JSON.stringify({ symbol }) })
        : api<Watchlist>(`/watchlist/${encodeURIComponent(symbol)}`, { method: "DELETE" }),
    onMutate: async (save) => {
      await queryClient.cancelQueries({ queryKey: WATCHLIST_KEY });
      const previous = queryClient.getQueryData<Watchlist>(WATCHLIST_KEY);
      queryClient.setQueryData<Watchlist>(WATCHLIST_KEY, (old) => {
        const items = (old?.items ?? []).filter((item) => item.symbol !== symbol);
        return { items: save ? [...items, { symbol, createdAt: new Date().toISOString() }] : items };
      });
      return { previous };
    },
    onError: (_error, _save, context) => {
      queryClient.setQueryData(WATCHLIST_KEY, context?.previous);
    },
    onSuccess: (data) => queryClient.setQueryData(WATCHLIST_KEY, data),
  });

  const Icon = saved ? BookmarkCheck : Bookmark;

  return (
    <div>
      <button
        type="button"
        aria-pressed={saved}
        disabled={query.isPending}
        onClick={() => toggle.mutate(!saved)}
        className={cn(
          "inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:cursor-default disabled:opacity-50",
          saved
            ? "border-ocean-200 bg-ocean-50 text-ocean-700 hover:bg-ocean-100"
            : "bg-card text-foreground hover:bg-muted",
        )}
      >
        <Icon className="size-4" strokeWidth={2} aria-hidden="true" />
        {saved ? "En tu lista" : "Guardar en tu lista"}
      </button>
      <p role="status" className="mt-2 text-center text-xs text-muted-foreground empty:hidden">
        {toggle.isError
          ? `No pudimos ${toggle.variables ? "guardar" : "quitar"} ${symbol}. Intenta de nuevo.`
          : toggle.isSuccess
            ? saved
              ? "Guardado. Lo verás en tu plan."
              : "Lo quitamos de tu lista."
            : ""}
      </p>
    </div>
  );
}
