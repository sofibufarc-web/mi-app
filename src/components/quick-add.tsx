"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ProductImage } from "@/components/product-image";
import { useCart } from "@/components/use-cart";
import { formatPrice } from "@/lib/format";
import { volarAlCarrito } from "@/lib/fly-to-cart";

/**
 * Agregar al pedido DESDE EL LISTADO, sin entrar a la ficha.
 *
 * Hasta ahora el único botón de la tarjeta ("Ver variantes") aparecía al pasar
 * el mouse. En un celular no existe el hover, así que no había forma de agregar
 * sin abrir cada producto. Este componente es el botón que sí funciona con el
 * dedo, y se comporta distinto según el producto:
 *
 * - **Una sola presentación** (un solo código): botón "Agregar". Al tocarlo se
 *   suma 1 y el botón se convierte en un contador − 1 + que habla directo con el
 *   carrito: se puede subir y bajar la cantidad sin salir del listado.
 * - **Varias presentaciones** (colores y/o tamaños): botón "Elegir opciones", que
 *   abre una hoja con el selector. En celular sube desde abajo (como en las apps
 *   de compras); en pantallas grandes es una ventana centrada.
 *
 * ## Muro de precios
 *
 * Este componente solo se dibuja si hay sesión (`ParentCard` lo decide en el
 * servidor), así que los precios que recibe por props nunca viajan a un visitante
 * anónimo.
 *
 * ## Por qué `<dialog>` para la hoja
 *
 * El elemento `<dialog>` abierto con `showModal()` ya trae lo difícil resuelto
 * por el navegador: atrapa el foco adentro, cierra con Escape, tapa lo de atrás y
 * devuelve el foco al botón que lo abrió. Hacerlo a mano con un `<div>` fijo
 * obligaría a reescribir todo eso, y es donde suelen quedar errores de
 * accesibilidad.
 */

export type QuickVariant = {
  id: string;
  sku: string;
  color?: string;
  colorHex?: string;
  sizeLabel?: string;
  image?: string;
  price: number;
  stock?: number | null;
};

/** Textos ya traducidos. Solo los que se usan, para no mandar de más al navegador. */
export type QuickAddLabels = {
  add: string;
  chooseOptions: string;
  inOrder: string;
  close: string;
  pickColor: string;
  pickSize: string;
  code: string;
  addToOrder: string;
  added: string;
  outOfStock: string;
  decrease: string;
  increase: string;
  quantity: string;
};

type ParentLite = { name: string; slug: string; image?: string };

/** Lo que se guarda en el carrito: igual que lo arma la ficha, para que coincidan. */
function itemDe(parent: ParentLite, v: QuickVariant) {
  return {
    productId: v.id,
    sku: v.sku,
    name: [parent.name, v.color, v.sizeLabel].filter(Boolean).join(" · "),
    slug: parent.slug,
    price: v.price,
    image: v.image ?? parent.image,
  };
}

const sinStock = (v: QuickVariant) => v.stock === 0;

/* -------------------------------------------------------------------------- */
/* Contador − n +                                                              */
/* -------------------------------------------------------------------------- */

