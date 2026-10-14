"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, ViewTransition } from "react";

import { ProductImage } from "@/components/product-image";
import { useCart } from "@/components/use-cart";
import { formatPrice } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { buildInquiryMessage, buildWhatsappUrl } from "@/lib/whatsapp";

/**
 * Lo que el navegador sabe de cada variante.
 *
 * `price` es OPCIONAL a propósito: para un visitante sin sesión el servidor ni
 * lo manda (muro de precios). Este componente nunca tiene un precio que mostrar
 * si el servidor no se lo dio.
 */
export type VariantLite = {
  id: string;
  sku: string;
  color?: string;
  colorHex?: string;
  sizeLabel?: string;
  image?: string;
  price?: number;
  stock?: number | null;
};

type Props = {
  parent: {
    id: string;
    name: string;
    slug: string;
    brand?: string;
    usage?: "interior" | "exterior" | "ambos";
    images: string[];
  };
  variants: VariantLite[];
  initialSku: string;
  showPrices: boolean;
  whatsappNumber: string;
  t: Dictionary;
};

/** Litros de un tamaño como "1/4 lt" o "20 lt"; null si no es un volumen. */
function litros(size?: string): number | null {
  const m = size?.match(/^(\d+(?:\.\d+)?)(?:\/(\d+))?\s*lt$/);
  if (!m) return null;
  return m[2] ? Number(m[1]) / Number(m[2]) : Number(m[1]);
}

const reduceMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Número que "gira" hasta el nuevo valor en 450 ms (sin animación si se pidió reducir). */
function useRollingNumber(target: number): number {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (reduceMotion() || from.current === target) {
      from.current = target;
      setValue(target);
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / 450);
      const eased = 1 - Math.pow(1 - k, 3);
      setValue(origin + (target - origin) * eased);
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return value;
}

