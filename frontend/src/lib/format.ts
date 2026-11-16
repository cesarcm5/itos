const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

/** `$4,000.00 MXN` */
export function formatMxn(value: number): string {
  return `${mxn.format(value)} MXN`;
}
