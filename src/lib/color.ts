/**
 * Utilidades de color.
 *
 * Hoy tiene una sola función, pero vive aparte porque no es de ninguna pantalla
 * en particular: la va a querer cualquier lugar que muestre texto encima de un
 * color elegido por el usuario.
 */

/**
 * ¿Este color es lo bastante claro como para que el texto encima tenga que ser
 * oscuro?
 *
 * El problema: el simulador escribe el nombre del color sobre una muestra del
 * color. Con "Blanco Puro" el texto tiene que ser negro; con "Azul Petróleo",
 * blanco. Elegir a ojo no escala: son 22 colores y mañana pueden ser 60.
 *
 * La cuenta no es el promedio de R, G y B. El ojo humano no percibe los tres
 * canales con la misma intensidad: el verde ilumina mucho más que el azul. Los
 * coeficientes 0.2126 / 0.7152 / 0.0722 son los que define la norma WCAG para
 * calcular la LUMINANCIA RELATIVA, que es cuánta luz percibimos realmente. Por
 * eso un amarillo puro se lee como "claro" y un azul puro como "oscuro", aunque
 * los dos usen dos canales al máximo.
 *
 * El corte en 0.55 está un poco por encima del medio: un color intermedio se
 * lee mejor con texto oscuro que con texto blanco.
 *
 * @param hex color en formato "#rrggbb"
 */
export function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.55;
}
