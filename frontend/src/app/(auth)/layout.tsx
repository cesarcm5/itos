import { Check } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { MotionProvider } from "@/components/motion-provider";

const points = [
  "Cuánto puedes invertir al mes, sin tocar tu colchón",
  "Dónde ponerlo según tu plazo",
  "Qué habría pasado con precios reales",
];

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid flex-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Brand panel, desktop only */}
      <aside className="hidden flex-col justify-between bg-ocean-900 p-12 text-white lg:flex">
        <Link href="/" aria-label="ITOS, inicio" className="self-start rounded-md">
          <Logo reversed />
        </Link>
        <div className="max-w-md">
          <h2 className="text-[2rem] leading-tight font-semibold text-balance">
            Un plan claro para empezar a invertir.
          </h2>
          <ul className="mt-8 flex flex-col gap-4">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-3 text-ocean-100">
                <Check className="mt-0.5 size-5 shrink-0 text-violet-300" strokeWidth={2} aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <p className="max-w-md text-xs leading-relaxed text-ocean-200">
          El rendimiento pasado no garantiza resultados futuros. Esto no es asesoría financiera.
        </p>
      </aside>

      <main className="flex flex-col px-4 py-6 sm:px-6">
        <Link href="/" aria-label="ITOS, inicio" className="self-start rounded-md lg:hidden">
          <Logo className="h-6" />
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <MotionProvider>{children}</MotionProvider>
        </div>
      </main>
    </div>
  );
}
