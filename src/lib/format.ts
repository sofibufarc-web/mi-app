/**
 * Formato de precios en pesos argentinos: $ 89.900,00
 *
 * Intl.NumberFormat es la API estándar del navegador y de Node para formatear
 * números según un idioma/región. Usamos "es-AR" para que el separador de miles
 * sea el punto y el decimal la coma.
 */
const arsFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPrice(value: number): string {
  if (!Number.isFinite(value)) return "-";
  return arsFormatter.format(value);
}

/** Igual que formatPrice pero sin decimales, para listados densos. */
export function formatPriceShort(value: number): string {
  if (!Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Variación porcentual entre dos precios, ya redondeada. Ej: +12.5 */
export function priceDeltaPercent(oldPrice: number, newPrice: number): number {
  if (!oldPrice) return 0;
  return Math.round(((newPrice - oldPrice) / oldPrice) * 1000) / 10;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
