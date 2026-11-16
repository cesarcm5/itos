const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const usd = new Intl.NumberFormat("es-MX", { style: "currency", currency: "USD", currencyDisplay: "narrowSymbol" });
const relative = new Intl.RelativeTimeFormat("es-MX", { numeric: "always", style: "short" });
const shortDate = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" });

/** `$4,000.00 MXN` */
export function formatMxn(value: number): string {
  return `${mxn.format(value)} MXN`;
}

/** `US$215.00` */
export function formatUsd(value: number): string {
  return `US${usd.format(value)}`;
}

/** `hace 12 min`, `hace 3 h`, `hace 2 días` */
export function formatAge(iso: string, now: number = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return relative.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 24) return relative.format(-hours, "hour");
  return relative.format(-Math.round(hours / 24), "day");
}

/** `3 nov` */
export function formatShortDate(iso: string): string {
  return shortDate.format(new Date(iso));
}

const MINUS = "−";
const pct = new Intl.NumberFormat("es-MX", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compactUsd = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "USD",
  currencyDisplay: "narrowSymbol",
  notation: "compact",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});
const compactNumber = new Intl.NumberFormat("es-MX", { notation: "compact", maximumFractionDigits: 1 });
// Market dates are date-only (`2021-11-01`); format them in UTC so they don't shift a day back in Mexico.
const dayMonthYear = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const monthYear = new Intl.DateTimeFormat("es-MX", { month: "short", year: "numeric", timeZone: "UTC" });
const longMonthYear = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric", timeZone: "UTC" });
const dayMonthUtc = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: "UTC" });

function sign(value: number): string {
  return value > 0 ? "+" : value < 0 ? MINUS : "";
}

/** `+US$12.50`, `−US$3.10`: gains and losses always carry a sign (brand guide §1). */
export function formatSignedUsd(value: number): string {
  return `${sign(value)}${formatUsd(Math.abs(value))}`;
}

/** `+12.34 %` from a percentage number (12.34, not 0.1234). */
export function formatSignedPct(value: number): string {
  return `${sign(value)}${pct.format(Math.abs(value) / 100)}`;
}

/** `US$12.5 k` for chart axes. */
export function formatCompactUsd(value: number): string {
  return `US${compactUsd.format(value)}`;
}

/** `12.3 M` */
export function formatCompactNumber(value: number): string {
  return compactNumber.format(value);
}

/** `3 nov 2026` for a `YYYY-MM-DD` market date. */
export function formatMarketDate(date: string): string {
  return dayMonthYear.format(new Date(`${date.slice(0, 10)}T00:00:00Z`));
}

/** `3 nov` for a `YYYY-MM-DD` market date. */
export function formatMarketDay(date: string): string {
  return dayMonthUtc.format(new Date(`${date.slice(0, 10)}T00:00:00Z`));
}

/** `nov 2021` */
export function formatMonthYear(date: string): string {
  return monthYear.format(new Date(`${date.slice(0, 10)}T00:00:00Z`));
}

/** `noviembre de 2021` */
export function formatLongMonthYear(date: string): string {
  return longMonthYear.format(new Date(`${date.slice(0, 10)}T00:00:00Z`));
}
