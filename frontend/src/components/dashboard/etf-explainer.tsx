import { ArrowRightLeft, ChevronDown, Layers, Receipt } from "lucide-react";
import Link from "next/link";
import type { SuggestedAsset } from "@/lib/recommendation";

// What one share of each suggested ETF holds, in plain words. Zero API cost.
const HOLDINGS: Record<string, string> = {
  VOO: "las 500 empresas más grandes de EE. UU.",
  VTI: "más de 3,500 empresas de EE. UU.",
  VXUS: "miles de empresas fuera de EE. UU.",
  QQQ: "las 100 empresas más grandes del Nasdaq",
  BND: "miles de bonos de gobierno y empresas",
  SHY: "bonos del gobierno de EE. UU. a corto plazo",
};

const POINTS = [
  {
    icon: Layers,
    title: "Muchas inversiones en una",
    text: "Si una empresa cae, las demás amortiguan el golpe. A eso se le llama diversificar.",
  },
  {
    icon: ArrowRightLeft,
    title: "Se compra como una acción",
    text: "Tiene su clave (como VOO) y un precio que cambia durante el día. Puedes comprar fracciones.",
  },
  {
    icon: Receipt,
    title: "Comisiones bajas",
    text: "Muchos ETFs de índice cobran menos de 0.1% al año: menos de $10 por cada $10,000 invertidos.",
  },
] as const;

const FAQ = [
  {
    q: "¿En qué se diferencia de comprar una acción?",
    a: "Una acción es una parte de una sola empresa. Un ETF reúne muchas acciones (o bonos), así que tu dinero no depende de que a una sola empresa le vaya bien.",
  },
  {
    q: "¿Un ETF puede perder valor?",
    a: "Sí. Su precio sube y baja con el mercado. Diversificar reduce el riesgo de una sola empresa, pero no el de una caída general. Por eso conviene invertir a largo plazo y con dinero que no necesitas pronto.",
  },
  {
    q: "¿Qué es un ETF de índice?",
    a: "Uno que copia una lista conocida de empresas, como el S&P 500, en lugar de que alguien elija qué comprar. Por eso suele ser más barato.",
  },
] as const;

/** First suggested asset we can describe, to make the explanation concrete. */
function exampleFrom(assets: SuggestedAsset[]): { symbol: string; holds: string; inPlan: boolean } {
  const match = assets.find((asset) => HOLDINGS[asset.symbol]);
  return match
    ? { symbol: match.symbol, holds: HOLDINGS[match.symbol]!, inPlan: true }
    : { symbol: "VOO", holds: HOLDINGS.VOO!, inPlan: false };
}

export function EtfExplainer({ assets }: { assets: SuggestedAsset[] }) {
  const example = exampleFrom(assets);

  return (
    <section aria-labelledby="etf-title" className="rounded-xl border bg-card p-5 sm:p-8">
      <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">Aprende</span>
      <h2 id="etf-title" className="mt-3 text-xl font-semibold sm:text-2xl">
        ¿Qué es un ETF?
      </h2>

      <div className="mt-4 grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_14rem]">
        <p className="max-w-prose leading-relaxed text-muted-foreground">
          Es como una <strong className="font-semibold text-foreground">canasta</strong> que ya trae muchas inversiones
          adentro. En lugar de elegir y comprar empresas una por una, compras la canasta completa en una sola operación.
        </p>
        <BasketFigure symbol={example.symbol} holds={example.holds} />
      </div>

      <ul className="mt-6 grid gap-4 sm:grid-cols-3">
        {POINTS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="rounded-lg bg-muted p-4">
            <Icon className="size-5 text-ocean-600" strokeWidth={2} aria-hidden="true" />
            <p className="mt-2 text-sm font-semibold">{title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
          </li>
        ))}
      </ul>

      <div className="mt-6 divide-y border-y">
        {FAQ.map((item) => (
          <details key={item.q} className="group">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-3 text-sm font-medium transition-colors duration-150 hover:text-primary [&::-webkit-details-marker]:hidden">
              {item.q}
              <ChevronDown
                className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
                strokeWidth={2}
                aria-hidden="true"
              />
            </summary>
            <p className="pb-4 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
          </details>
        ))}
      </div>

      <p className="mt-5 text-sm text-muted-foreground">
        Mira cómo se ha movido{" "}
        <Link
          href={`/stock/${encodeURIComponent(example.symbol)}`}
          className="rounded-sm font-mono font-semibold text-ocean-700 underline decoration-ocean-200 underline-offset-4 transition-colors duration-150 hover:decoration-ocean-600"
        >
          {example.symbol}
        </Link>
        {example.inPlan ? ", uno de los ETFs de tu plan." : ", uno de los ETFs más conocidos."}
      </p>
    </section>
  );
}

// One ETF share (the tile) holding many companies (the dots). Decorative; the caption carries the meaning.
function BasketFigure({ symbol, holds }: { symbol: string; holds: string }) {
  const dots = Array.from({ length: 24 }, (_, i) => i);
  return (
    <figure className="rounded-xl border border-ocean-100 bg-ocean-50 p-4">
      <div className="flex items-center justify-between">
        <span className="rounded-md bg-card px-2 py-0.5 font-mono text-sm font-semibold text-ocean-700">{symbol}</span>
        <span className="text-xs text-ocean-700">1 compra</span>
      </div>
      <div className="mt-3 grid grid-cols-8 gap-1.5" aria-hidden="true">
        {dots.map((i) => (
          <span
            key={i}
            className={i % 7 === 3 ? "aspect-square rounded-sm bg-violet-400" : "aspect-square rounded-sm bg-ocean-300"}
          />
        ))}
      </div>
      <figcaption className="mt-3 text-xs leading-snug text-ocean-800">
        {/* Some descriptions already end in "EE. UU.", so don't add a second period. */}
        Con una compra de {symbol} ya tienes una parte de {holds}
        {holds.endsWith(".") ? "" : "."}
      </figcaption>
    </figure>
  );
}
