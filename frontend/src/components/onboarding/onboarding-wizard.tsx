"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, History, Lightbulb, Loader2 } from "lucide-react";
import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Logo } from "@/components/logo";
import { OptionCard } from "@/components/onboarding/option-card";
import { FieldErrorText, HORIZONS, MoneyField, RISKS, SurplusNote } from "@/components/profile/profile-fields";
import { Button } from "@/components/ui/button";
import { api, ApiError, logout } from "@/lib/api-client";
import { formatMxn } from "@/lib/format";
import { clearDraft, loadDraft, saveDraft, type OnboardingDraft } from "@/lib/onboarding-draft";
import {
  parseMoney,
  profileFormSchema,
  type Profile,
  type ProfileFormInput,
  type ProfileFormOutput,
} from "@/lib/schemas/profile";

const STEPS = [
  {
    fields: ["monthlyIncomeMxn", "monthlyExpensesMxn"],
    title: "¿Cuánto entra y cuánto sale al mes?",
    description: "Usa cantidades aproximadas en pesos. Puedes cambiarlas después.",
  },
  {
    fields: ["hasEmergencyFund"],
    title: "¿Tienes ahorros para 6 meses de gastos?",
    description: "Es tu fondo de emergencia: dinero para imprevistos que no se invierte en bolsa.",
  },
  {
    fields: ["horizon"],
    title: "¿Cuándo vas a necesitar este dinero?",
    description: "Entre más tiempo lo dejes invertido, más bajas puede aguantar.",
  },
  {
    fields: ["risk"],
    title: "¿Cuánto riesgo aceptas?",
    description: "Toda inversión sube y baja. Elige la opción con la que dormirías en paz.",
  },
] as const satisfies ReadonlyArray<{ fields: ReadonlyArray<keyof ProfileFormInput>; title: string; description: string }>;

const EASE = [0.22, 1, 0.36, 1] as const;

function saveErrorMessage(error: Error): string {
  if (error instanceof ApiError && error.code === "VALIDATION_ERROR") return "Revisa tus respuestas e intenta de nuevo.";
  return "No pudimos guardar tu perfil. Intenta de nuevo.";
}

/** First step whose answers are missing or invalid, capped at the step the user had reached. */
function resumeStep(draft: OnboardingDraft): number {
  const target = Math.min(draft.step, STEPS.length - 1);
  for (let i = 0; i < target; i++) {
    const complete = STEPS[i].fields.every(
      (field) => profileFormSchema.shape[field].safeParse(draft.values[field]).success,
    );
    if (!complete) return i;
  }
  return target;
}

type Me = { user: { id: string } };

export function OnboardingWizard() {
  // Only used to key the saved draft, so a failure just means no resume (not an error state).
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<Me>("/auth/me"),
    retry: false,
    staleTime: Infinity,
  });

  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo className="h-6" />
        <button
          type="button"
          onClick={() => void logout()}
          className="inline-flex min-h-11 cursor-pointer items-center rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
        >
          Salir
        </button>
      </header>

      {me.isPending ? <WizardSkeleton /> : <WizardForm userId={me.data?.user.id ?? null} />}
    </div>
  );
}

function WizardSkeleton() {
  return (
    <main aria-busy="true" aria-label="Cargando tu avance" className="mx-auto w-full max-w-xl flex-1 px-4 sm:px-6">
      <div className="mt-4 animate-pulse sm:mt-10">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="mt-3 h-1.5 rounded-full bg-muted" />
        <div className="mt-10 h-8 w-4/5 rounded bg-muted" />
        <div className="mt-3 h-4 w-3/5 rounded bg-muted" />
        <div className="mt-8 h-12 rounded-lg bg-muted" />
        <div className="mt-6 h-12 rounded-lg bg-muted" />
      </div>
    </main>
  );
}

