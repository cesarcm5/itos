import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StockFallback, StockView } from "@/components/stock/stock-view";
import { normalizeSymbol } from "@/lib/market";

function parseSymbol(raw: string): string | null {
  try {
    return normalizeSymbol(decodeURIComponent(raw));
  } catch {
    return null; // malformed escape such as "%E0"
  }
}

export async function generateMetadata(props: PageProps<"/stock/[symbol]">): Promise<Metadata> {
  const { symbol } = await props.params;
  return { title: `${parseSymbol(symbol) ?? "Activo"} · ITOS` };
}

export default function StockPage(props: PageProps<"/stock/[symbol]">) {
  // params is request data: read it inside Suspense so the shell can prerender.
  return (
    <Suspense fallback={<StockFallback />}>
      <StockWithParams params={props.params} />
    </Suspense>
  );
}

async function StockWithParams({ params }: { params: PageProps<"/stock/[symbol]">["params"] }) {
  const { symbol: raw } = await params;
  // Same rule as the API; anything else can't be a ticker, so don't spend a request on it.
  const symbol = parseSymbol(raw);
  if (!symbol) notFound();
  return <StockView symbol={symbol} />;
}
