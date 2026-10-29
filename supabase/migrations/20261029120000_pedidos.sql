-- ============================================================================
-- Pedidos: el registro de lo que se manda por WhatsApp
--
-- El checkout no cobra nada: arma un mensaje y abre WhatsApp. Hasta ahora ese
-- mensaje era lo único que quedaba del pedido, y vivía en el celular del
-- vendedor. Esta tabla guarda una copia para verla y ordenarla desde el panel.
--
-- ## Qué guarda exactamente
--
-- Una FOTO del pedido en el momento de confirmarlo. Los productos van en una
-- columna `items` (jsonb) con nombre, código, precio y cantidad ESCRITOS ahí,
-- no como referencia a la tabla `products`. Es a propósito: si el mes que viene
-- cambia el precio de un artículo o se borra del catálogo, el pedido de hoy
-- tiene que seguir diciendo lo que se pidió y a cuánto. Con una clave foránea
-- el pedido viejo cambiaría solo de importe.
--
-- `items` tiene la forma:
--   [{ "productId": "p-034", "sku": "36230", "name": "…", "price": 8450, "quantity": 3 }]
--
-- ## El número de pedido
--
-- `id` es una identidad autoincremental: 1, 2, 3… Es el "Pedido N° 0012" que se
-- ve en el mensaje de WhatsApp y en el panel, para poder cruzar uno con el otro.
--
-- ## Estados
--
--   nuevo      llegó y nadie lo miró todavía
--   atendido   ya se contestó / se está preparando
--   cancelado  no se concretó
--
-- Ojo con lo que NO se sabe: el registro se crea cuando el cliente confirma en
-- la web, no cuando aprieta "enviar" dentro de WhatsApp. Si abre el chat y se
-- arrepiente, el pedido figura acá igual. Por eso el estado inicial es
-- "nuevo" y no "recibido": es una señal, no una confirmación.
--
-- Como el resto de las tablas: RLS activo y CERO políticas. La app entra por la
-- conexión directa del dueño de las tablas; las claves públicas del navegador
-- no ven nada (acá hay nombres y direcciones de clientes).
-- ============================================================================

create table public.orders (
  id               bigint generated always as identity primary key,
  created_at       timestamptz not null default now(),

  customer_name    text not null,
  customer_email   text,
  customer_address text,
  customer_note    text,

  items            jsonb not null,
  total            numeric(14, 2) not null check (total >= 0),

  status           text not null default 'nuevo'
                   check (status in ('nuevo', 'atendido', 'cancelado')),

  -- Idioma en el que navegaba el cliente ('es' / 'en'). Solo informativo.
  locale           text
);

-- El panel lista siempre del más nuevo al más viejo.
create index orders_created_at_idx on public.orders (created_at desc);

alter table public.orders enable row level security;
