"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, LayoutGroup, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import Image from "next/image";
import { useState } from "react";
import { cn } from "cn";
import { AlertRow } from "@/components/alerts/alert-row";
import { NEW_ALERT_INPUT_ID, NewAlertPanel } from "@/components/alerts/new-alert-panel";
import { AppHeader } from "@/components/app-header";
import { DataError, dataErrorMessage } from "@/components/data-error";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api-client";
import { ALERT_LIMIT, ALERTS_KEY, type Alert, type AlertList, type AlertStatus } from "@/lib/market";

const EASE = [0.22, 1, 0.36, 1] as const;

const GROUPS: readonly { status: AlertStatus; title: string; hint: string }[] = [
  { status: "active", title: "Activas", hint: "Revisamos el precio cada 15 minutos mientras abre el mercado." },
  { status: "triggered", title: "Ya te avisamos", hint: "Llegaron a tu precio. Reactívalas si quieres otro aviso." },
  { status: "cancelled", title: "Pausadas", hint: "No te escribimos mientras estén pausadas." },
];

type StatusChange = { alert: Alert; status: "active" | "cancelled" };

function statusErrorMessage(error: Error, { alert, status }: StatusChange): string {
  if (error instanceof ApiError && error.code === "ALERT_LIMIT") {
    return `Ya tienes ${ALERT_LIMIT} alertas activas. Pausa o borra una para activar ${alert.symbol}.`;
  }
  return status === "active"
    ? `No pudimos activar la alerta de ${alert.symbol}. Intenta de nuevo.`
    : `No pudimos pausar la alerta de ${alert.symbol}. Intenta de nuevo.`;
}

