"use client";

import { useQuery } from "@tanstack/react-query";
import { useReducedMotion, type Variants } from "motion/react";
import * as m from "motion/react-m";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { AppHeader } from "@/components/app-header";
import { AssetSuggestionList } from "@/components/dashboard/asset-suggestion-list";
import { EmergencyFundBanner, FixedIncomeTip } from "@/components/dashboard/emergency-fund-banner";
import { RecommendationCard } from "@/components/dashboard/recommendation-card";
import { WatchlistPanel } from "@/components/dashboard/watchlist-panel";
import { DataError, dataErrorMessage } from "@/components/data-error";
import { Disclaimer } from "@/components/disclaimer";
import { api, ApiError } from "@/lib/api-client";
import type { Recommendation } from "@/lib/recommendation";

const EASE = [0.22, 1, 0.36, 1] as const;

function isMissingProfile(error: Error | null): boolean {
  return error instanceof ApiError && error.code === "NOT_FOUND";
}

export function Dashboard() {
  const router = useRouter();
  const rec = useQuery({
    queryKey: ["recommendations"],
    queryFn: () => api<Recommendation>("/recommendations"),
    // A 4xx won't fix itself; only retry network and server errors.
    retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
  });

  // No profile yet → finish onboarding first.
  const missingProfile = isMissingProfile(rec.error);
  useEffect(() => {
    if (missingProfile) router.replace("/onboarding");
  }, [missingProfile, router]);

  return (
    <div className="flex flex-1 flex-col bg-muted/60">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-12 sm:px-6 sm:pt-10">
        {rec.isPending || missingProfile ? (
          <DashboardSkeleton />
        ) : rec.isError ? (
          <>
            <PageTitle />
            <DataError
              className="mt-8 bg-card"
              message={dataErrorMessage(rec.error, "tu plan")}
              onRetry={() => void rec.refetch()}
              retrying={rec.isFetching}
            />
          </>
        ) : (
          <DashboardContent rec={rec.data} />
        )}
      </main>
    </div>
  );
}

function PageTitle() {
  return (
    <div>
      <h1 className="text-[2rem] leading-[1.15] font-bold sm:text-5xl">Tu plan de este mes</h1>
      <p className="mt-2 text-muted-foreground">Con base en lo que nos contaste en tu perfil.</p>
    </div>
  );
}

function DashboardContent({ rec }: { rec: Recommendation }) {
  const reduceMotion = useReducedMotion();
  const firstSymbol = rec.where.assets[0]?.symbol;
  const names = useMemo(
    () => Object.fromEntries(rec.where.assets.map((asset) => [asset.symbol, asset.name])),
    [rec.where.assets],
  );

  // Staggered entrance: 250 ms per card, 40 ms apart, under 400 ms in total.
  const container: Variants = { hidden: {}, show: { transition: { staggerChildren: reduceMotion ? 0 : 0.04 } } };
  const item: Variants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE } },
  };

  return (
    <m.div variants={container} initial="hidden" animate="show">
      <m.div variants={item}>
        <PageTitle />
      </m.div>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
        <div className="flex min-w-0 flex-col gap-6">
          {!rec.hasEmergencyFund && (
            <m.div variants={item}>
              <EmergencyFundBanner rec={rec} />
            </m.div>
          )}
          <m.div variants={item}>
            <RecommendationCard rec={rec} simulateSymbol={firstSymbol} />
          </m.div>
          <m.div variants={item} className="mt-2">
            <AssetSuggestionList where={rec.where} />
          </m.div>
        </div>

        <div className="flex flex-col gap-6 lg:sticky lg:top-6">
          <m.div variants={item}>
            <WatchlistPanel names={names} exploreSymbol={firstSymbol} />
          </m.div>
          {rec.hasEmergencyFund && (
            <m.div variants={item}>
              <FixedIncomeTip />
            </m.div>
          )}
        </div>
      </div>

      <m.div variants={item} className="mt-10 border-t pt-6">
        <Disclaimer>Sugerencias educativas basadas en reglas simples, no recomendaciones personalizadas.</Disclaimer>
      </m.div>
    </m.div>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando tu plan" className="animate-pulse">
      <div className="h-9 w-64 rounded-lg bg-border/70 sm:h-12 sm:w-96" />
      <div className="mt-3 h-4 w-72 max-w-full rounded bg-border/70" />
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border bg-card p-5 sm:p-8">
            <div className="h-4 w-48 rounded bg-muted" />
            <div className="mt-3 h-10 w-64 max-w-full rounded-lg bg-muted sm:h-12" />
            <div className="mt-5 h-4 w-full max-w-md rounded bg-muted" />
            <div className="mt-6 h-3 rounded-full bg-muted" />
            <div className="mt-6 h-11 w-44 rounded-lg bg-muted" />
          </div>
          <div className="mt-2">
            <div className="h-7 w-48 rounded-lg bg-border/70" />
            <div className="mt-3 h-4 w-full max-w-lg rounded bg-border/70" />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[0, 1].map((i) => (
                <div key={i} className="h-48 rounded-xl border bg-card" />
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="h-6 w-24 rounded bg-muted" />
          <div className="mt-4 flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 rounded-lg bg-muted" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
