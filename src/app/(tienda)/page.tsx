import { About } from "@/components/home/about";
import { BrandsStrip } from "@/components/home/brands-strip";
import { CategoryBento } from "@/components/home/category-bento";
import { Differentials } from "@/components/home/differentials";
import { FinalCta } from "@/components/home/final-cta";
import { Hero } from "@/components/home/hero";
import { StatsStrip } from "@/components/home/stats-strip";
import { HowToBuy } from "@/components/how-to-buy";
import { Reveal } from "@/components/reveal";
import { StoreMap } from "@/components/store-map";
import { siteConfig } from "@/config/site";
import { countProducts, getCategories, getCategoryStats, getStoreConfig } from "@/lib/data-source";
import { getViewer } from "@/lib/request-context";
import { normalizeWhatsappNumber } from "@/lib/whatsapp";

/**
 * Home: PORTADA INSTITUCIONAL. No lista ni un producto; los artículos viven en
 * `/categoria/<slug>` y se llega por las tarjetas de categoría.
 *
 * Orden (rediseño visual): hero → cifras → marcas → diferenciales → categorías
 * → la empresa (con mapa de cobertura) → mapa del depósito → cómo se compra →
 * llamado final. Cada bloque es un componente en `src/components/home/`.
 *
 * Server Component `async`: pide los datos en el servidor. Sin sesión no hay
 * ningún precio en esta página, así que no hay nada que filtrar acá; los
 * botones que solo existen para clientes (hablar con un vendedor) se eligen
 * con `showPrices` y no se renderizan para el anónimo.
 */
export default async function HomePage() {
  const [config, categories, stats, totalProductos, viewer] = await Promise.all([
    getStoreConfig(),
    getCategories(),
    getCategoryStats(),
    countProducts({ onlyActive: true }),
    getViewer(),
  ]);
  const { t, showPrices, locale } = viewer;
  const { company } = siteConfig;

  const whatsappUrl = `https://wa.me/${normalizeWhatsappNumber(config.whatsappNumber)}`;
  const counts = new Map([...stats].map(([id, s]) => [id, s.count]));

  // De la home salen las hijas (cuelgan de su madre) y «Sin sección», que son
  // los productos sin clasificar y no un rubro que alguien busque.
  const destacadas = categories.filter((c) => !c.parentId && c.slug !== "sin-seccion");

  return (
    <>
      <Hero t={t} showPrices={showPrices} whatsappUrl={whatsappUrl} />

      <StatsStrip
        t={t}
        products={totalProductos}
        zones={t.about.coverage.length}
        foundedYear={company.foundedYear}
        locale={locale === "en" ? "en-US" : "es-AR"}
      />

      <BrandsStrip title={t.homeNew.brandsTitle} />

      {/* Los diferenciales suben justo después de las cifras. */}
      <Differentials
        t={t}
        productsLabel={`+${(Math.floor(totalProductos / 100) * 100).toLocaleString(locale === "en" ? "en-US" : "es-AR")}`}
      />

      <CategoryBento categories={destacadas} counts={counts} t={t} />

      <About
        t={t}
        config={config}
        foundedYear={company.foundedYear}
        warehousePhoto={company.warehousePhoto}
      />

      {/* Mapa del depósito. Sin <Reveal>: el mapa trae su propio JavaScript y
          un bloque invisible de entrada dejaría un hueco si algo fallara. */}
      <section className="container-wiedmer py-16 sm:py-20">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent-text">{t.storeMap.eyebrow}</p>
        <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{t.storeMap.title}</h2>
        <div className="mt-8">
          <StoreMap
            storeName={config.storeName}
            address={config.contact.address}
            phone={config.contact.phone}
            hours={config.contact.hours}
            t={t.storeMap}
          />
        </div>
      </section>

      <section className="border-y border-line bg-surface py-16 sm:py-20">
        <div className="container-wiedmer">
          <Reveal>
            <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{t.about.howTitle}</h2>
          </Reveal>
          <HowToBuy steps={t.about.steps} mock={t.homeNew.mock} />
        </div>
      </section>

      <FinalCta t={t} whatsappUrl={whatsappUrl} phone={config.contact.phone} seller={company.seller} />
    </>
  );
}
