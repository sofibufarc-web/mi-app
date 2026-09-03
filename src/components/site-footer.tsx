import Link from "next/link";

import { WiedmerLogo } from "@/components/wiedmer-logo";
import { getCategories, getStoreConfig } from "@/lib/data-source";
import { getT } from "@/lib/request-context";
import { normalizeWhatsappNumber } from "@/lib/whatsapp";

export async function SiteFooter() {
  const [config, categories, t] = await Promise.all([
    getStoreConfig(),
    getCategories(),
    getT(),
  ]);
  const year = new Date().getFullYear();

  return (
    /*
      El footer usa `brand-darker`, que es azul muy oscuro en modo día y casi
      negro en modo noche. En los dos casos el texto va en blanco, así que acá
      sí escribimos `text-white` fijo en vez de un token.
    */
    <footer className="mt-20 bg-brand-darker text-white">
      <div className="container-wiedmer grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <WiedmerLogo size="md" className="text-white" />
          <p className="mt-4 text-sm leading-relaxed text-white/65">
            {t.footer.tagline}
          </p>
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide">
            {t.common.categories}
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-white/65">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/categoria/${category.slug}`}
                  className="inline-block transition hover:translate-x-1 hover:text-white"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide">
            {t.footer.contact}
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-white/65">
            <li>{config.contact.address}</li>
            <li>Tel. {config.contact.phone}</li>
            <li>
              <a
                href={`mailto:${config.contact.email}`}
                className="transition hover:text-white"
              >
                {config.contact.email}
              </a>
            </li>
            <li>{config.contact.hours}</li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide">
            {t.footer.orders}
          </h2>
          <p className="mt-4 text-sm text-white/65">{t.footer.ordersText}</p>
          <a
            href={`https://wa.me/${normalizeWhatsappNumber(config.whatsappNumber)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-brand-darker transition hover:-translate-y-0.5 hover:bg-white/90"
          >
            <svg aria-hidden viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2Zm5.4 14c-.2.6-1.2 1.2-1.7 1.2-.4 0-1 .1-3.3-.9-2.8-1.2-4.5-4-4.7-4.2-.1-.2-1-1.4-1-2.6s.6-1.8.9-2c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.3.3c-.1.2-.3.3-.1.6.1.3.7 1.2 1.5 1.9 1 .9 1.8 1.1 2 1.2.3.1.4.1.6-.1l.8-1c.2-.2.4-.2.6-.1l1.9.9c.2.1.4.2.5.3.1.2.1.7-.1 1.3Z" />
            </svg>
            {t.footer.ordersButton}
          </a>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-wiedmer flex flex-col gap-2 py-5 text-xs text-white/45 sm:flex-row sm:justify-between">
          <p>
            © {year} {config.storeName}. {t.footer.rights}
          </p>
          <p>{t.footer.priceDisclaimer}</p>
        </div>
      </div>
    </footer>
  );
}
