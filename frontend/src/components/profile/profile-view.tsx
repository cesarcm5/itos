"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Lightbulb, Loader2 } from "lucide-react";
import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { AppHeader } from "@/components/app-header";
import { DataError, dataErrorMessage } from "@/components/data-error";
import { OptionCard } from "@/components/onboarding/option-card";
import { FieldErrorText, HORIZONS, MoneyField, RISKS, SurplusNote } from "@/components/profile/profile-fields";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api-client";
import { formatMxn } from "@/lib/format";
import {
  parseMoney,
  profileFormSchema,
  profileToForm,
  type Profile,
  type ProfileFormInput,
  type ProfileFormOutput,
} from "@/lib/schemas/profile";

const PROFILE_KEY = ["profile"] as const;
const EASE = [0.22, 1, 0.36, 1] as const;

type Me = { user: { id: string; email: string } };

function saveErrorMessage(error: Error): string {
  if (error instanceof ApiError && error.code === "VALIDATION_ERROR") return "Revisa tus respuestas e intenta de nuevo.";
  return "No pudimos guardar tus cambios. Intenta de nuevo.";
}

export function ProfileView() {
  const router = useRouter();
  const profile = useQuery({
    queryKey: PROFILE_KEY,
    queryFn: () => api<Profile>("/profile"),
    retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
  });
  // Shares the onboarding's cache entry. Only used to show the email, so a failure just hides it.
  const me = useQuery({ queryKey: ["me"], queryFn: () => api<Me>("/auth/me"), retry: false, staleTime: Infinity });

  // No profile yet → onboarding asks the same questions step by step.
  const missingProfile = profile.error instanceof ApiError && profile.error.code === "NOT_FOUND";
  useEffect(() => {
    if (missingProfile) router.replace("/onboarding");
  }, [missingProfile, router]);

  return (
    <div className="flex flex-1 flex-col bg-muted/60">
      <AppHeader current="profile" />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-8 sm:px-6 sm:pt-10">
        <h1 className="text-[2rem] leading-[1.15] font-bold sm:text-5xl">Tu perfil</h1>
        <p className="mt-2 text-muted-foreground">
          Si cambia tu situación, actualízala aquí y recalculamos tu plan.
        </p>
        {me.data?.user.email && (
          <p className="mt-3 text-sm text-muted-foreground">
            Cuenta: <span className="font-medium text-foreground">{me.data.user.email}</span>
          </p>
        )}

        {profile.isPending || missingProfile ? (
          <ProfileSkeleton />
        ) : profile.isError ? (
          <DataError
            className="mt-8 mb-12 bg-card"
            message={dataErrorMessage(profile.error, "tu perfil")}
            onRetry={() => void profile.refetch()}
            retrying={profile.isFetching}
          />
        ) : (
          <ProfileForm profile={profile.data} />
        )}
      </main>
    </div>
  );
}

