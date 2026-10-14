import Image from "next/image";
import Link from "next/link";

import { Reveal } from "@/components/reveal";
import { TiltCard } from "@/components/tilt-card";
import type { Category } from "@/data/types";
import type { Dictionary } from "@/lib/i18n";

/**
 * Categorías en grilla «bento»: la primera (Pinturas) ocupa 2×2 y es la más
 * grande. Cada tarjeta se inclina en 3D siguiendo al mouse, la foto hace zoom,
 * aparece «N productos» y la flecha avanza.
 */
export function CategoryBento({
  categories,
  counts,
  t,
}: {
  categories: Category[];
  counts: Map<string, number>;
  t: Dictionary;
}) {
  // Con 7 categorías las dos últimas se estiran a lo ancho y la grilla cierra
  // sin huecos. Con otra cantidad, todas quedan del mismo tamaño.
  const cierraAncho = categories.length === 7;

  return (
    <section id="categorias" className="container-wiedmer py-16 sm:py-20">
      <Reveal>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent-text">{t.homeCategories.eyebrow}</p>
        <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{t.homeCategories.title}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">{t.homeCategories.subtitle}</p>
      </Reveal>

      <div className="mt-10 grid auto-rows-[10.5rem] grid-cols-2 gap-3 sm:auto-rows-[13rem] md:grid-cols-4 md:gap-4">
        {categories.map((category, i) => {
          const grande = i === 0;
          const ancha = cierraAncho && i >= 5;
          return (
            <Reveal
              key={category.id}
              delay={(i % 4) * 60}
              className={`h-full ${grande ? "col-span-2 row-span-2" : ancha ? "col-span-2" : ""}`}
            >
              <TiltCard>
                <Link
                  href={`/categoria/${category.slug}`}
                  className="group relative block h-full overflow-hidden rounded-2xl border border-line bg-brand-darker transition-shadow duration-300 hover:shadow-2xl hover:shadow-brand/20"
                >
                  {category.image && (
                    <Image
                      src={category.image}
                      alt=""
                      fill
                      sizes={grande ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 768px) 25vw, 50vw"}
                      unoptimized={category.image.endsWith(".svg")}
                      className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-darker via-brand-darker/40 to-transparent" />

                  <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                    <h3 className={`font-display font-extrabold leading-tight tracking-tight text-white ${grande ? "text-2xl sm:text-4xl" : "text-base sm:text-xl"}`}>
                      {category.name}
                    </h3>
                    <p className="mt-1 flex items-center justify-between gap-2 text-xs font-semibold text-sky-200 sm:text-sm">
                      {/* «147 productos» aparece al pasar el mouse; en celular no hay
                          hover, así que ahí está siempre. */}
                      <span className="transition-all duration-300 md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100">
                        {counts.get(category.id) ?? 0} {t.homeNew.categoryCount}
                      </span>
                      <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1.5">→</span>
                    </p>
                  </div>
                </Link>
              </TiltCard>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
