import Image from "next/image";
import Link from "next/link";

import { ColorSimulator } from "@/components/color-simulator";
import { HeroCanvas } from "@/components/hero-canvas";
import { PriceGateBanner } from "@/components/price-gate";
import { Reveal } from "@/components/reveal";
import { StoreMap } from "@/components/store-map";
import { WiedmerMark } from "@/components/wiedmer-logo";
import { getCategories, getStoreConfig } from "@/lib/data-source";
import { getViewer } from "@/lib/request-context";
import { normalizeWhatsappNumber } from "@/lib/whatsapp";

/**
 * Home.
 *
 * Server Component `async`: pide los datos en el servidor y manda al navegador
 * el HTML ya armado. No hay spinners ni fetch desde el cliente.
 *
 * Es una PORTADA INSTITUCIONAL: cuenta qué es Wiedmer y a dónde ir. **No lista
 * ni un producto.** Los artículos viven en las páginas de categoría, y se llega
 * a ellas por las fichas de más abajo.
 *
 * Lo que se ve depende de si el visitante inició sesión:
 *
 * | Bloque                      | Sin sesión | Con sesión |
 * | --------------------------- | ---------- | ---------- |
 * | Catálogo por categorías     | sí         | sí         |
 * | Descargar lista de precios  | no         | sí         |
 * | Hablar con un vendedor      | no         | sí         |
 * | Precios                     | no         | sí         |
 *
 * El botón flotante de WhatsApp es aparte y lo ve cualquiera: está en el
 * layout de la tienda, no acá.
 */