function ProfileForm({ profile }: { profile: Profile }) {
  const queryClient = useQueryClient();
  const reduceMotion = useReducedMotion();
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormInput, unknown, ProfileFormOutput>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: profileToForm(profile),
    mode: "all",
  });

  const save = useMutation({
    mutationFn: (values: Profile) => api<Profile>("/profile", { method: "PUT", body: JSON.stringify(values) }),
    onSuccess: (saved) => {
      queryClient.setQueryData(PROFILE_KEY, saved);
      // The plan is computed from the profile.
      void queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      reset(profileToForm(saved));
    },
  });

  const [income, expenses, hasEmergencyFund] = useWatch({
    control,
    name: ["monthlyIncomeMxn", "monthlyExpensesMxn", "hasEmergencyFund"],
  });
  const incomeValue = parseMoney(income ?? "");
  const expensesValue = parseMoney(expenses ?? "");
  const surplus = incomeValue !== null && expensesValue !== null ? incomeValue - expensesValue : null;

  // A new edit hides the last "saved" message.
  const showSaved = save.isSuccess && !isDirty;

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => save.mutate(values))}
      className="mt-8 flex flex-col gap-6"
    >
      <Section id="money" title="Tu dinero al mes" description="Cantidades aproximadas en pesos.">
        <MoneyField
          id="income"
          label="Ingreso mensual neto"
          hint="Lo que te llega después de impuestos."
          registration={register("monthlyIncomeMxn")}
          error={errors.monthlyIncomeMxn}
        />
        <MoneyField
          id="expenses"
          label="Gastos mensuales"
          hint="Renta, comida, transporte, servicios y deudas."
          registration={register("monthlyExpensesMxn")}
          error={errors.monthlyExpensesMxn}
        />
        <SurplusNote surplus={surplus} />
      </Section>

      <Section
        id="fund"
        title="Fondo de emergencia"
        description="¿Tienes ahorros para 6 meses de gastos, fuera de la bolsa?"
      >
        <div role="radiogroup" aria-labelledby="fund-title" className="grid gap-3 sm:grid-cols-2">
          <OptionCard value="yes" title="Sí, ya lo tengo" registration={register("hasEmergencyFund")} />
          <OptionCard value="no" title="Todavía no" registration={register("hasEmergencyFund")} />
        </div>
        <FieldErrorText id="fund-error" error={errors.hasEmergencyFund} />
        <AnimatePresence initial={false}>
          {hasEmergencyFund === "no" && (
            <m.p
              initial={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex gap-3 rounded-xl bg-ocean-50 p-4 text-sm leading-relaxed text-ocean-800"
            >
              <Lightbulb className="mt-0.5 size-5 shrink-0 text-ocean-600" strokeWidth={2} aria-hidden="true" />
              <span>
                Tu plan se enfoca primero en juntar{" "}
                <strong className="tabular-nums">
                  {expensesValue !== null ? formatMxn(expensesValue * 6) : "6 meses de gastos"}
                </strong>{" "}
                en renta fija, como CETES.
              </span>
            </m.p>
          )}
        </AnimatePresence>
      </Section>

      <Section id="horizon" title="¿Cuándo vas a necesitar este dinero?" description="Tu plazo define qué activos te sugerimos.">
        <div role="radiogroup" aria-labelledby="horizon-title" className="flex flex-col gap-3">
          {HORIZONS.map((option) => (
            <OptionCard key={option.value} {...option} registration={register("horizon")} />
          ))}
        </div>
        <FieldErrorText id="horizon-error" error={errors.horizon} />
      </Section>

      <Section id="risk" title="¿Cuánto riesgo aceptas?" description="Define qué parte de lo que te sobra te sugerimos invertir.">
        <div role="radiogroup" aria-labelledby="risk-title" className="flex flex-col gap-3">
          {RISKS.map((option) => (
            <OptionCard key={option.value} {...option} registration={register("risk")} />
          ))}
        </div>
        <FieldErrorText id="risk-error" error={errors.risk} />
      </Section>

      {/* Sticky so the save button is always one tap away on a long form. */}
      <div className="sticky bottom-0 -mx-4 mt-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div aria-live="polite" className="empty:hidden">
          {save.isError && (
            <p role="alert" className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {saveErrorMessage(save.error)}
            </p>
          )}
          {showSaved && (
            <m.p
              initial={{ opacity: 0, y: reduceMotion ? 0 : 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-gain/10 px-3 py-2 text-sm text-gain"
            >
              <CheckCircle2 className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
              <span>Guardamos tus cambios. Tu plan ya está actualizado.</span>
              <Link
                href="/dashboard"
                className="inline-flex min-h-11 items-center gap-1 font-medium underline-offset-4 hover:underline sm:ml-auto sm:min-h-0"
              >
                Ver tu plan
                <ArrowRight className="size-4" strokeWidth={2} aria-hidden="true" />
              </Link>
            </m.p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <p className="mr-auto text-sm text-muted-foreground">
            {isDirty ? "Cambios sin guardar" : "Sin cambios"}
          </p>
          {isDirty && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                save.reset();
                reset();
              }}
              disabled={save.isPending}
              className="h-11 px-3 text-sm"
            >
              Descartar
            </Button>
          )}
          <Button type="submit" disabled={!isDirty || save.isPending} className="h-11 min-w-40 px-5 text-base hover:bg-ocean-700">
            {save.isPending ? (
              <>
                <Loader2 className="size-5 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />
                Guardando…
              </>
            ) : (
              "Guardar cambios"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const titleId = `${id}-title`;
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3 rounded-xl border bg-card p-5 sm:p-6">
      <div className="mb-1">
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function ProfileSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando tu perfil" className="mt-8 mb-12 flex animate-pulse flex-col gap-6">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border bg-card p-5 sm:p-6">
          <div className="h-5 w-48 rounded bg-muted" />
          <div className="mt-2 h-4 w-64 max-w-full rounded bg-muted" />
          <div className="mt-5 h-12 rounded-lg bg-muted" />
          <div className="mt-3 h-12 rounded-lg bg-muted" />
        </div>
      ))}
    </div>
  );
}
