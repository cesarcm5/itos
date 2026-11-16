"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, type ReactNode } from "react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const EASE = "power3.out";

// Animates children marked with data-hero / data-step. Content is fully visible
// without JS and with prefers-reduced-motion; nothing loops or blocks interaction.
export function LandingMotion({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-hero]", {
          opacity: 0,
          y: 16,
          duration: 0.6,
          stagger: 0.08,
          ease: EASE,
        });

        gsap.from("[data-hero-visual]", {
          opacity: 0,
          y: 24,
          duration: 0.8,
          delay: 0.2,
          ease: EASE,
        });

        gsap.utils.toArray<HTMLElement>("[data-step]").forEach((step) => {
          gsap.from(step, {
            opacity: 0,
            y: 24,
            duration: 0.5,
            ease: EASE,
            scrollTrigger: { trigger: step, start: "top 85%", once: true },
          });
        });
      });

      return () => mm.revert();
    },
    { scope },
  );

  return <div ref={scope}>{children}</div>;
}
