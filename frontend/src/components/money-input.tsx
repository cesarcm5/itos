import { cn } from "cn";
import type { ComponentProps } from "react";

type MoneyInputProps = Omit<ComponentProps<"input">, "type" | "inputMode"> & {
  /** Shown after the amount, e.g. "MXN" or "USD". */
  currency: string;
  invalid?: boolean;
};

// Amount field with a `$` prefix and a currency suffix (same look as the onboarding fields).
export function MoneyInput({ currency, invalid, className, ...props }: MoneyInputProps) {
  return (
    <div
      className={cn(
        "flex h-12 items-center rounded-lg border border-input bg-background transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        invalid && "border-destructive ring-3 ring-destructive/20 focus-within:border-destructive focus-within:ring-destructive/20",
        className,
      )}
    >
      <span className="pl-3 text-muted-foreground" aria-hidden="true">
        $
      </span>
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0"
        className="h-full min-w-0 flex-1 bg-transparent px-2 text-lg tabular-nums outline-none placeholder:text-muted-foreground"
        aria-invalid={invalid ? true : undefined}
        {...props}
      />
      <span className="pr-3 text-sm text-muted-foreground" aria-hidden="true">
        {currency}
      </span>
    </div>
  );
}
