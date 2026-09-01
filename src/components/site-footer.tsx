import Link from "next/link";

import { getCategories, getStoreConfig } from "@/lib/data-source";
import { normalizeWhatsappNumber } from "@/lib/whatsapp";

export async function SiteFooter() {
  const [config, categories] = await Promise.all([getStoreConfig(), getCategories()]);
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 bg-brand-darker text-white">
      <div className="container-wiedmer grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xl font-bold tracking-[0.18em]">{config.logoText}</p>
          <p className="mt-3 text-sm leading-relaxed text-white/70">
            {config.welcomeTitle}
          </p>
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide">Categorías</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-white/70">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/categoria/${category.slug}`}
                  className="transition hover:text-white"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide">Contacto</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-white/70">
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
          <h2 className="text-sm font-bold uppercase tracking-wide">Pedidos</h2>
          <p className="mt-3 text-sm text-white/70">
            Armá tu pedido en el carrito y lo recibimos por WhatsApp.
          </p>
          <a
            href={`https://wa.me/${normalizeWhatsappNumber(config.whatsappNumber)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block rounded-md bg-white px-4 py-2 text-sm font-semibold text-brand-darker transition hover:bg-white/90"
          >
            Escribinos por WhatsApp
          </a>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-wiedmer flex flex-col gap-2 py-4 text-xs text-white/50 sm:flex-row sm:justify-between">
          <p>
            © {year} {config.storeName}. Todos los derechos reservados.
          </p>
          <p>Los precios no incluyen IVA y pueden variar sin previo aviso.</p>
        </div>
      </div>
    </footer>
  );
}