export function AlertsView() {
  const queryClient = useQueryClient();
  const reduceMotion = useReducedMotion();
  const [actionError, setActionError] = useState<string | null>(null);
  const query = useQuery({ queryKey: ALERTS_KEY, queryFn: () => api<AlertList>("/alerts") });

  // Both mutations are optimistic: the row changes right away and goes back if the request fails.
  const snapshot = async () => {
    await queryClient.cancelQueries({ queryKey: ALERTS_KEY });
    return queryClient.getQueryData<AlertList>(ALERTS_KEY);
  };
  const patchCache = (update: (items: Alert[]) => Alert[]) =>
    queryClient.setQueryData<AlertList>(ALERTS_KEY, (old) => (old ? { items: update(old.items) } : old));

  const setStatus = useMutation({
    mutationFn: ({ alert, status }: StatusChange) =>
      api<Alert>(`/alerts/${alert.id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onMutate: async ({ alert, status }) => {
      setActionError(null);
      const previous = await snapshot();
      patchCache((items) =>
        items.map((item) =>
          item.id === alert.id
            ? { ...item, status, ...(status === "active" && { triggeredPrice: null, triggeredAt: null }) }
            : item,
        ),
      );
      return { previous };
    },
    onError: (error, change, context) => {
      if (context?.previous) queryClient.setQueryData(ALERTS_KEY, context.previous);
      setActionError(statusErrorMessage(error, change));
    },
    onSuccess: (saved) => patchCache((items) => items.map((item) => (item.id === saved.id ? saved : item))),
  });

  const remove = useMutation({
    mutationFn: (alert: Alert) => api<void>(`/alerts/${alert.id}`, { method: "DELETE" }),
    onMutate: async (alert) => {
      setActionError(null);
      const previous = await snapshot();
      patchCache((items) => items.filter((item) => item.id !== alert.id));
      return { previous };
    },
    onError: (error, alert, context) => {
      // Already gone on the server: keep it out of the list.
      if (error instanceof ApiError && error.code === "NOT_FOUND") return;
      if (context?.previous) queryClient.setQueryData(ALERTS_KEY, context.previous);
      setActionError(`No pudimos borrar la alerta de ${alert.symbol}. Intenta de nuevo.`);
    },
  });

  const items = query.data?.items ?? [];
  const activeCount = items.filter((item) => item.status === "active").length;
  const atLimit = query.isSuccess && activeCount >= ALERT_LIMIT;

  return (
    <div className="flex flex-1 flex-col bg-muted/60">
      <AppHeader current="alerts" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-12 sm:px-6 sm:pt-10">
        <div>
          <h1 className="text-[2rem] leading-[1.15] font-bold sm:text-5xl">Tus alertas</h1>
          <p className="mt-2 max-w-prose text-muted-foreground">
            Te escribimos una sola vez cuando un precio llegue a tu objetivo.
          </p>
        </div>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
          <section aria-labelledby="alert-list-title" className="min-w-0 rounded-xl border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="alert-list-title" className="text-lg font-semibold">
                Tu lista de alertas
              </h2>
              {query.isSuccess && items.length > 0 && <LimitMeter active={activeCount} />}
            </div>

            <div aria-live="polite">
              {actionError && (
                <p role="alert" className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {actionError}
                </p>
              )}
            </div>

            {query.isPending ? (
              <AlertListSkeleton />
            ) : query.isError ? (
              <DataError
                className="mt-4"
                message={dataErrorMessage(query.error, "tus alertas")}
                onRetry={() => void query.refetch()}
                retrying={query.isFetching}
              />
            ) : items.length === 0 ? (
              <EmptyAlerts />
            ) : (
              <LayoutGroup>
                <AnimatePresence initial={false}>
                  {GROUPS.map((group) => {
                    const groupItems = items.filter((item) => item.status === group.status);
                    if (groupItems.length === 0) return null;
                    return (
                      <m.section
                        key={group.status}
                        layout={!reduceMotion}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0.15 } }}
                        transition={{ duration: 0.25, ease: EASE }}
                        aria-labelledby={`group-${group.status}`}
                        className="mt-5 first-of-type:mt-4"
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <h3 id={`group-${group.status}`} className="text-sm font-semibold">
                            {group.title}{" "}
                            <span className="font-normal text-muted-foreground tabular-nums">({groupItems.length})</span>
                          </h3>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{group.hint}</p>
                        <ul className="mt-1 divide-y">
                          <AnimatePresence initial={false}>
                            {groupItems.map((alert) => (
                              <m.li
                                key={alert.id}
                                layout={!reduceMotion}
                                initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: reduceMotion ? 0 : -12, transition: { duration: 0.15 } }}
                                transition={{ duration: 0.25, ease: EASE }}
                              >
                                <AlertRow
                                  alert={alert}
                                  canActivate={activeCount < ALERT_LIMIT}
                                  onSetStatus={(status) => setStatus.mutate({ alert, status })}
                                  onDelete={() => remove.mutate(alert)}
                                />
                              </m.li>
                            ))}
                          </AnimatePresence>
                        </ul>
                      </m.section>
                    );
                  })}
                </AnimatePresence>
              </LayoutGroup>
            )}
          </section>

          <div className="lg:sticky lg:top-6">
            <NewAlertPanel atLimit={atLimit} />
          </div>
        </div>
      </main>
    </div>
  );
}

function LimitMeter({ active }: { active: number }) {
  const full = active >= ALERT_LIMIT;
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1" aria-hidden="true">
        {Array.from({ length: ALERT_LIMIT }, (_, i) => (
          <span
            key={i}
            className={cn("h-2 w-4 rounded-full transition-colors duration-200", i < active ? "bg-primary" : "bg-muted")}
          />
        ))}
      </div>
      <span className={cn("text-sm tabular-nums", full ? "font-medium text-foreground" : "text-muted-foreground")}>
        {active} de {ALERT_LIMIT} activas
      </span>
    </div>
  );
}

function EmptyAlerts() {
  return (
    <div className="mt-4 flex flex-col items-center rounded-lg bg-muted px-4 py-8 text-center">
      <Image src="/itos_icons/alerts_itos.svg" alt="" width={48} height={48} className="size-12" />
      <p className="mt-3 text-sm font-medium">Aún no tienes alertas.</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        Crea una desde la página de cualquier activo, o aquí mismo.
      </p>
      <Button
        variant="secondary"
        onClick={() => {
          const input = document.getElementById(NEW_ALERT_INPUT_ID);
          const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          input?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
          input?.focus({ preventScroll: true });
        }}
        className="mt-4 h-11 bg-ocean-50 px-4 text-sm text-ocean-700 hover:bg-ocean-100"
      >
        Crear una alerta
      </Button>
    </div>
  );
}

function AlertListSkeleton() {
  return (
    <ul aria-busy="true" aria-label="Cargando tus alertas" className="mt-4 flex animate-pulse flex-col gap-2">
      {[0, 1, 2].map((i) => (
        <li key={i} className="h-16 rounded-lg bg-muted" />
      ))}
    </ul>
  );
}
