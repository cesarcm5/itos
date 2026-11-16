"use client";

import { cn } from "cn";
import { useId } from "react";

type SegmentedProps<T extends string | number> = {
  /** Accessible name of the group. */
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

// Native radios styled as a segmented control: arrow keys, Space and screen readers work as usual.
export function Segmented<T extends string | number>({ label, options, value, onChange, className }: SegmentedProps<T>) {
  const name = useId();
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex rounded-lg bg-muted p-1", className)}>
      {options.map((option) => (
        <label
          key={option.value}
          className="relative flex min-h-11 min-w-12 flex-1 cursor-pointer items-center justify-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground has-checked:bg-card has-checked:text-ocean-700 has-checked:shadow-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
        >
          <input
            type="radio"
            name={name}
            value={String(option.value)}
            checked={option.value === value}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