/** Miniatura que vuela desde la foto hasta el ícono del carrito. */
function volarAlCarrito(origen: HTMLElement | null) {
  if (!origen || reduceMotion()) return;
  const destino = document.querySelector<HTMLElement>("[data-cart-target]");
  if (!destino) return;
  const a = origen.getBoundingClientRect();
  const b = destino.getBoundingClientRect();
  const clon = document.createElement("div");
  Object.assign(clon.style, {
    position: "fixed",
    left: `${a.left + a.width / 2 - 28}px`,
    top: `${a.top + a.height / 2 - 28}px`,
    width: "56px",
    height: "56px",
    borderRadius: "12px",
    zIndex: "9999",
    pointerEvents: "none",
    background: "var(--color-card)",
    border: "1px solid var(--color-line)",
    boxShadow: "0 8px 24px rgb(0 0 0 / 0.2)",
    backgroundSize: "contain",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
  });
  const img = origen.querySelector("img");
  if (img?.currentSrc) clon.style.backgroundImage = `url("${img.currentSrc}")`;
  document.body.appendChild(clon);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const anim = clon.animate(
    [
      { transform: "translate(0,0) scale(1)", opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.2)`, opacity: 0.4 },
    ],
    { duration: 650, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
  );
  anim.onfinish = () => clon.remove();
}

type Estado = "idle" | "loading" | "done";

export function VariantPicker({ parent, variants, initialSku, showPrices, whatsappNumber, t }: Props) {
  const v = t.variants;
  const { addItem } = useCart();

  const inicial = variants.find((x) => x.sku === initialSku) ?? variants[0];
  const [sku, setSku] = useState(inicial.sku);
  const actual = variants.find((x) => x.sku === sku) ?? inicial;

  const [cantidad, setCantidad] = useState(1);
  const [estado, setEstado] = useState<Estado>("idle");
  const [copiado, setCopiado] = useState(false);
  const [fotoActiva, setFotoActiva] = useState(0);
  const [origen, setOrigen] = useState("50% 50%");
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const fotoRef = useRef<HTMLDivElement>(null);
  const tamanosRef = useRef<HTMLDivElement>(null);
  const [indicador, setIndicador] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const colores = useMemo(() => {
    const mapa = new Map<string, { name: string; hex?: string }>();
    for (const x of variants) if (x.color && !mapa.has(x.color)) mapa.set(x.color, { name: x.color, hex: x.colorHex });
    return [...mapa.values()];
  }, [variants]);
  const tamanos = useMemo(() => {
    const vistos: string[] = [];
    for (const x of variants) if (x.sizeLabel && !vistos.includes(x.sizeLabel)) vistos.push(x.sizeLabel);
    return vistos;
  }, [variants]);

  // Mide el botón de tamaño elegido para que el indicador azul se deslice hasta él.
  useLayoutEffect(() => {
    const medir = () => {
      const cont = tamanosRef.current;
      const boton = cont?.querySelector<HTMLElement>('[aria-pressed="true"]');
      if (!cont || !boton) return setIndicador(null);
      setIndicador({ x: boton.offsetLeft, y: boton.offsetTop, w: boton.offsetWidth, h: boton.offsetHeight });
    };
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [actual.sku, tamanos.length]);

  // La URL queda con el código elegido (?codigo=36230): se puede copiar y mandar.
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("codigo", actual.sku);
    window.history.replaceState(null, "", url);
  }, [actual.sku]);

  /** Elige una variante conservando, si se puede, la otra dimensión. */
  function elegir(color: string | undefined, size: string | undefined) {
    const exacta = variants.find((x) => x.color === color && x.sizeLabel === size);
    const aprox =
      exacta ??
      variants.find((x) => x.color === color) ??
      variants.find((x) => x.sizeLabel === size);
    if (aprox) setSku(aprox.sku);
  }

  const existe = (color?: string, size?: string) =>
    variants.some((x) => x.color === color && x.sizeLabel === size);
  const sinStock = (x: VariantLite) => x.stock === 0;

  const fotos = useMemo(() => {
    const lista = [...parent.images];
    if (actual.image && !lista.includes(actual.image)) lista.unshift(actual.image);
    return lista;
  }, [parent.images, actual.image]);
  // Al cambiar de variante con foto propia, la galería vuelve a la primera.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFotoActiva(0);
  }, [actual.sku]);
  const foto = fotos[fotoActiva] ?? fotos[0];

  const precio = useRollingNumber(actual.price ?? 0);
  const l = litros(actual.sizeLabel);
  const nombreCarrito = [parent.name, actual.color, actual.sizeLabel].filter(Boolean).join(" · ");

  function agregar() {
    if (estado !== "idle" || actual.price === undefined) return;
    setEstado("loading");
    window.setTimeout(() => {
      addItem(
        {
          productId: actual.id,
          sku: actual.sku,
          name: nombreCarrito,
          slug: parent.slug,
          price: actual.price!,
          image: foto,
        },
        cantidad,
      );
      volarAlCarrito(fotoRef.current);
      setEstado("done");
      window.setTimeout(() => setEstado("idle"), 1400);
    }, 350);
  }

  function agregarSeleccion() {
    let alguno = false;
    for (const x of variants) {
      const q = cantidades[x.sku] ?? 0;
      if (q > 0 && x.price !== undefined) {
        addItem(
          {
            productId: x.id,
            sku: x.sku,
            name: [parent.name, x.color, x.sizeLabel].filter(Boolean).join(" · "),
            slug: parent.slug,
            price: x.price,
            image: x.image ?? parent.images[0],
          },
          q,
        );
        alguno = true;
      }
    }
    if (alguno) {
      volarAlCarrito(fotoRef.current);
      setCantidades({});
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(actual.sku);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1600);
    } catch {
      /* el portapapeles puede estar bloqueado: no es grave */
    }
  }

  const consultaUrl = buildWhatsappUrl(
    whatsappNumber,
    buildInquiryMessage({
      intro: t.gate.inquiryMessage,
      productName: nombreCarrito,
      sku: actual.sku,
    }),
  );

  const usoTexto =
    parent.usage === "interior" ? v.interior : parent.usage === "exterior" ? v.exterior : parent.usage ? v.both : null;

  const disponible = !sinStock(actual);
  const botonTexto =
    estado === "loading" ? (
      <>
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
        {v.adding}
      </>
    ) : estado === "done" ? (
      <>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
          <path d="M5 12.5l4.5 4.5L19 7" className="check-draw" />
        </svg>
        {v.addedToOrder}
      </>
    ) : (
      <>
        {v.addToOrder} <span className="btn-arrow">→</span>
      </>
    );

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* ------------------------------ Izquierda: foto ------------------------------ */}
      <div>
        <div
          ref={fotoRef}
          className="relative aspect-square cursor-zoom-in overflow-hidden rounded-xl border border-line bg-surface"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setOrigen(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
          }}
          onMouseLeave={() => setOrigen("50% 50%")}
        >
          <ViewTransition name={`prod-${parent.id}`} share="morph" default="none">
            {/* key: al cambiar de foto el elemento se remonta y entra con fundido */}
            <div
              key={foto ?? "sin-foto"}
              className="animate-fade-in absolute inset-0 transition-transform duration-300 ease-out hover:scale-[1.8]"
              style={{ transformOrigin: origen }}
            >
              <ProductImage src={foto} alt={nombreCarrito} sizes="(min-width: 1024px) 40vw, 100vw" priority />
            </div>
          </ViewTransition>
        </div>

        {fotos.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {fotos.map((f, i) => (
              <button
                key={f}
                type="button"
                onClick={() => setFotoActiva(i)}
                aria-label={`Ver imagen ${i + 1}`}
                aria-current={i === fotoActiva}
                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded border bg-surface transition ${
                  i === fotoActiva ? "border-brand ring-1 ring-brand" : "border-line hover:border-brand/40"
                }`}
              >
                <ProductImage src={f} alt="" sizes="64px" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------ Derecha: compra ------------------------------ */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          {parent.brand && (
            <span className="text-xs font-bold uppercase tracking-wide text-brand">{parent.brand}</span>
          )}
          {usoTexto && (
            <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
              {usoTexto}
            </span>
          )}
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{parent.name}</h1>

        {colores.length > 0 && (
          <fieldset className="mt-6">
            <legend className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              {v.pickColor}: <span className="text-ink">{actual.color}</span>
            </legend>
            <div className="mt-2 flex flex-wrap gap-2.5">
              {colores.map((c) => {
                const elegido = c.name === actual.color;
                const agotado = variants.filter((x) => x.color === c.name).every(sinStock);
                return (
                  <button
                    key={c.name}
                    type="button"
                    title={c.name}
                    aria-label={c.name}
                    aria-pressed={elegido}
                    onClick={() => elegir(c.name, actual.sizeLabel)}
                    className={`relative h-11 w-11 rounded-full border border-black/15 transition-transform duration-200 hover:scale-110 ${
                      elegido ? "ring-2 ring-brand ring-offset-2 ring-offset-page" : ""
                    }`}
                    style={{ background: c.hex ?? "#ccc" }}
                  >
                    {agotado && (
                      <span aria-hidden className="absolute left-1/2 top-1/2 h-0.5 w-[130%] -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-ink/70" />
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {tamanos.length > 0 && (
          <fieldset className="mt-5">
            <legend className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{v.pickSize}</legend>
            <div ref={tamanosRef} className="relative mt-2 flex flex-wrap gap-2">
              {indicador && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-0 top-0 rounded-full bg-brand transition-[transform,width,height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{ width: indicador.w, height: indicador.h, transform: `translate(${indicador.x}px, ${indicador.y}px)` }}
                />
              )}
              {tamanos.map((s) => {
                const elegido = s === actual.sizeLabel;
                const posible = colores.length === 0 || existe(actual.color, s);
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={elegido}
                    onClick={() => elegir(actual.color, s)}
                    className={`relative min-h-11 min-w-14 rounded-full border px-4 font-mono text-sm font-semibold transition-colors duration-200 ${
                      elegido
                        ? "border-brand text-on-brand"
                        : posible
                          ? "border-line bg-card hover:border-brand"
                          : "border-dashed border-line bg-card text-ink-soft/60 hover:border-brand"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <div className="mt-6 flex items-center gap-2 text-sm">
          <span className="text-ink-soft">{v.code}</span>
          <code className="rounded bg-surface px-2 py-1 font-mono text-sm font-semibold">{actual.sku}</code>
          <button
            type="button"
            onClick={copiar}
            className="inline-flex min-h-8 items-center gap-1 rounded border border-line px-2 text-xs font-medium text-ink-soft transition hover:border-brand hover:text-brand"
          >
            {copiado ? (
              <>
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
                  <path d="M5 12.5l4.5 4.5L19 7" className="check-draw" />
                </svg>
                {v.copied}
              </>
            ) : (
              v.copy
            )}
          </button>
        </div>

        <div className="mt-5">
          {showPrices && actual.price !== undefined ? (
            <>
              <p className="font-display text-4xl font-bold tabular-nums text-accent-text">{formatPrice(precio)}</p>
              <p className="mt-1 text-xs text-ink-soft">
                {l && l >= 0.25 && (
                  <>
                    {formatPrice(actual.price / l)} {v.perLiter} ·{" "}
                  </>
                )}
                {t.product.priceNote}
              </p>
            </>
          ) : (
            <p className="flex items-center gap-2 text-base font-semibold text-ink-soft">
              <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
                <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
              </svg>
              {t.gate.priceHidden}
            </p>
          )}
        </div>

        <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-2 font-medium">
            <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${disponible ? "bg-emerald-500" : "bg-accent"}`} />
            {disponible ? v.available : v.consult}
          </span>
          <span className="text-ink-soft">{v.nextDelivery}</span>
        </p>

        {showPrices ? (
          <div className="mt-6 flex max-w-md gap-2">
            <div className="flex items-center rounded-lg border border-line bg-card">
              <button
                type="button"
                onClick={() => setCantidad((q) => Math.max(1, q - 1))}
                aria-label={t.product.decreaseAria}
                className="h-12 w-12 text-lg text-ink-soft transition hover:bg-surface"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                value={cantidad}
                onChange={(e) => setCantidad(Math.max(1, Number(e.target.value) || 1))}
                aria-label={t.product.quantityAria}
                className="h-12 w-14 border-x border-line bg-transparent text-center font-semibold"
              />
              <button
                type="button"
                onClick={() => setCantidad((q) => q + 1)}
                aria-label={t.product.increaseAria}
                className="h-12 w-12 text-lg text-ink-soft transition hover:bg-surface"
              >
                +
              </button>
            </div>
            <button type="button" onClick={agregar} disabled={estado === "loading"} className="btn-primary h-12 flex-1">
              {botonTexto}
            </button>
          </div>
        ) : (
          <div className="mt-6 max-w-md space-y-3">
            <a
              href={consultaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 w-full items-center justify-center rounded-lg bg-[#25D366] text-sm font-semibold text-white transition hover:brightness-95"
            >
              {t.gate.askByWhatsapp}
            </a>
            <Link
              href={`/login?next=${encodeURIComponent(`/producto/${parent.slug}?codigo=${actual.sku}`)}`}
              className="btn-secondary h-12 w-full text-sm"
            >
              {t.gate.unlock}
            </Link>
          </div>
        )}
      </div>

      {/* --------------------------- Tabla de presentaciones --------------------------- */}
      {variants.length > 1 && (
        <section className="lg:col-span-2">
          <h2 className="text-sm font-bold uppercase tracking-wide">{v.presentationsTable}</h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-card">
            <table className="w-full min-w-[34rem] text-sm">
              <thead className="bg-surface text-left text-xs uppercase tracking-wide text-ink-soft">
                <tr>
                  <th className="px-3 py-2">{v.tableSize}</th>
                  {colores.length > 0 && <th className="px-3 py-2">{v.tableColor}</th>}
                  <th className="px-3 py-2">{v.tableCode}</th>
                  {showPrices && <th className="px-3 py-2 text-right">{v.tablePrice}</th>}
                  {showPrices && <th className="px-3 py-2 text-right">{v.tableQty}</th>}
                </tr>
              </thead>
              <tbody>
                {variants.map((x) => (
                  <tr
                    key={x.sku}
                    onClick={() => setSku(x.sku)}
                    className={`cursor-pointer border-t border-line transition-colors hover:bg-surface ${
                      x.sku === actual.sku ? "bg-brand-soft" : ""
                    }`}
                  >
                    <td className="px-3 py-2 font-mono">{x.sizeLabel ?? "—"}</td>
                    {colores.length > 0 && (
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-2">
                          <span aria-hidden className="h-3.5 w-3.5 rounded-full border border-black/15" style={{ background: x.colorHex ?? "#ccc" }} />
                          {x.color ?? "—"}
                        </span>
                      </td>
                    )}
                    <td className="px-3 py-2 font-mono">{x.sku}</td>
                    {showPrices && (
                      <td className="px-3 py-2 text-right font-semibold tabular-nums text-accent-text">
                        {x.price !== undefined ? formatPrice(x.price) : ""}
                      </td>
                    )}
                    {showPrices && (
                      <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="number"
                          min={0}
                          value={cantidades[x.sku] ?? ""}
                          placeholder="0"
                          aria-label={`${v.tableQty} ${x.sku}`}
                          onChange={(e) =>
                            setCantidades((c) => ({ ...c, [x.sku]: Math.max(0, Number(e.target.value) || 0) }))
                          }
                          className="h-9 w-16 rounded border border-line bg-transparent text-center"
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {showPrices && (
            <button
              type="button"
              onClick={agregarSeleccion}
              disabled={!Object.values(cantidades).some((q) => q > 0)}
              className="btn-primary mt-3 h-11"
            >
              {v.addSelected} <span className="btn-arrow">→</span>
            </button>
          )}
        </section>
      )}

      {/* ------------------- Barra de compra fija (solo celular) ------------------- */}
      {showPrices && actual.price !== undefined && (
        <div className="fixed inset-x-0 bottom-14 z-30 flex items-center gap-3 border-t border-line bg-card/95 px-4 py-2 backdrop-blur lg:hidden">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-ink-soft">{[actual.color, actual.sizeLabel].filter(Boolean).join(" · ")}</p>
            <p className="font-display text-xl font-bold tabular-nums text-accent-text">{formatPrice(precio)}</p>
          </div>
          <button type="button" onClick={agregar} disabled={estado === "loading"} className="btn-primary h-12 min-w-40">
            {botonTexto}
          </button>
        </div>
      )}
    </div>
  );
}
