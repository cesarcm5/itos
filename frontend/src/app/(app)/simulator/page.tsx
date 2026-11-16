import type { Metadata } from "next";
import { Suspense } from "react";
import { Simulator, SimulatorFallback } from "@/components/simulator/simulator";
import { normalizeSymbol } from "@/lib/market";

export const metadata: Metadata = { title: "Simulador · ITOS" };

export default function SimulatorPage(props: PageProps<"/simulator">) {
  // searchParams is request data: read it inside Suspense so the shell can prerender.
  return (
    <Suspense fallback={<SimulatorFallback />}>
      <SimulatorWithParams searchParams={props.searchParams} />
    </Suspense>
  );
}

async function SimulatorWithParams({ searchParams }: { searchParams: PageProps<"/simulator">["searchParams"] }) {
  const { symbol } = await searchParams;
  // `?symbol=` pre-fills the form (from a stock page or the dashboard).
  const initialSymbol = typeof symbol === "string" ? normalizeSymbol(symbol) : null;
  return <Simulator initialSymbol={initialSymbol} />;
}