export default async function HomePage() {
  const [config, categories, viewer] = await Promise.all([
    getStoreConfig(),
    getCategories(),
    getViewer(),
  ]);
  const { t, showPrices } = viewer;

  const whatsappUrl = `https://wa.me/${normalizeWhatsappNumber(config.whatsappNumber)}`;

  return (
    <>
      {/* ================= HERO ================= */}
      {/*
        Hero partido en dos columnas y más alto que antes:

        - IZQUIERDA: la foto. En reposo está quieta; al pasar el mouse hace un
          acercamiento lento y una banda de color de marca la recorre en
          diagonal. Es un adorno de escritorio: en el celular no hay "pasar el
          mouse", así que ahí se ve la foto fija, que es lo correcto.
        - DERECHA: el texto sobre un panel azul oscuro (`brand-darker`), el
          mismo azul del pie de página. Separar el texto de la foto lo hace más
          legible que encimarlo, y de paso el título "Distribuidora Wiedmer"
          pega más fuerte sobre un fondo plano.

        En el celular las dos columnas se apilan (foto arriba, texto abajo)
        porque `lg:grid-cols-2` solo divide en pantallas grandes.

        `min-h` y no `h`: fija un piso pero deja crecer, para que el texto nunca
        se corte en una pantalla angosta.
      */}
      <section className="relative isolate grid min-h-[32rem] overflow-hidden bg-brand-darker text-white lg:min-h-[36rem] lg:grid-cols-2">
        {/*
          `group` en el contenedor de la foto es lo que engancha el hover: las
          clases `group-hover:` de la imagen y de la banda reaccionan cuando el
          mouse entra en CUALQUIER parte de este bloque, no solo sobre el pixel
          justo debajo del cursor.
        */}
        <div className="group relative min-h-[18rem] overflow-hidden lg:min-h-full">
          <Image
            src="/img/hero.webp"
            alt=""
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            // `priority` = cargala antes que nada. Es lo primero que se ve al
            // entrar; sin esto el hero aparece oscuro por un instante.
            priority
            // El zoom: la foto crece de 1 a 1.1 en 700 ms al pasar el mouse.
            // `motion-reduce:transform-none` lo anula para quien pidió menos
            // movimiento (mareos), sin sacar la foto.
            className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110 motion-reduce:transform-none"
          />

          {/* Velo suave: liga la foto con el azul de la marca. */}
          <div className="absolute inset-0 bg-brand-darker/25" />

          {/*
            La "pasada de color": una banda diagonal de azul de marca que en
            reposo está escondida a la izquierda (`-translate-x-full`) y al pasar
            el mouse cruza hacia la derecha (`group-hover:translate-x-full`).
            `pointer-events-none` para que no robe el hover; `motion-reduce:hidden`
            para que directamente no exista si se pidió menos movimiento.
          */}
          <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-tr from-transparent via-brand/50 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full motion-reduce:hidden" />
        </div>

        {/* DERECHA: el texto. */}
        <div className="relative flex items-center px-6 py-16 sm:px-10 lg:px-14">
          <div className="max-w-xl">
            <p className="animate-fade-up text-xs font-bold uppercase tracking-[0.3em] text-sky-300">
              {t.hero.eyebrow}
            </p>

            <h1 className="mt-4 animate-fade-up text-4xl font-bold leading-[1.05] tracking-tight [animation-delay:120ms] sm:text-5xl lg:text-6xl">
              {t.hero.title}{" "}
              <span className="bg-gradient-to-r from-sky-300 to-white bg-clip-text text-transparent">
                {t.hero.titleAccent}
              </span>
            </h1>

            <p className="mt-4 animate-fade-up text-sm leading-relaxed text-white/75 [animation-delay:240ms] sm:text-base">
              {t.hero.subtitle}
            </p>

            <div className="mt-7 flex animate-fade-up flex-wrap gap-3 [animation-delay:360ms]">
              <Link
                href="#categorias"
                className="rounded-md bg-white px-6 py-3 text-sm font-bold text-black transition hover:-translate-y-0.5 hover:bg-white/90 hover:shadow-xl hover:shadow-black/40"
              >
                {t.hero.ctaPrimary}
              </Link>

              {/* "Hablar con un vendedor" solo para quien tiene sesión: es el
                  canal comercial. El resto tiene el botón flotante de WhatsApp
                  para consultas generales. */}
              {showPrices && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-white/35 px-6 py-3 text-sm font-bold transition hover:-translate-y-0.5 hover:border-white/70 hover:bg-white/10"
                >
                  {t.hero.ctaSecondary}
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ================= ACCESOS ================= */}
      <section id="accesos" className="container-wiedmer py-20">
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand">
            {t.actions.eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            {t.actions.title}
          </h2>
        </Reveal>

        <div
          className={`mt-10 grid gap-5 ${
            showPrices ? "md:grid-cols-3" : "md:grid-cols-2"
          }`}
        >
          <Reveal className="h-full">
            <ActionCard
              href="#categorias"
              title={t.actions.catalog.title}
              text={t.actions.catalog.text}
              cta={t.actions.catalog.cta}
              icon="grid"
            />
          </Reveal>

          {/*
            Los dos accesos que exigen sesión. No se renderizan siquiera para el
            visitante anónimo: no están escondidos con CSS, no existen en el
            HTML. Y la descarga además está protegida del lado del servidor por
            `src/proxy.ts`, porque esconder un botón nunca es seguridad.
          */}
          {showPrices && (
            <>
              <Reveal delay={90} className="h-full">
                <ActionCard
                  href="/api/lista-precios"
                  title={t.actions.priceList.title}
                  text={t.actions.priceList.text}
                  cta={t.actions.priceList.cta}
                  note={t.actions.priceList.note}
                  icon="download"
                  // `download` le pide al navegador que lo baje en vez de
                  // navegar. El servidor además manda la cabecera
                  // Content-Disposition, así que funciona igual sin esto.
                  download
                />
              </Reveal>

              <Reveal delay={180} className="h-full">
                <ActionCard
                  href={whatsappUrl}
                  title={t.actions.seller.title}
                  text={t.actions.seller.text}
                  cta={t.actions.seller.cta}
                  icon="chat"
                  external
                  accent
                />
              </Reveal>
            </>
          )}

          {/* Sin sesión, el segundo lugar lo ocupa la explicación de cómo
              conseguir acceso. Es más útil que un botón deshabilitado. */}
          {!showPrices && (
            <Reveal delay={90} className="h-full">
              <PriceGateBanner t={t} />
            </Reveal>
          )}
        </div>
      </section>

      {/* ================= CATEGORÍAS ================= */}
      <section id="categorias" className="container-wiedmer py-20">
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand">
            {t.homeCategories.eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            {t.homeCategories.title}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
            {t.homeCategories.subtitle}
          </p>
        </Reveal>

        {/*
          En el celular van en DOS columnas, no en una sola tira. Una grilla de
          fichas con foto se lee como un catálogo y "se destaca"; una columna
          larga se lee como una lista y se scrollea sin mirar. `grid-cols-2` es
          el piso; en tablet siguen dos y en escritorio pasan a tres.
        */}
        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {categories.map((category, index) => (
            <Reveal key={category.id} delay={(index % 3) * 90} className="h-full">
              {/*
                Recuadro de categoría: la foto ocupa todo y el nombre va ENCIMA.

                El degradado de abajo hacia arriba es lo que hace legible el
                texto blanco sobre cualquier foto, clara u oscura. Al pasar el
                mouse la foto se acerca, el degradado se intensifica y aparece
                la descripción, que en reposo está plegada. Es información que
                suma cuando la buscás y no estorba cuando no.
              */}
              <Link
                href={`/categoria/${category.slug}`}
                className="group relative block h-full overflow-hidden rounded-2xl border border-line transition duration-300 hover:-translate-y-1 hover:border-brand/50 hover:shadow-2xl hover:shadow-brand/15"
              >
                <div className="relative aspect-[4/3]">
                  <Image
                    src={category.image ?? ""}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 32vw, 47vw"
                    className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110"
                  />

                  {/* Velo de marca: liga las seis fotos entre sí y con el azul
                      del sitio. Se intensifica en el hover. */}
                  <div className="absolute inset-0 bg-brand-darker/15 transition-colors duration-500 group-hover:bg-brand-darker/30" />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-darker via-brand-darker/45 to-transparent" />

                  <div className="absolute inset-x-0 bottom-0 p-3 sm:p-5">
                    <h3 className="text-base font-bold leading-tight tracking-tight text-white drop-shadow-sm sm:text-lg lg:text-xl">
                      {category.name}
                    </h3>

                    {/*
                      La descripción crece de alto 0 a su alto natural.
                      `grid-rows-[0fr] → [1fr]` es el truco para animar hasta
                      "lo que mida el contenido", que con `height: auto` no se
                      puede animar.
                    */}
                    {category.description && (
                      <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:grid-rows-[1fr]">
                        <div className="overflow-hidden">
                          <p className="pt-2 text-sm leading-relaxed text-white/75">
                            {category.description}
                          </p>
                        </div>
                      </div>
                    )}

                    <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-sky-300 sm:mt-3 sm:text-sm">
                      {t.homeCategories.seeProducts}
                      <svg
                        aria-hidden
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5"
                      >
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </span>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ================= SIMULADOR DE COLOR ================= */}
      {/*
        Va DESPUÉS de las categorías, no antes. El visitante que llega a un
        mayorista viene a buscar un rubro; primero se le da eso y recién después
        el simulador, que además lo devuelve al catálogo por su propio botón.
        Arriba se comería el lugar de lo que la gente vino a hacer.

        Lo ve cualquiera, con o sin sesión: no muestra ni un precio.
      */}
      <section className="border-y border-line bg-surface py-20">
        <div className="container-wiedmer">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand">
              {t.simulator.eyebrow}
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              {t.simulator.title}
            </h2>
            <p className="mt-3 max-w-2xl text-ink-soft">{t.simulator.subtitle}</p>
          </Reveal>

          {/*
            La tarjeta NO va envuelta en <Reveal>, a diferencia del resto de la
            home. `Reveal` arranca en `opacity: 0` y destapa por JavaScript
            cuando el elemento entra en pantalla. Para un texto es una mejora:
            si algo falla, se ve igual apenas un poco más tarde. Para un bloque
            con botones, si el observer no dispara no queda "sin animar": queda
            un agujero en blanco donde debería haber controles. Un elemento
            interactivo no se esconde por defecto.
          */}
          <div className="mt-10">
            <ColorSimulator t={t.simulator} />
          </div>
        </div>
      </section>

      {/* ================= LA EMPRESA ================= */}
      <section className="container-wiedmer py-20">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand">
              {t.about.eyebrow}
            </p>
            <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              {t.about.title}
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-ink">{t.about.lead}</p>
            <div className="mt-5 space-y-4 text-sm leading-relaxed text-ink-soft">
              {t.about.paragraphs.map((parrafo) => (
                <p key={parrafo}>{parrafo}</p>
              ))}
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="rounded-2xl border border-line bg-surface p-7">
              <h3 className="text-sm font-bold uppercase tracking-wide">
                {t.about.coverageTitle}
              </h3>
              <ul className="mt-5 space-y-3">
                {t.about.coverage.map((zona) => (
                  <li key={zona} className="flex items-center gap-3 text-sm">
                    <span
                      aria-hidden
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-3 w-3"
                      >
                        <path d="m5 13 4 4L19 7" />
                      </svg>
                    </span>
                    {zona}
                  </li>
                ))}
              </ul>

              <div className="mt-7 border-t border-line pt-6 text-sm text-ink-soft">
                <p className="font-semibold text-ink">{config.contact.address}</p>
                <p className="mt-1">Tel. {config.contact.phone}</p>
                <p>{config.contact.hours}</p>
              </div>
            </div>
          </Reveal>
        </div>

        {/* --- Mapa del local --- */}
        {/*
          El mapa NO va envuelto en <Reveal>. `Reveal` arranca invisible y se
          destapa por JavaScript al entrar en pantalla; para un texto es una
          mejora inofensiva, pero un mapa que ya trae su propio JavaScript no
          conviene esconderlo de entrada. Si algo fallara, quedaría un hueco en
          blanco en vez del mapa.
        */}
        <div className="mt-20">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand">
            {t.storeMap.eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            {t.storeMap.title}
          </h2>
          <div className="mt-8">
            <StoreMap
              storeName={config.storeName}
              address={config.contact.address}
              phone={config.contact.phone}
              hours={config.contact.hours}
              t={t.storeMap}
            />
          </div>
        </div>

        {/* --- Por qué Wiedmer --- */}
        <div className="mt-20 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {t.homeWhy.items.map((item, index) => (
            <Reveal key={item.title} delay={index * 90} className="h-full">
              <article className="h-full rounded-2xl border border-line bg-card p-6 transition duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <WhyIcon index={index} />
                </span>
                <h3 className="mt-5 font-bold tracking-tight">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {item.text}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ================= CÓMO SE COMPRA ================= */}
      <section className="border-y border-line bg-surface py-20">
        <div className="container-wiedmer">
          <Reveal>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t.about.howTitle}
            </h2>
          </Reveal>

          <ol className="mt-12 grid gap-5 md:grid-cols-3">
            {t.about.steps.map((paso, index) => (
              <Reveal key={paso.title} delay={index * 120} as="li" className="h-full">
                {/*
                  El número ya no es una marca de agua detrás del título: es una
                  ficha propia, arriba de todo y separada por una línea. Se lee
                  como "paso 1, paso 2, paso 3" en vez de como decoración.

                  `group` en el contenedor es lo que permite que al pasar el
                  mouse por CUALQUIER parte de la ficha reaccionen también los
                  hijos (`group-hover:`), no solo el elemento que está debajo
                  del cursor.
                */}
                <div className="group h-full rounded-2xl border border-line bg-card p-7 transition duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-xl hover:shadow-brand/10">
                  <div className="flex items-center gap-4">
                    <span
                      aria-hidden
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-xl font-bold text-brand transition duration-300 group-hover:scale-110 group-hover:bg-brand group-hover:text-on-brand"
                    >
                      {index + 1}
                    </span>
                    {/* La rayita crece de 24 px a 40 px en el hover: es el
                        detalle que hace que la ficha "responda" sin moverse. */}
                    <span
                      aria-hidden
                      className="h-px w-6 bg-line transition-all duration-300 group-hover:w-10 group-hover:bg-brand/50"
                    />
                  </div>

                  <h3 className="mt-6 text-lg font-bold tracking-tight transition-colors duration-300 group-hover:text-brand">
                    {paso.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    {paso.text}
                  </p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ================= CIERRE ================= */}
      <section className="container-wiedmer pb-4">
        <Reveal>
          <div className="relative isolate overflow-hidden rounded-3xl bg-brand-darker px-8 py-20 text-center text-white sm:px-14">
            {/* La animación de pintura que antes hacía de fondo del hero. Acá
                tiene sentido: es un bloque de color plano y el movimiento lento
                lo levanta sin competirle a nada. */}
            <HeroCanvas className="absolute inset-0 h-full w-full opacity-70" />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-darker via-brand-darker/60 to-brand-darker/80" />

            <WiedmerMark className="pointer-events-none absolute -bottom-16 -right-10 h-64 w-auto select-none text-white/[0.05]" />

            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
                {t.homeCta.title}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/70">
                {t.homeCta.subtitle}
              </p>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-9 inline-flex items-center gap-2 rounded-md bg-[#25D366] px-8 py-4 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:brightness-105 hover:shadow-xl hover:shadow-black/25"
              >
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5"
                >
                  <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2Zm5.4 14c-.2.6-1.2 1.2-1.7 1.2-.4 0-1 .1-3.3-.9-2.8-1.2-4.5-4-4.7-4.2-.1-.2-1-1.4-1-2.6s.6-1.8.9-2c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.3.3c-.1.2-.3.3-.1.6.1.3.7 1.2 1.5 1.9 1 .9 1.8 1.1 2 1.2.3.1.4.1.6-.1l.8-1c.2-.2.4-.2.6-.1l1.9.9c.2.1.4.2.5.3.1.2.1.7-.1 1.3Z" />
                </svg>
                {t.homeCta.button}
              </a>

              <p className="mt-4 text-xs text-white/50">{t.homeCta.hours}</p>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Tarjeta de acceso rápido.
 *
 * Sirve para los tres casos —navegar, descargar y abrir WhatsApp— porque los
 * tres son, en el fondo, un link. Cambian el icono y a dónde apuntan.
 */
function ActionCard({
  href,
  title,
  text,
  cta,
  note,
  icon,
  external = false,
  download = false,
  accent = false,
}: {
  href: string;
  title: string;
  text: string;
  cta: string;
  note?: string;
  icon: "grid" | "download" | "chat";
  external?: boolean;
  download?: boolean;
  accent?: boolean;
}) {
  const contenido = (
    <>
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${
          accent ? "bg-[#25D366]/15 text-[#128C7E]" : "bg-brand-soft text-brand"
        }`}
      >
        <ActionIcon name={icon} />
      </span>

      <h3 className="mt-5 text-lg font-bold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{text}</p>
      {note && <p className="mt-1 text-xs text-ink-soft/70">{note}</p>}

      <span
        className={`mt-5 inline-flex items-center gap-1.5 text-sm font-semibold ${
          accent ? "text-[#128C7E]" : "text-brand"
        }`}
      >
        {cta}
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
        >
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
    </>
  );

  const clases =
    "group flex h-full flex-col rounded-2xl border border-line bg-card p-7 transition duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-xl hover:shadow-brand/10";

  // Un ancla común para lo externo y la descarga; Link de Next solo para
  // navegación interna, que es donde aporta (precarga y transición sin recargar).
  if (external || download) {
    return (
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        {...(download ? { download: "" } : {})}
        className={clases}
      >
        {contenido}
      </a>
    );
  }

  return (
    <Link href={href} className={clases}>
      {contenido}
    </Link>
  );
}

function ActionIcon({ name }: { name: "grid" | "download" | "chat" }) {
  const paths = {
    grid: "M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z",
    download: "M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2",
    chat: "M21 11.5a8.4 8.4 0 0 1-9 8.4 8.9 8.9 0 0 1-3.6-.7L3 21l1.9-5a8.4 8.4 0 0 1 3.7-11.4 8.4 8.4 0 0 1 12.4 6.9Z",
  };

  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d={paths[name]} />
    </svg>
  );
}

/**
 * Los cuatro iconos de "por qué Wiedmer", en el mismo orden que los textos del
 * diccionario. Están dibujados a mano (son cuatro trazos) en vez de traer una
 * librería de iconos entera: 1 KB contra unos cuantos cientos.
 */
function WhyIcon({ index }: { index: number }) {
  const paths = [
    // Importación directa: un barco / contenedor
    "M3 17h18l-2 4H5l-2-4Zm3-2V8l6-4 6 4v7",
    // Reparto propio: un camión
    "M3 16V6h11v10M14 10h4l3 3v3h-7M6.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm11 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
    // Stock real: cajas apiladas
    "M4 8h7v6H4V8Zm9 0h7v6h-7V8ZM8.5 14h7v6h-7v-6Z",
    // Lista actualizada: un documento con una flecha
    "M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9l-6-6Zm0 0v6h6M9 14l2.5 2.5L16 12",
  ];

  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d={paths[index] ?? paths[0]} />
    </svg>
  );
}
