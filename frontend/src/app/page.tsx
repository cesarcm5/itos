import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "cn";
import { LandingMotion } from "@/components/landing/landing-motion";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";

const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

const steps = [
  {
    icon: "/itos_icons/avatar_itos.svg",
    title: "Cuéntanos tus números",
    body: "Ingreso, gastos, si ya tienes fondo de emergencia y cuánto riesgo aceptas. Toma un minuto.",
  },
  {
    icon: "/itos_icons/dashboard_itos.svg",
    title: "Recibe cuánto y dónde",
    body: "Te decimos cuánto puedes invertir al mes sin tocar tu colchón, y qué tipo de activos van con tu plazo.",
  },
  {
    icon: "/itos_icons/simulator_itos.svg",
    title: "Mira qué habría pasado",
    body: "Simula aportaciones mensuales con precios reales y ve cómo habría crecido tu dinero.",
  },
] as const;

// Large, comfortable touch targets for the landing CTAs (≥ 44 px).
const ctaBase = cn(buttonVariants({ size: "lg" }), "h-11 px-5 text-base");

export default function Home() {
  return (
    <LandingMotion>
      {/* Hero */}
      <section className="bg-ocean-900 text-white">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <Link href="/" aria-label="ITOS, inicio" className="rounded-md">
            <Logo reversed />
          </Link>
          <Link
            href="/login"
            className="inline-flex h-11 items-center rounded-lg px-4 text-sm font-medium text-ocean-100 transition-colors duration-150 hover:bg-white/10 hover:text-white"
          >
            Iniciar sesión
          </Link>
        </header>

        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-10 pb-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-16 lg:pb-28">
          <div>
            <p data-hero className="text-sm font-medium tracking-wide text-violet-200">
              Para quien invierte por primera vez
            </p>
            <h1
              data-hero
              className="mt-4 text-[2rem] leading-[1.15] font-bold text-balance sm:text-5xl"
            >
              Invierte poco a poco, con un plan que entiendes.
            </h1>
            <p data-hero className="mt-5 max-w-xl text-lg leading-relaxed text-ocean-100">
              ITOS te dice cuánto puedes invertir cada mes, dónde ponerlo según tu plazo y qué habría
              pasado si hubieras empezado antes. Con datos reales del mercado.
            </p>
            <div data-hero className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className={cn(ctaBase, "bg-white text-ocean-700 hover:bg-ocean-50")}
              >
                Crear mi plan
                <ArrowRight data-icon="inline-end" strokeWidth={2} />
              </Link>
              <Link
                href="#como-funciona"
                className={cn(ctaBase, "border-white/30 bg-transparent text-white hover:bg-white/10")}
              >
                Cómo funciona
              </Link>
            </div>
          </div>

          <HeroPreview />
        </div>
      </section>

      {/* 3 steps */}
      <section id="como-funciona" className="scroll-mt-8 bg-background">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <h2 className="max-w-xl text-2xl font-semibold leading-tight sm:text-[2rem]">
            Tres pasos, sin tecnicismos
          </h2>
          <p className="mt-3 max-w-xl text-muted-foreground">
            No necesitas saber de bolsa. Empiezas con tus números y terminas con un plan.
          </p>

          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.title} data-step className="rounded-xl border bg-card p-6">
                <div className="flex items-center justify-between">
                  <Image src={step.icon} alt="" width={48} height={48} className="size-12" />
                  <span className="font-mono text-sm text-muted-foreground tabular-nums">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-6 text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-muted">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold sm:text-[2rem]">Empieza con lo que tienes.</h2>
            <p className="mt-2 text-muted-foreground">Crear tu cuenta es gratis y tu plan está listo en minutos.</p>
          </div>
          <Link href="/register" className={cn(ctaBase, "hover:bg-ocean-700")}>
            Crear mi cuenta
            <ArrowRight data-icon="inline-end" strokeWidth={2} />
          </Link>
        </div>
      </section>

      <footer className="bg-ocean-900 text-ocean-100">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-xs leading-relaxed sm:px-6 md:flex-row md:items-center md:justify-between">
          <Logo reversed className="h-6" />
          <p className="max-w-xl">
            El rendimiento pasado no garantiza resultados futuros. Esto no es asesoría financiera.
          </p>
        </div>
      </footer>
    </LandingMotion>
  );
}

// Static, illustrative preview of the dashboard + simulator. No real data.
function HeroPreview() {
  return (
    <figure data-hero-visual className="rounded-2xl bg-white p-6 text-foreground shadow-sm sm:p-8">
      <figcaption className="text-xs font-medium text-muted-foreground">Ejemplo ilustrativo</figcaption>
      <p className="mt-3 text-muted-foreground">Puedes invertir</p>
      <p className="font-heading text-4xl leading-tight font-semibold tabular-nums sm:text-5xl">
        {mxn.format(4000)} <span className="text-xl text-muted-foreground sm:text-2xl">MXN</span>
      </p>
      <p className="mt-1 text-sm text-muted-foreground">al mes, sin tocar tu fondo de emergencia.</p>

      <svg
        viewBox="0 0 320 120"
        role="img"
        aria-label="Gráfica de ejemplo: el valor de la inversión crece por encima de lo aportado"
        className="mt-6 h-auto w-full"
      >
        {[30, 60, 90].map((y) => (
          <line key={y} x1="0" x2="320" y1={y} y2={y} className="stroke-border" strokeWidth="1" />
        ))}
        <polyline
          points="0,110 64,92 128,74 192,56 256,38 320,20"
          fill="none"
          className="stroke-chart-2"
          strokeWidth="2.5"
          strokeDasharray="6 5"
          strokeLinecap="round"
        />
        <polyline
          points="0,110 40,98 80,94 120,72 160,78 200,50 240,44 280,22 320,10"
          fill="none"
          className="stroke-chart-1"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div className="mt-4 flex gap-5 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-4 rounded-full bg-chart-1" aria-hidden="true" /> Valor
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-4 rounded-full border-t-2 border-dashed border-chart-2" aria-hidden="true" />
          Aportado
        </span>
      </div>
    </figure>
  );
}
