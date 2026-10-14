import Image from "next/image";

import { Magnetic } from "@/components/magnetic";
import { Reveal } from "@/components/reveal";
import { WiedmerMark } from "@/components/wiedmer-logo";
import type { Dictionary } from "@/lib/i18n";

/**
 * Llamado final: fondo azul con un degradado que se mueve muy despacio, el
 * vendedor (foto y nombre) si están cargados en `siteConfig.company.seller`, y
 * dos botones: WhatsApp y Llamar.
 */
export function FinalCta({
  t,
  whatsappUrl,
  phone,
  seller,
}: {
  t: Dictionary;
  whatsappUrl: string;
  phone: string;
  seller: { name: string; photo: string | null } | null;
}) {
  const tel = phone.replace(/[^\d+]/g, "");

  return (
    <section className="container-wiedmer pb-4 pt-16 sm:pt-20">
      <Reveal>
        <div className="animate-gradient-slow relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-brand-darker via-brand to-brand-darker px-8 py-16 text-center text-white sm:px-14 sm:py-20">
          <WiedmerMark className="pointer-events-none absolute -bottom-16 -right-10 h-64 w-auto select-none text-white/[0.06]" />

          <div className="relative">
            <div className="mx-auto flex flex-col items-center">
              {seller?.photo && (
                <Image src={seller.photo} alt="" width={88} height={88} className="h-22 w-22 rounded-full border-4 border-white/30 object-cover" />
              )}
              <p className="mt-3 text-xs font-bold uppercase tracking-[0.25em] text-sky-200">{t.homeNew.seller}</p>
              <p className="font-display text-xl font-bold">{seller?.name ?? t.homeNew.sellerFallback}</p>
            </div>

            <h2 className="mx-auto mt-6 max-w-2xl font-display text-3xl font-extrabold tracking-tight sm:text-5xl">{t.homeCta.title}</h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/75">{t.homeCta.subtitle}</p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <Magnetic>
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-8 py-3.5 text-base font-bold text-white transition hover:brightness-105 active:scale-[0.97]">
                  <svg aria-hidden viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                    <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2Zm5.4 14c-.2.6-1.2 1.2-1.7 1.2-.4 0-1 .1-3.3-.9-2.8-1.2-4.5-4-4.7-4.2-.1-.2-1-1.4-1-2.6s.6-1.8.9-2c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.3.3c-.1.2-.3.3-.1.6.1.3.7 1.2 1.5 1.9 1 .9 1.8 1.1 2 1.2.3.1.4.1.6-.1l.8-1c.2-.2.4-.2.6-.1l1.9.9c.2.1.4.2.5.3.1.2.1.7-.1 1.3Z" />
                  </svg>
                  {t.homeCta.button}
                </a>
              </Magnetic>
              <Magnetic>
                <a href={`tel:${tel}`} className="btn-outline-light px-8 py-3.5 text-base">
                  {t.homeNew.call}
                </a>
              </Magnetic>
            </div>

            <p className="mt-4 text-xs text-white/55">{t.homeCta.hours}</p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
