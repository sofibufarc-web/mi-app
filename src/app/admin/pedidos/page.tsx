import Link from "next/link";

import { OrderStatusButtons } from "@/components/order-status-buttons";
import type { Order, OrderStatus } from "@/data/types";
import { countOrdersByStatus, getOrders } from "@/lib/data-source";
import { formatOrderNumber, formatPrice } from "@/lib/format";

export const metadata = { title: "Pedidos" };

/**
 * Pedidos que los clientes armaron en el checkout y mandaron por WhatsApp.
 *
 * Ojo con qué significa "pedido" acá: el registro se crea cuando el cliente
 * confirma en la web, justo antes de que se abra WhatsApp. No hay forma de saber
 * si después apretó "enviar" dentro de WhatsApp. Por eso el estado inicial es
 * "nuevo": avisa que hay algo para mirar, y el mensaje que llegó al celular de
 * ventas (con el mismo número de pedido) es la confirmación.
 */

const TABS: Array<{ value: OrderStatus | "todos"; label: string }> = [
  { value: "nuevo", label: "Nuevos" },
  { value: "atendido", label: "Atendidos" },
  { value: "cancelado", label: "Cancelados" },
  { value: "todos", label: "Todos" },
];

const ETIQUETA: Record<OrderStatus, { text: string; className: string }> = {
  nuevo: { text: "Nuevo", className: "bg-accent/15 text-accent-text" },
  atendido: { text: "Atendido", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  cancelado: { text: "Cancelado", className: "bg-surface text-ink-soft" },
};

// Hora de Argentina fija, sin depender de dónde corra el servidor (Vercel está
// en UTC, y un pedido de las 17:30 se vería a las 20:30).
const formatoFecha = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

function Pedido({ order }: { order: Order }) {
  const { customer, items } = order;
  const unidades = items.reduce((suma, l) => suma + l.quantity, 0);
  const etiqueta = ETIQUETA[order.status];

  return (
    <details className="group rounded-xl border border-line bg-card open:shadow-sm">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 p-4 [&::-webkit-details-marker]:hidden">
        <span className="font-mono text-sm font-bold text-brand">
          #{formatOrderNumber(order.id)}
        </span>
        <span className="min-w-0 flex-1 truncate font-semibold">{customer.name}</span>
        <span className="text-xs text-ink-soft">{formatoFecha.format(new Date(order.createdAt))}</span>
        <span className="text-sm font-bold">{formatPrice(order.total)}</span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${etiqueta.className}`}>
          {etiqueta.text}
        </span>
        <span aria-hidden className="text-ink-soft transition group-open:rotate-180">
          ▾
        </span>
      </summary>

      <div className="space-y-5 border-t border-line p-4">
        <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          {customer.email && (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Email</dt>
              <dd>
                <a href={`mailto:${customer.email}`} className="text-brand hover:underline">
                  {customer.email}
                </a>
              </dd>
            </div>
          )}
          {customer.address && (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Dirección</dt>
              <dd>{customer.address}</dd>
            </div>
          )}
          {customer.note && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Nota</dt>
              <dd className="whitespace-pre-line">{customer.note}</dd>
            </div>
          )}
        </dl>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-ink-soft">
              <tr className="border-b border-line">
                <th className="py-2 pr-3 font-semibold">Cód.</th>
                <th className="py-2 pr-3 font-semibold">Producto</th>
                <th className="py-2 pr-3 text-right font-semibold">Cant.</th>
                <th className="py-2 pr-3 text-right font-semibold">Precio</th>
                <th className="py-2 text-right font-semibold">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((linea) => (
                <tr key={linea.productId} className="border-b border-line/60 last:border-0">
                  <td className="py-2 pr-3 font-mono text-xs">{linea.sku}</td>
                  <td className="py-2 pr-3">{linea.name}</td>
                  <td className="py-2 pr-3 text-right">{linea.quantity}</td>
                  <td className="py-2 pr-3 text-right whitespace-nowrap">{formatPrice(linea.price)}</td>
                  <td className="py-2 text-right font-medium whitespace-nowrap">
                    {formatPrice(linea.price * linea.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line">
                <td colSpan={2} className="pt-3 text-xs text-ink-soft">
                  {items.length} {items.length === 1 ? "producto" : "productos"} · {unidades}{" "}
                  {unidades === 1 ? "unidad" : "unidades"}
                </td>
                <td colSpan={2} className="pt-3 text-right font-bold">Total</td>
                <td className="pt-3 text-right font-bold text-brand whitespace-nowrap">
                  {formatPrice(order.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <OrderStatusButtons id={order.id} status={order.status} />
      </div>
    </details>
  );
}

export default async function AdminPedidosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const pedido = Array.isArray(query.estado) ? query.estado[0] : query.estado;
  const filtro: OrderStatus | "todos" =
    pedido === "atendido" || pedido === "cancelado" || pedido === "todos" ? pedido : "nuevo";

  const [orders, conteo] = await Promise.all([
    getOrders({ status: filtro === "todos" ? undefined : filtro }),
    countOrdersByStatus(),
  ]);
  const total = conteo.nuevo + conteo.atendido + conteo.cancelado;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pedidos</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Los pedidos que los clientes confirman en la tienda. Cada uno llega también
          a WhatsApp con el mismo número. Se registran al confirmar en la web, antes de
          que el cliente apriete «enviar» en WhatsApp.
        </p>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b border-line" aria-label="Estado">
        {TABS.map((tab) => {
          const n = tab.value === "todos" ? total : conteo[tab.value];
          const activa = tab.value === filtro;
          return (
            <Link
              key={tab.value}
              href={tab.value === "nuevo" ? "/admin/pedidos" : `/admin/pedidos?estado=${tab.value}`}
              aria-current={activa ? "page" : undefined}
              className={`-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition ${
                activa
                  ? "border-brand text-brand"
                  : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              {tab.label} <span className="text-xs text-ink-soft">({n})</span>
            </Link>
          );
        })}
      </nav>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-card p-10 text-center text-sm text-ink-soft">
          {total === 0
            ? "Todavía no hay pedidos. Aparecen acá en cuanto un cliente confirme uno en la tienda."
            : "No hay pedidos en este estado."}
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Pedido key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
