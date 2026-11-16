"use client";

import { Popover } from "@base-ui/react/popover";
import type { ReactNode } from "react";

type TermHintProps = {
  /** The term as it appears in the text, e.g. "ETF". */
  term: string;
  children: ReactNode;
};

// Plain-language explanation for a financial term. Opens on hover (desktop) and tap (mobile).
export function TermHint({ term, children }: TermHintProps) {
  return (
    <Popover.Root>
      <Popover.Trigger
        openOnHover
        delay={150}
        className="cursor-help rounded-sm underline decoration-violet-300 decoration-dotted decoration-2 underline-offset-4 transition-colors duration-150 outline-none hover:decoration-violet-500 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {term}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} className="z-50">
          <Popover.Popup className="max-w-72 origin-(--transform-origin) rounded-lg bg-ocean-900 px-3.5 py-3 text-sm leading-relaxed text-white shadow-sm transition-[opacity,scale] duration-150 ease-out outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none">
            <Popover.Title className="font-semibold">{term}</Popover.Title>
            <Popover.Description className="mt-1 text-ocean-100">{children}</Popover.Description>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
