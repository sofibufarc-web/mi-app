/**
 * Escribir una cookie desde el navegador.
 *
 * Vive en su propio módulo, fuera de cualquier componente, por dos razones:
 *
 * 1. No repetir la ristra de `path`, `max-age` y `samesite` en cada lugar.
 * 2. El compilador de React analiza el cuerpo de los componentes para
 *    memorizarlos, y no le gusta que le asignen valores a objetos globales como
 *    `document` ahí adentro. Sacando la escritura a una función de módulo, el
 *    componente queda "puro" y el compilador puede optimizarlo tranquilo.
 *
 * Solo se usa para preferencias de interfaz (tema e idioma). Las cookies que
 * importan de verdad —la de sesión— las escribe el servidor con `httpOnly`,
 * justamente para que el JavaScript de la página NO pueda tocarlas.
 */
export function setPreferenceCookie(name: string, value: string, maxAgeSeconds: number) {
  // `samesite=lax` = la cookie no viaja en pedidos que vengan de otro sitio.
  document.cookie = `${name}=${value}; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
}
