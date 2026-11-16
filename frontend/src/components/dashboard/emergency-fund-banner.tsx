import { Landmark, LifeBuoy } from "lucide-react";
import { formatMxn } from "@/lib/format";
import { monthsToFund, type Recommendation } from "@/lib/recommendation";

// Shown instead of investing advice when the user has no emergency fund yet.
export function EmergencyFundBanner({ rec }: { rec: Recommendation }) {
  const months = monthsToFund(rec);

  return (
    <section
      aria-labelledby="fund-title"
      className="flex gap-4 rounded-xl border border-warning/25 bg-warning/5 p-5 sm:p-6"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
        <LifeBuoy className="size-5" strokeWidth={2} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h2 id="fund-title" className="text-lg font-semibold">
          Primero, tu colchón
        </h2>
        <p className="mt-1 leading-relaxed text-muted-foreground">
          Junta <strong className="font-semibold text-foreground tabular-nums">{formatMxn(rec.emergencyTarget)}</strong>{" "}
          (6 meses de gastos) en renta fija, como CETES, una cuenta de ahorro con buen rendimiento o fondos de bonos de
          corto plazo.
        </p>
        {months !== null && (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Si apartas tus <span className="font-medium text-foreground tabular-nums">{formatMxn(rec.surplus)}</span>{" "}
            libres cada mes, lo completas en unos{" "}
            <span className="font-medium text-foreground tabular-nums">
              {months} {months === 1 ? "mes" : "meses"}
            </span>
            .
          </p>
        )}
        <p className="mt-3 text-sm text-muted-foreground">Mientras tanto, puedes explorar activos y el simulador.</p>
      </div>
    </section>
  );
}

// Always on the dashboard (product spec): the emergency fund stays out of the stock market.
export function FixedIncomeTip() {
  return (
    <aside aria-label="Consejo" className="flex gap-3 rounded-xl bg-ocean-50 p-4 text-sm leading-relaxed text-ocean-800">
      <Landmark className="mt-0.5 size-5 shrink-0 text-ocean-600" strokeWidth={2} aria-hidden="true" />
      <div>
        <p className="font-semibold text-ocean-700">Tu fondo de emergencia, en renta fija</p>
        <p className="mt-1">
          Guárdalo donde puedas sacarlo rápido y con bajo riesgo, como CETES o una cuenta de ahorro. La bolsa es para el
          dinero que no vas a necesitar pronto.
        </p>
      </div>
    </aside>
  );
}
