import Link from "next/link";

import { LanguageSwitcher } from "@/components/language-switcher";
import { WiedmerLogo } from "@/components/wiedmer-logo";
import { siteConfig } from "@/config/site";
import { getCategories, getStoreConfig } from "@/lib/data-source";
import { getViewer } from "@/lib/request-context";
import { normalizeWhatsappNumber } from "@/lib/whatsapp";

export async function SiteFooter() {
  const [config, categories, viewer] = await Promise.all([
    getStoreConfig(),
    getCategories(),
    getViewer(),
  ]);
  const { t, locale, showPrices } = viewer;
  const year = new Date().getFullYear();
  const { company } = siteConfig;

  const redes = [
    company.instagram ? { href: company.instagram, label: "Instagram" } : null,
    company.facebook ? { href: company.facebook, label: "Facebook" } : null,
  ].filter((r): r is { href: string; label: string } => r !== null);

  return (
    /*
      El footer usa `brand-darker`, que es azul muy oscuro en modo día y casi
      negro en modo noche. En los dos casos el texto va en blanco, así que acá
      sí escribimos `text-white` fijo en vez de un token.
      `pb-14 md:pb-0`: en celular deja lugar a la barra inferior fija.
    */
    <footer className="mt-20 bg-brand-darker pb-14 text-white md:pb-0">
      <div className="container-wiedmer grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <WiedmerLogo size="md" className="text-white" />
          <p className="mt-4 text-sm leading-relaxed text-white/65">{t.footer.tagline}</p>

          {redes.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-bold uppercase tracking-wide text-white/50">{t.footerExtra.followUs}</p>
              <ul className="mt-2 flex gap-4 text-sm text-white/75">
                {redes.map((r) => (
                  <li key={r.label}>
                    <a href={r.href} target="_blank" rel="noopener noreferrer" className="link-grow pb-0.5 hover:text-white">
                      {r.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-5 flex items-center gap-2 text-xs text-white/50">
            <span>{t.footerExtra.language}</span>
            <LanguageSwitcher current={locale} t={t.language} />
          </div>
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide">{t.common.categories}</h2>
          <ul className="mt-4 space-y-2 text-sm text-white/65">
            {categories.map((category) => (
              <li key={category.id}>
                <Link href={`/categoria/${category.slug}`} className="link-grow pb-0.5 hover:text-white">
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide">{t.footer.contact}</h2>
          <ul className="mt-4 space-y-2 text-sm text-white/65">
            <li>{config.contact.address}</li>
            <li>Tel. {config.contact.phone}</li>
            <li>
              <a href={`mailto:${config.contact.email}`} className="link-grow pb-0.5 hover:text-white">
                {config.contact.email}
              </a>
            </li>
            <li>{config.contact.hours}</li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide">{t.footer.orders}</h2>
          <p className="mt-4 text-sm text-white/65">{t.footer.ordersText}</p>
          <div className="mt-4 flex flex-col items-start gap-3">
            <a
              href={`https://wa.me/${normalizeWhatsappNumber(config.whatsappNumber)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-brand-darker transition hover:-translate-y-0.5 hover:bg-white/90"
            >
              <svg aria-hidden viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2Zm5.4 14c-.2.6-1.2 1.2-1.7 1.2-.4 0-1 .1-3.3-.9-2.8-1.2-4.5-4-4.7-4.2-.1-.2-1-1.4-1-2.6s.6-1.8.9-2c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.3.3c-.1.2-.3.3-.1.6.1.3.7 1.2 1.5 1.9 1 .9 1.8 1.1 2 1.2.3.1.4.1.6-.1l.8-1c.2-.2.4-.2.6-.1l1.9.9c.2.1.4.2.5.3.1.2.1.7-.1 1.3Z" />
              </svg>
              {t.footer.ordersButton}
            </a>

            {/* Solo para clientes con sesión. La descarga además está
                protegida en el servidor (`src/proxy.ts`): esconder el enlace
                nunca es seguridad. */}
            {showPrices && (
              <a href="/api/lista-precios" download className="link-grow pb-0.5 text-sm font-semibold text-white/85 hover:text-white">
                ⬇ {t.footerExtra.downloadList}
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-wiedmer flex flex-col gap-2 py-5 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {company.legalName ?? config.storeName}
            {company.taxId && ` · ${t.footerExtra.taxId} ${company.taxId}`}. {t.footer.rights}
          </p>
          <p>{t.footer.priceDisclaimer}</p>
          <a href="#" className="link-grow w-fit pb-0.5 font-semibold text-white/70 hover:text-white">
            ↑ {t.footerExtra.backToTop}
          </a>
        </div>
      </div>
    </footer>
  );
}
