/**
 * Convierte un texto en un "slug": minúsculas, sin tildes, sin caracteres
 * raros y con guiones en lugar de espacios. Es lo que va en la URL.
 *
 *   slugify("Látex Interior 20 L")  →  "latex-interior-20-l"
 *
 * `normalize("NFD")` separa la letra de su tilde en dos caracteres (é → e + ´)
 * y después borramos los acentos sueltos, que viven en el rango unicode
 * U+0300 a U+036F.
 */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Igual que `slugify`, pero si el slug ya existe le agrega -2, -3, etc.
 * `existing` son los slugs ya usados (sin contar el del propio registro que
 * estamos editando).
 */
export function uniqueSlug(text: string, existing: string[]): string {
  const base = slugify(text) || "item";
  if (!existing.includes(base)) return base;

  let n = 2;
  while (existing.includes(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/**
 * Normaliza texto para comparar sin importar mayúsculas, tildes ni espacios
 * de más. Lo usan el buscador y el matching del Excel.
 */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
