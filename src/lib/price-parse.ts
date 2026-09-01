/**
 * Interpretación de precios escritos "a mano".
 *
 * El problema: en el Excel del proveedor un precio puede venir como número
 * (1234.56), como texto argentino ("$ 1.234,56") o como texto inglés
 * ("1,234.56"). Hay que resolver la ambigüedad del punto: en "1.234" puede ser
 * separador de miles (=1234) o decimal (=1.234).
 *
 * Regla que usamos, de más específica a más general:
 *   1. Si aparecen los DOS separadores, el que está más a la derecha es el
 *      decimal y el otro es de miles.  "1.234,56" → 1234.56   "1,234.56" → 1234.56
 *   2. Si aparece solo la coma, es decimal.  "1234,5" → 1234.5
 *   3. Si aparece solo el punto y separa grupos de exactamente 3 dígitos, es
 *      de miles.  "1.234" → 1234   "89.900" → 89900
 *   4. En cualquier otro caso el punto es decimal.  "1234.5" → 1234.5
 */
export function parsePriceValue(raw: unknown): number | null {
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw >= 0 ? raw : null;
  }
  if (typeof raw !== "string") return null;

  // Sacamos símbolos de moneda, espacios y cualquier texto suelto.
  const cleaned = raw.replace(/[^\d.,-]/g, "").trim();
  if (cleaned === "" || cleaned === "-") return null;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");

  let normalized: string;

  if (lastComma !== -1 && lastDot !== -1) {
    // Regla 1
    const decimalSep = lastComma > lastDot ? "," : ".";
    const thousandSep = decimalSep === "," ? "." : ",";
    normalized = cleaned
      .split(thousandSep)
      .join("")
      .replace(decimalSep, ".");
  } else if (lastComma !== -1) {
    // Regla 2
    normalized = cleaned.replace(",", ".");
  } else if (lastDot !== -1 && /^-?\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    // Regla 3
    normalized = cleaned.split(".").join("");
  } else {
    // Regla 4
    normalized = cleaned;
  }

  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;

  // Redondeamos a 2 decimales para no arrastrar errores de coma flotante.
  return Math.round(value * 100) / 100;
}