function WizardForm({ userId }: { userId: string | null }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  // Read once on mount; the component only renders on the client after /auth/me resolves.
  const [draft] = useState(() => (userId ? loadDraft(userId) : null));
  const [initialStep] = useState(() => (draft ? resumeStep(draft) : 0));
  const [step, setStep] = useState(initialStep);
  const [resumed, setResumed] = useState(initialStep > 0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const isFirstRender = useRef(true);

  const {
    register,
    handleSubmit,
    trigger,
    control,
    formState: { errors },
  } = useForm<ProfileFormInput, unknown, ProfileFormOutput>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { monthlyIncomeMxn: "", monthlyExpensesMxn: "", ...draft?.values },
    // Blur + change: errors appear when leaving a field and clear as soon as it's fixed,
    // even after a failed "Continuar" (trigger() doesn't count as a submit).
    mode: "all",
  });

  const save = useMutation({
    mutationFn: (profile: Profile) => api<Profile>("/profile", { method: "PUT", body: JSON.stringify(profile) }),
    onSuccess: () => {
      if (userId) clearDraft(userId);
      router.replace("/dashboard");
    },
  });

  // Save every answer and step change, so logging out and back in resumes here.
  const values = useWatch({ control });
  useEffect(() => {
    if (!userId || save.isSuccess) return;
    saveDraft(userId, { step, values });
  }, [userId, step, values, save.isSuccess]);

  // Move focus to the new question so keyboard and screen-reader users land on it.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  const [income, expenses, hasEmergencyFund] = useWatch({
    control,
    name: ["monthlyIncomeMxn", "monthlyExpensesMxn", "hasEmergencyFund"],
  });
  const incomeValue = parseMoney(income ?? "");
  const expensesValue = parseMoney(expenses ?? "");
  const surplus = incomeValue !== null && expensesValue !== null ? incomeValue - expensesValue : null;

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];
  const busy = save.isPending || save.isSuccess;

  const goBack = () => {
    setResumed(false);
    setDirection(-1);
    setStep((s) => Math.max(0, s - 1));
  };

  const onSubmit = handleSubmit((profile) => save.mutate(profile));

  const onContinue = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLast) return onSubmit(event);
    const valid = await trigger(current.fields);
    if (!valid) return;
    setResumed(false);
    setDirection(1);
    setStep((s) => s + 1);
  };

  const offset = reduceMotion ? 0 : 24;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pb-10 sm:px-6">
      {/* Progress */}
      <div className="mt-4 sm:mt-10">
        <p className="text-sm font-medium text-muted-foreground tabular-nums">
          Paso {step + 1} de {STEPS.length}
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <m.div
            className="h-full origin-left rounded-full bg-violet-500"
            initial={false}
            animate={{ scaleX: (step + 1) / STEPS.length }}
            transition={{ duration: reduceMotion ? 0 : 0.4, ease: EASE }}
          />
        </div>
        {resumed && (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <History className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            Guardamos tu avance. Sigue donde te quedaste.
          </p>
        )}
      </div>

      <form onSubmit={onContinue} noValidate className="mt-10 flex flex-1 flex-col">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <m.fieldset
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: direction * offset }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -offset }}
            transition={{ duration: 0.25, ease: EASE }}
            aria-labelledby="step-title"
            aria-describedby="step-description"
            className="flex flex-col"
          >
            <h1
              id="step-title"
              ref={headingRef}
              tabIndex={-1}
              className="text-2xl leading-tight font-semibold text-balance outline-none sm:text-[2rem]"
            >
              {current.title}
            </h1>
            <p id="step-description" className="mt-2 text-muted-foreground">
              {current.description}
            </p>

            <div className="mt-8 flex flex-col gap-3">
              {step === 0 && (
                <>
                  <MoneyField
                    id="income"
                    label="Ingreso mensual neto"
                    hint="Lo que te llega después de impuestos."
                    registration={register("monthlyIncomeMxn")}
                    error={errors.monthlyIncomeMxn}
                    autoFocus
                  />
                  <MoneyField
                    id="expenses"
                    label="Gastos mensuales"
                    hint="Renta, comida, transporte, servicios y deudas."
                    registration={register("monthlyExpensesMxn")}
                    error={errors.monthlyExpensesMxn}
                  />
                  <SurplusNote surplus={surplus} />
                </>
              )}

              {step === 1 && (
                <>
                  <div role="radiogroup" aria-labelledby="step-title" className="flex flex-col gap-3">
                    <OptionCard
                      value="yes"
                      title="Sí, ya lo tengo"
                      registration={register("hasEmergencyFund")}
                      describedBy={errors.hasEmergencyFund ? "fund-error" : undefined}
                    />
                    <OptionCard
                      value="no"
                      title="Todavía no"
                      description="No pasa nada, puedes continuar."
                      registration={register("hasEmergencyFund")}
                      describedBy={errors.hasEmergencyFund ? "fund-error" : undefined}
                    />
                  </div>
                  <FieldErrorText id="fund-error" error={errors.hasEmergencyFund} />
                  <AnimatePresence initial={false}>
                    {hasEmergencyFund === "no" && (
                      <m.div
                        initial={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        role="note"
                        aria-label="Consejo"
                        className="mt-2 flex gap-3 rounded-xl bg-ocean-50 p-4 text-sm leading-relaxed text-ocean-800"
                      >
                        <Lightbulb className="mt-0.5 size-5 shrink-0 text-ocean-600" strokeWidth={2} aria-hidden="true" />
                        <div>
                          <p className="font-semibold text-ocean-700">Consejo, no requisito</p>
                          <p className="mt-1">
                            Te recomendamos juntar{" "}
                            <strong className="tabular-nums">
                              {expensesValue !== null ? formatMxn(expensesValue * 6) : "6 meses de gastos"}
                            </strong>{" "}
                            (6 meses de gastos) en renta fija, como CETES o una cuenta de ahorro con buen
                            rendimiento, para cubrir imprevistos.
                          </p>
                          <p className="mt-2">Puedes continuar ahora y usar ITOS con normalidad.</p>
                        </div>
                      </m.div>
                    )}
                  </AnimatePresence>
                </>
              )}

              {step === 2 && (
                <>
                  <div role="radiogroup" aria-labelledby="step-title" className="flex flex-col gap-3">
                    {HORIZONS.map((option) => (
                      <OptionCard
                        key={option.value}
                        {...option}
                        registration={register("horizon")}
                        describedBy={errors.horizon ? "horizon-error" : undefined}
                      />
                    ))}
                  </div>
                  <FieldErrorText id="horizon-error" error={errors.horizon} />
                </>
              )}

              {step === 3 && (
                <>
                  <div role="radiogroup" aria-labelledby="step-title" className="flex flex-col gap-3">
                    {RISKS.map((option) => (
                      <OptionCard
                        key={option.value}
                        {...option}
                        registration={register("risk")}
                        describedBy={errors.risk ? "risk-error" : undefined}
                      />
                    ))}
                  </div>
                  <FieldErrorText id="risk-error" error={errors.risk} />
                </>
              )}
            </div>
          </m.fieldset>
        </AnimatePresence>

        {save.isError && (
          <p role="alert" className="mt-6 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            {saveErrorMessage(save.error)}
          </p>
        )}

        {/* Actions stay at the bottom so the buttons don't jump between steps. */}
        <div className="mt-auto flex items-center gap-3 pt-10">
          {step > 0 && (
            <Button
              type="button"
              variant="ghost"
              onClick={goBack}
              disabled={busy}
              className="h-11 px-4 text-base"
            >
              <ArrowLeft data-icon="inline-start" strokeWidth={2} />
              Atrás
            </Button>
          )}
          <Button type="submit" disabled={busy} className="ml-auto h-11 min-w-36 px-5 text-base hover:bg-ocean-700">
            {busy ? (
              <>
                <Loader2 className="size-5 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />
                Guardando…
              </>
            ) : isLast ? (
              "Ver mi plan"
            ) : (
              <>
                Continuar
                <ArrowRight data-icon="inline-end" strokeWidth={2} />
              </>
            )}
          </Button>
        </div>
      </form>
    </main>
  );
}
