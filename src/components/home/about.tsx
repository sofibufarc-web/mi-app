import Image from "next/image";

import { ArgentinaMap } from "@/components/argentina-map";
import { Reveal } from "@/components/reveal";
import type { StoreConfig } from "@/data/types";
import type { Dictionary } from "@/lib/i18n";

/**
 * «La empresa»: texto institucional, foto real del depósito (si está cargada
 * en `siteConfig.company.warehousePhoto`), año de fundación (ídem) y el mapa
 * de Argentina con las provincias de cobertura.
 */
export function About({
  t,
  config,
  foundedYear,
  warehousePhoto,
}: {
  t: Dictionary;
  config: StoreConfig;
  foundedYear: number | null;
  warehousePhoto: string | null;
}) {
  return (
    <section className="border-y border-line bg-surface py-16 sm:py-20">
      <div className="container-wiedmer grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent-text">{t.about.eyebrow}</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{t.about.title}</h2>
          {foundedYear && (
            <p className="mt-3 inline-block rounded-full bg-brand px-3 py-1 text-xs font-bold uppercase tracking-wider text-on-brand">
              {t.homeNew.founded} {foundedYear}
            </p>
          )}
          <p className="mt-6 text-lg leading-relaxed text-ink">{t.about.lead}</p>
          <div className="mt-5 space-y-4 text-sm leading-relaxed text-ink-soft">
            {t.about.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>

          {warehousePhoto && (
            <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl border border-line">
              <Image src={warehousePhoto} alt="" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
            </div>
          )}
        </Reveal>

        <Reveal delay={120}>
          <div className="rounded-2xl border border-line bg-card p-7">
            <h3 className="text-sm font-bold uppercase tracking-wide">{t.about.coverageTitle}</h3>
            <div className="mt-5">
              <ArgentinaMap label={t.homeNew.coverageMap} ariaLabel={`${t.homeNew.coverageMap}: ${t.about.coverage.join(", ")}`} />
            </div>
            <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-2">
              {t.about.coverage.map((zona) => (
                <li key={zona} className="flex items-center gap-2 text-sm">
                  <span aria-hidden className="h-2 w-2 rounded-full bg-brand" />
                  {zona}
                </li>
              ))}
            </ul>
            <div className="mt-6 border-t border-line pt-5 text-sm text-ink-soft">
              <p className="font-semibold text-ink">{config.contact.address}</p>
              <p className="mt-1">Tel. {config.contact.phone}</p>
              <p>{config.contact.hours}</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
