/**
 * Carta de colores del simulador de la home.
 *
 * Es un `.ts` y no un `.json` a propósito. La regla del proyecto es: JSON para
 * lo que el panel escribe en tiempo de ejecución (productos, categorías,
 * configuración), porque un `.ts` importado queda cacheado por el bundler. La
 * carta de colores no la edita nadie desde el panel: es data del proyecto, se
 * cambia tocando este archivo, y como `.ts` viene tipada de arriba.
 *
 * Los nombres NO se traducen, por la misma razón que no se traduce "Látex
 * Interior 20 L": es el nombre comercial del color, no un texto de interfaz.
 */

export type PaintColor = {
  /** Identificador estable. No se muestra. */
  id: string;
  /** Nombre comercial, tal como lo pediría un cliente en el mostrador. */
  name: string;
  /** El color en sí. Siempre en formato #rrggbb (lo asume `isLightColor`). */
  hex: string;
};

/**
 * Colores de pared: látex interior y frentes.
 *
 * Están ordenados de claro a oscuro dentro de cada familia (neutros, tierras,
 * verdes, azules, grises) porque una carta desordenada se lee como un tacho de
 * colores sueltos y no deja comparar tonos vecinos.
 */
export const wallColors: PaintColor[] = [
  { id: "w-blanco", name: "Blanco Puro", hex: "#f4f2ed" },
  { id: "w-lino", name: "Lino", hex: "#e7dcc8" },
  { id: "w-arena", name: "Arena", hex: "#d6c09c" },
  { id: "w-ocre", name: "Ocre Suave", hex: "#c9a34a" },
  { id: "w-terracota", name: "Terracota", hex: "#b25c40" },
  { id: "w-ladrillo", name: "Ladrillo", hex: "#8c3d2f" },
  { id: "w-salvia", name: "Verde Salvia", hex: "#93a486" },
  { id: "w-ingles", name: "Verde Inglés", hex: "#3f5748" },
  { id: "w-cielo", name: "Celeste Cielo", hex: "#a9c5da" },
  { id: "w-petroleo", name: "Azul Petróleo", hex: "#2d4a5d" },
  { id: "w-perla", name: "Gris Perla", hex: "#c8cac7" },
  { id: "w-grafito", name: "Gris Grafito", hex: "#4a4e53" },
];

/**
 * Colores de aerosol: esmalte sintético en spray.
 *
 * Son más saturados que los de pared a propósito. Un aerosol no se usa para
 * pintar un living entero sino para retocar una reja, una llanta o un mueble
 * de metal, así que la carta real del rubro va a los colores plenos.
 */
export const sprayColors: PaintColor[] = [
  { id: "s-negro", name: "Negro Mate", hex: "#22242a" },
  { id: "s-blanco", name: "Blanco Brillante", hex: "#f2f3f4" },
  { id: "s-aluminio", name: "Aluminio", hex: "#b6bcc2" },
  { id: "s-antioxido", name: "Gris Antióxido", hex: "#6d7076" },
  { id: "s-rojo", name: "Rojo Fuego", hex: "#c62b25" },
  { id: "s-naranja", name: "Naranja Seguridad", hex: "#e2701d" },
  { id: "s-amarillo", name: "Amarillo Vial", hex: "#e8b31c" },
  { id: "s-verde", name: "Verde Inglés", hex: "#2f6b45" },
  { id: "s-azul", name: "Azul Francia", hex: "#1f4fa8" },
  { id: "s-dorado", name: "Dorado", hex: "#a98436" },
];
