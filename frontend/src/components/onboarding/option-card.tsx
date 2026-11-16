import { Check } from "lucide-react";
import type { UseFormRegisterReturn } from "react-hook-form";

type OptionCardProps = {
  value: string;
  title: string;
  description?: string;
  registration: UseFormRegisterReturn;
  describedBy?: string;
};

// A native radio styled as a card: arrow keys, Space and screen readers work as usual.
export function OptionCard({ value, title, description, registration, describedBy }: OptionCardProps) {
  return (
    <label className="group flex min-h-14 cursor-pointer items-center gap-4 rounded-xl border bg-card px-4 py-3.5 transition-colors duration-150 hover:bg-muted has-checked:border-primary has-checked:bg-ocean-50 has-focus-visible:ring-3 has-focus-visible:ring-ring/50">
      <input type="radio" value={value} className="sr-only" aria-describedby={describedBy} {...registration} />
      <span className="flex-1">
        <span className="block font-medium">{title}</span>
        {description && <span className="mt-0.5 block text-sm text-muted-foreground">{description}</span>}
      </span>
      <span
        aria-hidden="true"
        className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-border text-white transition-colors duration-150 group-has-checked:border-primary group-has-checked:bg-primary"
      >
        <Check className="size-3.5 opacity-0 group-has-checked:opacity-100" strokeWidth={3} />
      </span>
    </label>
  );
}
