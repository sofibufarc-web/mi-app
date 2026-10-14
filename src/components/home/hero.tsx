import Image from "next/image";
import Link from "next/link";

import { Magnetic } from "@/components/magnetic";
import type { Dictionary } from "@/lib/i18n";

/**
 * Hero: foto a pantalla completa con el texto encima.
 *
 * - La foto hace un zoom lento y continuo (`animate-hero-zoom`).
 * - El título aparece palabra por palabra: cada palabra es un <span> con su
 *   propio retraso. El título completo sigue siendo un solo <h1> para lectores
 *   de pantalla.
 * - Los dos botones son «magnéticos».
 * - En celular es más bajo, para que el título se vea sin scrollear.
 * - Los dos velos (parejo + degradado desde la izquierda) garantizan que el
 *   texto blanco se lea sobre cualquier parte de la foto.
 */
export function Hero({
  t,
  showPrices,
  whatsappUrl,
}: {
  t: Dictionary;
  showPrices: boolean;
  whatsappUrl: string;
}) {
  const palabras = `${t.hero.title} ${t.hero.titleAccent}`.split(" ");

  return (
    <section className="relative isolate flex min-h-[26rem] items-center overflow-hidden bg-brand-darker text-white md:min-h-[min(46rem,calc(100svh-7rem))]">
      <div className="absolute inset-0 -z-10">
        <Image
          src="/img/hero.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="animate-hero-zoom object-cover"
        />
        <div className="absolute inset-0 bg-brand-darker/45" />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-darker/90 via-brand-darker/55 to-transparent" />
      </div>

      <div className="container-wiedmer py-16 md:py-24">
        <p className="animate-fade-up text-xs font-bold uppercase tracking-[0.28em] text-sky-200">
          {t.homeNew.heroEyebrow}
        </p>

        <h1 className="mt-4 max-w-3xl font-display text-[2.6rem] font-extrabold uppercase leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl" aria-label={`${t.hero.title} ${t.hero.titleAccent}`}>
          {palabras.map((palabra, i) => (
            <span
              key={i}
              aria-hidden
              className="animate-fade-up mr-[0.25em] inline-block [animation-duration:600ms]"
              style={{ animationDelay: `${250 + i * 140}ms` }}
            >
              {palabra}
            </span>
          ))}
        </h1>

        <p className="animate-fade-up mt-5 max-w-xl text-base leading-relaxed text-white/80 [animation-delay:700ms] sm:text-lg">
          {t.hero.subtitle}
        </p>

        <div className="animate-fade-up mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 [animation-delay:850ms]">
          <Magnetic>
            <Link href="#categorias" className="btn-primary px-7 py-3.5 text-base">
              {t.common.viewCatalog} <span className="btn-arrow">→</span>
            </Link>
          </Magnetic>
          <Magnetic>
            {showPrices ? (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-outline-light px-7 py-3.5 text-base">
                {t.hero.ctaSecondary}
              </a>
            ) : (
              <Link href="/login" className="btn-outline-light px-7 py-3.5 text-base">
                {t.homeNew.heroClient}
              </Link>
            )}
          </Magnetic>
        </div>
      </div>
    </section>
  );
}
