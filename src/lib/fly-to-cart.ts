/**
 * Efectos de movimiento compartidos entre la ficha y la tarjeta de catálogo.
 * Solo se usan desde componentes cliente (tocan `window` y `document`).
 */

/** ¿La persona pidió reducir el movimiento? Entonces no animamos nada. */
export const reduceMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Miniatura que vuela desde `origen` hasta el ícono del carrito.
 *
 * Puede haber más de un `[data-cart-target]` en la página (el del header y,
 * eventualmente, otro en la barra de abajo del celular) y alguno puede estar
 * oculto con CSS: un elemento oculto mide 0×0 y la miniatura volaría a la
 * esquina de la pantalla. Por eso se usa el primero que sea visible.
 */
export function volarAlCarrito(origen: HTMLElement | null) {
  if (!origen || reduceMotion()) return;
  const destino = [...document.querySelectorAll<HTMLElement>("[data-cart-target]")].find(
    (el) => el.getBoundingClientRect().width > 0,
  );
  if (!destino) return;
  const a = origen.getBoundingClientRect();
  const b = destino.getBoundingClientRect();
  const clon = document.createElement("div");
  Object.assign(clon.style, {
    position: "fixed",
    left: `${a.left + a.width / 2 - 28}px`,
    top: `${a.top + a.height / 2 - 28}px`,
    width: "56px",
    height: "56px",
    borderRadius: "12px",
    zIndex: "9999",
    pointerEvents: "none",
    background: "var(--color-card)",
    border: "1px solid var(--color-line)",
    boxShadow: "0 8px 24px rgb(0 0 0 / 0.2)",
    backgroundSize: "contain",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
  });
  const img = origen.querySelector("img");
  if (img?.currentSrc) clon.style.backgroundImage = `url("${img.currentSrc}")`;
  document.body.appendChild(clon);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const anim = clon.animate(
    [
      { transform: "translate(0,0) scale(1)", opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.2)`, opacity: 0.4 },
    ],
    { duration: 650, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
  );
  anim.onfinish = () => clon.remove();
}
