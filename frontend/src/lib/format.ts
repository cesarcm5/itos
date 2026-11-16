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
