import { ArrowUpRight, Lightbulb } from "lucide-react";
import Link from "next/link";
import { TermHint } from "@/components/term-hint";
import { focusCopy, noteCopy, whyCopy, type AssetSuggestion } from "@/lib/recommendation";

export function AssetSuggestionList({ where }: { where: AssetSuggestion }) {
  const focus = focusCopy(where.focus);

  return (
    <section aria-labelledby="where-title">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 id="where-title" className="text-xl font-semibold sm:text-2xl">
          Dónde invertir
        </h2>
        <span className="rounded-full bg-ocean-50 px-2.5 py-1 text-xs font-semibold text-ocean-700">{focus.label}</span>
      </div>
      <p className="mt-2 max-w-prose leading-relaxed text-muted-foreground">
        {focus.description ? `${focus.description} ` : null}
        Estos son ejemplos de{" "}
        <TermHint term="ETF">
          Un fondo que reúne muchas acciones o bonos y se compra como si fuera una sola acción. Con una compra ya estás
          diversificado.
        </TermHint>{" "}
        que van con tu plazo y tu riesgo.
      </p>

      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {where.assets.map((asset) => (
          <li key={asset.symbol}>
            <Link
              href={`/stock/${encodeURIComponent(asset.symbol)}`}
              className="group flex h-full flex-col rounded-xl border bg-card p-5 transition-colors duration-150 hover:border-ocean-200 hover:bg-ocean-50/40 active:bg-ocean-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="inline-block rounded-md bg-ocean-50 px-2 py-0.5 font-mono text-sm font-semibold text-ocean-700 transition-colors duration-150 group-hover:bg-ocean-100">
                    {asset.symbol}
                  </span>
                  <p className="mt-2 truncate text-sm text-muted-foreground" title={asset.name}>
                    {asset.name}
                  </p>
                </div>
                <ArrowUpRight
                  className="size-5 shrink-0 text-muted-foreground transition-colors duration-150 group-hover:text-primary"
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </div>
              <p className="mt-4 text-sm font-semibold text-ocean-700">¿Por qué este?</p>
              <p className="mt-1 text-sm leading-relaxed">{whyCopy(asset)}</p>
              <span className="mt-auto pt-4 text-sm font-medium text-primary">
                Ver precio y gráfica<span className="sr-only"> de {asset.symbol}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {where.note && (
        <p className="mt-4 flex gap-2 text-sm leading-relaxed text-muted-foreground">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-ocean-600" strokeWidth={2} aria-hidden="true" />
          {noteCopy(where.note)}
        </p>
      )}
    </section>
  );
}
