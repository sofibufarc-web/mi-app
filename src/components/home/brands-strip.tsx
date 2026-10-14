/**
 * Franja de marcas: se desplaza sola y las marcas, en gris, toman el color al
 * pasar el mouse. Se pausa con hover (para poder leer) y, con «reducir
 * movimiento», queda quieta.
 *
 * Son LOGOS DE TEXTO (nombre de la marca en la tipografía de títulos): no hay
 * archivos de logos en el proyecto. Si se consiguen los reales, se reemplaza el
 * <span> por una <Image> sin tocar el resto.
 *
 * El loop no tiene costura por el mismo motivo que la vieja cinta de colores:
 * la lista se dibuja DOS veces y cada copia se corre el 100% de su ancho.
 */
const MARCAS = ["Sinteplast", "Doble B", "Pinas", "Trimas", "Kuwait"];

export function BrandsStrip({ title }: { title: string }) {
  const fila = Array.from({ length: 3 }, () => MARCAS).flat();
  return (
    <section aria-label={title} className="border-b border-line">
      <p className="pt-6 text-center text-[11px] font-bold uppercase tracking-[0.25em] text-ink-soft">{title}</p>
      <div className="group relative overflow-hidden py-6 [mask-image:linear-gradient(to_right,transparent,#000_10%,#000_90%,transparent)]">
        <div className="flex w-max">
          {[0, 1].map((copia) => (
            <ul
              key={copia}
              aria-hidden={copia === 1}
              className="animate-marquee flex shrink-0 items-center gap-16 pr-16 group-hover:[animation-play-state:paused]"
              style={{ animationDuration: "40s" }}
            >
              {fila.map((marca, i) => (
                <li key={i}>
                  <span className="font-display text-3xl font-extrabold uppercase tracking-tight text-ink/30 transition-colors duration-300 hover:text-brand sm:text-4xl">
                    {marca}
                  </span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}
