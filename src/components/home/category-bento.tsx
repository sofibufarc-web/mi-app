import Image from "next/image";
import Link from "next/link";

import { Reveal } from "@/components/reveal";
import { TiltCard } from "@/components/tilt-card";
import type { Category } from "@/data/types";
import type { Dictionary } from "@/lib/i18n";

/**
 * Categorías que son una MARCA (proveedor). El resto se muestra «por tipo de
 * producto». Está escrito acá a mano porque la base no distingue una cosa de la
 * otra: una categoría nueva cae en «por tipo» hasta que se la agregue a esta lista.
 */
const SLUGS_DE_MARCA = new Set(["sinteplast", "doble-b-pinturas", "kuwait", "pinas", "doble-a"]);

/**
 * Categorías de la home en dos bloques parejos: «Por marca» y «Por tipo de
 * producto». Todas las fichas miden lo mismo, así la grilla cierra con cualquier
 * cantidad. Cada ficha se inclina en 3D siguiendo al mouse, la foto hace zoom,
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
  const porMarca = categories.filter((c) => SLUGS_DE_MARCA.has(c.slug));
  const porTipo = categories.filter((c) => !SLUGS_DE_MARCA.has(c.slug));

  return (
    <section id="categorias" className="container-wiedmer py-16 sm:py-20">
      <Reveal>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent-text">{t.homeCategories.eyebrow}</p>
        <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{t.homeCategories.title}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">{t.homeCategories.subtitle}</p>
      </Reveal>

      <Grupo titulo={t.homeCategories.byBrand} categories={porMarca} counts={counts} t={t} columnas="md:grid-cols-5" />
      <Grupo titulo={t.homeCategories.byType} categories={porTipo} counts={counts} t={t} columnas="md:grid-cols-3" />
    </section>
  );
}

function Grupo({
  titulo,
  categories,
  counts,
  t,
  columnas,
}: {
  titulo: string;
  categories: Category[];
  counts: Map<string, number>;
  t: Dictionary;
  columnas: string;
}) {
  // Un bloque sin fichas no se dibuja: evita un título solo, sin nada debajo.
  if (categories.length === 0) return null;

  return (
    <div className="mt-10">
      <Reveal>
        <h3 className="flex items-center gap-4 text-sm font-bold uppercase tracking-[0.2em] text-ink-soft">
          {titulo}
          <span aria-hidden className="h-px flex-1 bg-line" />
        </h3>
      </Reveal>

      {/* Si la cantidad es impar, la última ficha ocupa las dos columnas del
          celular para que no quede un hueco al costado. */}
      <div className={`mt-4 grid auto-rows-[10.5rem] grid-cols-2 gap-3 sm:auto-rows-[12rem] md:gap-4 ${columnas}`}>
        {categories.map((category, i) => (
          <Reveal
            key={category.id}
            delay={(i % 5) * 60}
            className={`h-full ${i === categories.length - 1 && categories.length % 2 === 1 ? "col-span-2 md:col-span-1" : ""}`}
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
                    sizes="(min-width: 768px) 25vw, 50vw"
                    unoptimized={category.image.endsWith(".svg")}
                    className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-brand-darker via-brand-darker/40 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 p-4">
                  <h4 className="font-display text-base font-extrabold leading-tight tracking-tight text-white sm:text-lg">
                    {category.name}
                  </h4>
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
        ))}
      </div>
    </div>
  );
}
