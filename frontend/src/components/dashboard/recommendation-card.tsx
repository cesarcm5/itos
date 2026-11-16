"use client";

import { ChevronDown, LineChart } from "lucide-react";
import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { cn } from "cn";
import { AnimatedNumber } from "@/components/animated-number";
import { StaleBadge } from "@/components/stale-badge";
import { buttonVariants } from "@/components/ui/button";
import { formatMxn, formatUsd } from "@/lib/format";
import { EMERGENCY_MONTHS, profileNumbers, riskLabel, type Recommendation } from "@/lib/recommendation";

const EASE = [0.22, 1, 0.36, 1] as const;

export function RecommendationCard({ rec, simulateSymbol }: { rec: Recommendation; simulateSymbol?: string }) {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const mathId = useId();
  const canInvest = rec.suggestedMonthly > 0;

  let sentence: ReactNode;
  if (rec.surplus <= 0) {
    sentence = "Tus gastos son iguales o mayores que tu ingreso. Antes de invertir, busca bajar gastos o subir ingresos.";
  } else if (!rec.hasEmergencyFund) {
    sentence = (
      <>
        Por ahora no te sugerimos invertir en bolsa. Tus{" "}
        <strong className="font-semibold text-foreground tabular-nums">{formatMxn(rec.surplus)}</strong> libres al mes
        van primero a tu fondo de emergencia.
      </>
    );
  } else {
    sentence = (
      <>
        Puedes invertir{" "}
        <strong className="font-semibold text-foreground tabular-nums">{formatMxn(rec.suggestedMonthly)} al mes</strong>{" "}
        sin tocar tu fondo de emergencia.
      </>
    );
  }

  return (
    <section aria-labelledby="rec-title" className="rounded-xl border bg-card p-5 sm:p-8">
      <h2 id="rec-title" className="font-sans text-sm font-medium tracking-normal text-muted-foreground">
        Tu inversión mensual sugerida
      </h2>

      <p className="mt-2 font-heading text-4xl leading-[1.1] font-semibold tracking-tight tabular-nums sm:text-5xl">
        <AnimatedNumber value={rec.suggestedMonthly} format={formatMxn} />
      </p>

      {canInvest && rec.suggestedMonthlyUsd !== null && rec.fx && (
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span className="tabular-nums">
            ≈ {formatUsd(rec.suggestedMonthlyUsd)} al mes · 1 USD = {formatMxn(rec.fx.rate)}
          </span>
          {rec.fx.stale && <StaleBadge asOf={rec.fx.asOf} label="Tipo de cambio" />}
        </p>
      )}

      <p className="mt-4 max-w-prose leading-relaxed text-muted-foreground">{sentence}</p>

      {rec.surplus > 0 && <SurplusBar rec={rec} reduceMotion={reduceMotion ?? false} />}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
        {simulateSymbol && (
          <Link
            href={`/simulator?symbol=${encodeURIComponent(simulateSymbol)}`}
            className={cn(
              buttonVariants(),
              "h-11 bg-violet-500 px-5 text-base text-white hover:bg-violet-600 active:bg-violet-700",
            )}
          >
            <LineChart data-icon="inline-start" strokeWidth={2} aria-hidden="true" />
            Simular con {simulateSymbol}
          </Link>
        )}
        <button
          type="button"
          aria-expanded={open}
          aria-controls={mathId}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-medium text-primary transition-colors duration-150 hover:bg-ocean-50 sm:justify-start"
        >
          Cómo lo calculamos
          <ChevronDown
            className={cn("size-4 transition-transform duration-200", open && "rotate-180")}
            strokeWidth={2}
            aria-hidden="true"
          />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <m.div
            id={mathId}
            key="math"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.25, ease: EASE }}
            className="overflow-hidden"
          >
            <MathSteps rec={rec} />
          </m.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function SurplusBar({ rec, reduceMotion }: { rec: Recommendation; reduceMotion: boolean }) {
  const invested = rec.suggestedMonthly / rec.surplus;
  const restLabel = rec.hasEmergencyFund ? "Libre para ahorro o gastos" : "Para tu fondo de emergencia";

  return (
    <div className="mt-6">
      <div
        className="flex h-3 overflow-hidden rounded-full bg-ocean-100"
        role="img"
        aria-label={`De tus ${formatMxn(rec.surplus)} libres al mes: ${formatMxn(rec.suggestedMonthly)} para invertir y ${formatMxn(rec.remainder)} ${restLabel.toLowerCase()}.`}
      >
        {invested > 0 && (
          <m.div
            className="h-full origin-left rounded-full bg-ocean-600"
            style={{ width: `${invested * 100}%` }}
            initial={{ scaleX: reduceMotion ? 1 : 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: reduceMotion ? 0 : 0.6, delay: reduceMotion ? 0 : 0.2, ease: EASE }}
          />
        )}
      </div>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        {invested > 0 && (
          <div className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full bg-ocean-600" aria-hidden="true" />
            <dt className="text-muted-foreground">Para invertir</dt>
            <dd className="ml-auto font-medium tabular-nums sm:ml-0">{formatMxn(rec.suggestedMonthly)}</dd>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="size-2.5 shrink-0 rounded-full bg-ocean-200" aria-hidden="true" />
          <dt className="text-muted-foreground">{restLabel}</dt>
          <dd className="ml-auto font-medium tabular-nums sm:ml-0">{formatMxn(rec.remainder)}</dd>
        </div>
      </dl>
    </div>
  );
}

function MathSteps({ rec }: { rec: Recommendation }) {
  const { income, expenses } = profileNumbers(rec);
  const risk = riskLabel(rec.investShare);

  const steps: { label: string; formula: string; result: string }[] = [
    {
      label: "Lo que te queda al mes",
      formula: `${formatMxn(income)} de ingreso − ${formatMxn(expenses)} de gastos`,
      result: formatMxn(rec.surplus),
    },
    {
      label: "Tu fondo de emergencia",
      formula: `${formatMxn(expenses)} de gastos × ${EMERGENCY_MONTHS} meses`,
      result: formatMxn(rec.emergencyTarget),
    },
    rec.hasEmergencyFund
      ? {
          label: "Inversión sugerida",
          formula: `${formatMxn(Math.max(rec.surplus, 0))} × ${Math.round(rec.investShare * 100)}%${risk ? ` (riesgo ${risk})` : ""}`,
          result: formatMxn(rec.suggestedMonthly),
        }
      : {
          label: "Inversión sugerida",
          formula: "Hasta completar tu fondo de emergencia",
          result: formatMxn(0),
        },
  ];

  return (
    <div className="mt-4 rounded-lg bg-muted p-4 sm:p-5">
      <ol className="flex flex-col gap-4">
        {steps.map((step, i) => (
          <li key={step.label} className="flex gap-3">
            <span
              aria-hidden="true"
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ocean-100 text-xs font-semibold text-ocean-700"
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium">{step.label}</p>
              <p className="mt-0.5 text-muted-foreground tabular-nums">
                {step.formula} = <strong className="font-semibold text-foreground">{step.result}</strong>
              </p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-4 border-t pt-3 text-xs leading-snug text-muted-foreground">
        Sugerimos invertir 30%, 50% o 70% de lo que te queda según tu riesgo (bajo, medio o alto). El resto queda libre para
        imprevistos o metas cercanas.
      </p>
    </div>
  );
}
