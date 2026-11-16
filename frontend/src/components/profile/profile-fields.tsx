import type { ReactNode } from "react";
import type { FieldError, UseFormRegisterReturn } from "react-hook-form";
import { formatMxn } from "@/lib/format";

// Fields shared by the onboarding wizard and the profile page.

export const HORIZONS = [
  { value: "short", title: "Menos de 3 años", description: "Una meta cercana, como un viaje o un enganche." },
  { value: "medium", title: "De 3 a 7 años", description: "Un auto, tus estudios o un proyecto." },
  { value: "long", title: "Más de 7 años", description: "Tu retiro o tu patrimonio." },
] as const;

export const RISKS = [
  { value: "low", title: "Bajo", description: "Prefiero crecer despacio y ver pocas bajas." },
  { value: "medium", title: "Medio", description: "Acepto algunas bajas si a la larga crece más." },
  { value: "high", title: "Alto", description: "Puedo ver caídas fuertes sin vender." },
] as const;

export function MoneyField({
  id,
  label,
  hint,
  registration,
  error,
  autoFocus,
}: {
  id: string;
  label: string;
  hint: string;
  registration: UseFormRegisterReturn;
  error?: FieldError;
  autoFocus?: boolean;
}) {
  const describedBy = error ? `${id}-error` : `${id}-hint`;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="flex h-12 items-center rounded-lg border border-input bg-background transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 has-aria-invalid:border-destructive has-aria-invalid:ring-3 has-aria-invalid:ring-destructive/20">
        <span className="pl-3 text-muted-foreground" aria-hidden="true">
          $
        </span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder="0"
          className="h-full min-w-0 flex-1 bg-transparent px-2 text-lg tabular-nums outline-none placeholder:text-muted-foreground"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...registration}
        />
        <span className="pr-3 text-sm text-muted-foreground" aria-hidden="true">
          MXN
        </span>
      </div>
      {error ? (
        <FieldErrorText id={`${id}-error`} error={error} />
      ) : (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

export function SurplusNote({ surplus }: { surplus: number | null }) {
  let content: ReactNode = null;
  if (surplus !== null && surplus > 0) {
    content = (
      <>
        Te quedan <strong className="font-semibold text-foreground tabular-nums">{formatMxn(surplus)}</strong> al mes.
      </>
    );
  } else if (surplus !== null) {
    content = "Por ahora no te queda dinero libre al mes. Te ayudaremos a enfocarte en ahorrar primero.";
  }

  // Reserved height so the layout doesn't jump while typing.
  return (
    <p aria-live="polite" className="mt-2 min-h-12 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground empty:invisible">
      {content}
    </p>
  );
}

export function FieldErrorText({ id, error }: { id: string; error?: FieldError }) {
  if (!error?.message) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {error.message}
    </p>
  );
}
