"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

type AnimatedNumberProps = {
  value: number;
  /** Must be stable (module-level), or the count-up restarts on every render. */
  format: (value: number) => string;
  className?: string;
};

// Key-figure count-up (800 ms ease-out). Screen readers get the final value only;
// with reduced motion the final value shows right away.
export function AnimatedNumber({ value, format, className }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduceMotion || value === 0) {
      el.textContent = format(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate: (v) => {
        el.textContent = format(v);
      },
    });
    return () => controls.stop();
  }, [value, format, reduceMotion]);

  return (
    <span className={className}>
      <span ref={ref} aria-hidden="true">
        {format(reduceMotion ? value : 0)}
      </span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