function Stepper({
  value,
  onChange,
  labels,
  editable = false,
  className = "",
}: {
  value: number;
  onChange: (n: number) => void;
  labels: Pick<QuickAddLabels, "decrease" | "increase" | "quantity">;
  /** Con `editable` el número se puede tipear (hoja); sin él es solo lectura (tarjeta). */
  editable?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-center rounded-lg border border-line bg-card ${className}`}>
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        aria-label={labels.decrease}
        className="h-11 w-11 shrink-0 text-lg text-ink-soft transition active:bg-surface"
      >
        −
      </button>
      {editable ? (
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={value}
          onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))}
          aria-label={labels.quantity}
          className="h-11 w-14 min-w-0 flex-1 border-x border-line bg-transparent text-center font-semibold"
        />
      ) : (
        <span
          role="status"
          aria-label={labels.quantity}
          className="flex h-11 min-w-0 flex-1 items-center justify-center border-x border-line font-semibold tabular-nums"
        >
          {value}
        </span>
      )}
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        aria-label={labels.increase}
        className="h-11 w-11 shrink-0 text-lg text-ink-soft transition active:bg-surface"
      >
        +
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* La hoja para elegir color / tamaño                                          */
/* -------------------------------------------------------------------------- */

function Sheet({
  parent,
  variants,
  labels,
  onClose,
}: {
  parent: ParentLite;
  variants: QuickVariant[];
  labels: QuickAddLabels;
  onClose: () => void;
}) {
  const { items, addItem } = useCart();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fotoRef = useRef<HTMLDivElement>(null);

  // Arranca en la primera presentación que se pueda pedir.
  const inicial = variants.find((v) => !sinStock(v)) ?? variants[0];
  const [sku, setSku] = useState(inicial.sku);
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(false);
  const actual = variants.find((v) => v.sku === sku) ?? inicial;

  // `showModal()` la abre en la "capa superior" del navegador, por encima de
  // todo (incluida la barra de abajo del celular). Mientras está abierta se
  // frena el scroll de la página de atrás.
  useEffect(() => {
    // `showModal()` manda el foco al primer elemento enfocable (el botón de
    // cerrar), que en el celular queda dibujado con un recuadro de foco. Se lo
    // pasamos al <dialog> mismo (`tabIndex={-1}`) para que lectores de pantalla
    // y teclado sigan arrancando adentro de la hoja, pero sin ese recuadro.
    dialogRef.current?.showModal();
    dialogRef.current?.focus();
    const antes = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = antes;
    };
  }, []);

  const colores = useMemo(() => {
    const mapa = new Map<string, string | undefined>();
    for (const v of variants) if (v.color && !mapa.has(v.color)) mapa.set(v.color, v.colorHex);
    return [...mapa].map(([name, hex]) => ({ name, hex }));
  }, [variants]);
  const tamanos = useMemo(() => {
    const vistos: string[] = [];
    for (const v of variants) if (v.sizeLabel && !vistos.includes(v.sizeLabel)) vistos.push(v.sizeLabel);
    return vistos;
  }, [variants]);

  /** Elige una variante conservando, si se puede, la otra dimensión. */
  function elegir(color: string | undefined, size: string | undefined) {
    const cerca =
      variants.find((v) => v.color === color && v.sizeLabel === size) ??
      variants.find((v) => v.color === color) ??
      variants.find((v) => v.sizeLabel === size);
    if (cerca) {
      setSku(cerca.sku);
      setAgregado(false);
    }
  }

  const enPedido = items.find((i) => i.productId === actual.id)?.quantity ?? 0;
  const agotado = sinStock(actual);

  function agregar() {
    if (agotado) return;
    addItem(itemDe(parent, actual), cantidad);
    volarAlCarrito(fotoRef.current);
    setAgregado(true);
    window.setTimeout(() => setAgregado(false), 1400);
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      // Un clic en el fondo oscuro tiene como destino el <dialog> mismo (el
      // contenido lo cubre por completo), así que cierra solo ahí.
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label={parent.name}
      tabIndex={-1}
      className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[88dvh] w-full max-w-none overflow-y-auto rounded-t-2xl border border-line bg-card p-0 text-ink shadow-2xl backdrop:bg-black/55 sm:inset-0 sm:m-auto sm:max-h-[90dvh] sm:max-w-md sm:rounded-2xl"
    >
      <div className="animate-fade-up space-y-5 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] [animation-duration:250ms]">
        <div className="flex items-start gap-3">
          <div
            ref={fotoRef}
            className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-line bg-surface"
          >
            <ProductImage src={actual.image ?? parent.image} alt={parent.name} sizes="80px" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="line-clamp-2 text-base leading-snug font-bold">{parent.name}</h2>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-accent-text">
              {formatPrice(actual.price)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={labels.close}
            className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink-soft transition hover:bg-surface"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {colores.length > 0 && (
          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              {labels.pickColor}: <span className="text-ink">{actual.color}</span>
            </legend>
            <div className="mt-2 flex flex-wrap gap-2.5">
              {colores.map((c) => {
                const elegido = c.name === actual.color;
                const sinExistencia = variants.filter((v) => v.color === c.name).every(sinStock);
                return (
                  <button
                    key={c.name}
                    type="button"
                    title={c.name}
                    aria-label={c.name}
                    aria-pressed={elegido}
                    onClick={() => elegir(c.name, actual.sizeLabel)}
                    className={`relative h-11 w-11 rounded-full border border-black/15 ${
                      elegido ? "ring-2 ring-brand ring-offset-2 ring-offset-card" : ""
                    }`}
                    style={{ background: c.hex ?? "#ccc" }}
                  >
                    {sinExistencia && (
                      <span aria-hidden className="absolute top-1/2 left-1/2 h-0.5 w-[130%] -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-ink/70" />
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {tamanos.length > 0 && (
          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              {labels.pickSize}
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {tamanos.map((s) => {
                const elegido = s === actual.sizeLabel;
                const posible = colores.length === 0 || variants.some((v) => v.color === actual.color && v.sizeLabel === s);
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={elegido}
                    onClick={() => elegir(actual.color, s)}
                    className={`min-h-11 min-w-14 rounded-full border px-4 font-mono text-sm font-semibold transition-colors ${
                      elegido
                        ? "border-brand bg-brand text-on-brand"
                        : posible
                          ? "border-line bg-card active:border-brand"
                          : "border-dashed border-line bg-card text-ink-soft/60"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
          <span>
            {labels.code} <code className="rounded bg-surface px-1.5 py-0.5 font-mono font-semibold text-ink">{actual.sku}</code>
          </span>
          {enPedido > 0 && (
            <span className="font-semibold text-brand">
              {enPedido} {labels.inOrder}
            </span>
          )}
        </p>

        <div className="flex gap-2">
          <Stepper
            editable
            value={cantidad}
            onChange={(n) => setCantidad(Math.max(1, n))}
            labels={labels}
            className="w-36 shrink-0"
          />
          <button
            type="button"
            onClick={agregar}
            disabled={agotado}
            className={`h-11 flex-1 rounded-md px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
              agregado ? "bg-emerald-600 text-white" : "btn-primary"
            }`}
          >
            {agotado ? labels.outOfStock : agregado ? `${labels.added} ✓` : labels.addToOrder}
          </button>
        </div>
      </div>
    </dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* El botón de la tarjeta                                                      */
/* -------------------------------------------------------------------------- */

export function QuickAdd({
  parent,
  variants,
  labels,
}: {
  parent: ParentLite;
  variants: QuickVariant[];
  labels: QuickAddLabels;
}) {
  const { items, addItem, updateQuantity, removeItem } = useCart();
  const [abierta, setAbierta] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);

  /** La foto de la tarjeta, de donde sale la miniatura que vuela al carrito. */
  function fotoDeLaTarjeta() {
    const tarjeta = raiz.current?.closest("article");
    return tarjeta?.querySelector<HTMLElement>("a[aria-label]") ?? tarjeta ?? null;
  }

  const todasAgotadas = variants.every(sinStock);
  const base = "h-11 w-full text-sm";

  if (todasAgotadas) {
    return (
      <button type="button" disabled className={`${base} cursor-not-allowed rounded-md border border-line bg-surface font-semibold text-ink-soft`}>
        {labels.outOfStock}
      </button>
    );
  }

  /* ---- Una sola presentación: agregar directo y contador en la tarjeta ---- */
  if (variants.length === 1) {
    const v = variants[0];
    const cantidad = items.find((i) => i.productId === v.id)?.quantity ?? 0;

    return (
      <div ref={raiz}>
        {cantidad === 0 ? (
          <button
            type="button"
            className={`btn-primary ${base}`}
            onClick={() => {
              addItem(itemDe(parent, v), 1);
              volarAlCarrito(fotoDeLaTarjeta());
            }}
          >
            {labels.add}
          </button>
        ) : (
          <Stepper
            value={cantidad}
            labels={labels}
            // Bajar de 1 saca el producto del carrito.
            onChange={(n) => (n <= 0 ? removeItem(v.id) : updateQuantity(v.id, n))}
          />
        )}
      </div>
    );
  }

  /* ---- Varias presentaciones: se elige en la hoja ---- */
  const enPedido = items
    .filter((i) => variants.some((v) => v.id === i.productId))
    .reduce((suma, i) => suma + i.quantity, 0);

  return (
    <div ref={raiz}>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setAbierta(true)}
        // En la grilla de 2 columnas el botón mide ~147 px en un celular normal:
        // ahí el texto entra en una línea. En uno muy angosto (320 px, ~112 px de
        // botón) no entra, así que se permite partir en dos líneas con letra
        // algo menor en vez de cortarlo.
        className={`btn-secondary ${base} px-2! leading-tight whitespace-normal text-[13px] min-[380px]:text-sm min-[380px]:whitespace-nowrap`}
      >
        {labels.chooseOptions}
        {enPedido > 0 && (
          <span className="ml-2 rounded-full bg-accent px-1.5 py-0.5 text-[11px] leading-none font-bold text-on-accent">
            {enPedido}
          </span>
        )}
      </button>
      {abierta && (
        <Sheet parent={parent} variants={variants} labels={labels} onClose={() => setAbierta(false)} />
      )}
    </div>
  );
}
