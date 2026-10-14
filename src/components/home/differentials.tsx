import { Reveal } from "@/components/reveal";
import type { Dictionary } from "@/lib/i18n";

/** Los cuatro íconos de línea. Cada <path> lleva pathLength="1" para poder «dibujarse». */
const ICONOS = [
  "M3 17h18l-2 4H5l-2-4Zm3-2V8l6-4 6 4v7", // importación
  "M3 16V6h11v10M14 10h4l3 3v3h-7M6.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm11 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z", // camión
  "M4 8h7v6H4V8Zm9 0h7v6h-7V8ZM8.5 14h7v6h-7v-6Z", // stock
  "M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9l-6-6Zm0 0v6h6M9 14l2.5 2.5L16 12", // lista
];

/**
 * «Por qué Wiedmer»: cuatro tarjetas con un dato grande cada una. Suben
 * apenas al pasar el mouse. El tercer dato es la cantidad real de productos.
 */
export function Differentials({ t, productsLabel }: { t: Dictionary; productsLabel: string }) {
  const cifras = [...t.homeNew.whyFigures];
  cifras[2] = productsLabel;

  return (
    <section className="container-wiedmer py-16 sm:py-20">
      <Reveal>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent-text">{t.homeWhy.eyebrow}</p>
        <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{t.homeWhy.title}</h2>
      </Reveal>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {t.homeWhy.items.map((item, i) => (
          <Reveal key={item.title} delay={i * 60} className="h-full">
            <article className="h-full rounded-2xl border border-line bg-card p-6 transition duration-300 hover:-translate-y-1.5 hover:border-brand/40 hover:shadow-xl hover:shadow-brand/10">
              <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="draw-icon h-9 w-9 text-brand">
                <path d={ICONOS[i] ?? ICONOS[0]} pathLength={1} />
              </svg>
              <p className="mt-5 font-display text-4xl font-extrabold tracking-tight text-brand">{cifras[i]}</p>
              <h3 className="mt-1 font-bold tracking-tight">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{item.text}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
