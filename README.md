# Tienda Wiedmer

E-commerce para **Wiedmer**, distribuidor mayorista de artículos de pinturería y
ferretería (Rosario). Catálogo público con carrito, panel de administración y
checkout que envía el pedido por **WhatsApp**. No procesa pagos.

- **Muro de precios**: sin usuario se ve todo el catálogo pero no los precios.
- **Home institucional** sin productos: hero animado, carrusel de placas, la
  empresa, cómo se compra y las categorías.
- **Lista de precios descargable** en Excel, solo para clientes con sesión.
- **Botón flotante de WhatsApp** en todas las páginas de la tienda.
- **Modo día / modo noche**, con la opción de seguir al sistema operativo.
- **Español e inglés**, detectados por el país de la IP (en producción) o por el
  idioma del navegador (en local).

> La documentación completa del proyecto —guía de estilo, arquitectura, modelo
> de datos, decisiones— está en [`CLAUDE.md`](./CLAUDE.md).

## Requisitos

- Node.js 20 o superior (probado con 24)
- npm

## Arrancar

```sh
npm install
cp .env.example .env.local   # completá las credenciales
npm run dev
```

Abrí http://localhost:3000.

## Quién ve qué

| Quién | Qué ve |
| --- | --- |
| **Cualquiera**, sin usuario | Catálogo completo: fotos, nombres, códigos, marcas y descripciones. **Sin precios y sin carrito**: en su lugar aparece un botón para consultar el precio por WhatsApp |
| **Cliente** | Lo anterior más precios, carrito, checkout, descarga de la lista en Excel y contacto directo con un vendedor |
| **Admin** | Lo del cliente más el panel `/admin` |

Los dos entran por el mismo formulario: http://localhost:3000/login

Las credenciales **no están en el código**: se definen en `.env.local`, que git
ignora. Elegí las que quieras:

```sh
# Login de clientes: destraba los precios
CLIENT_USER=cliente
CLIENT_PASSWORD=una-contraseña-para-los-comercios

# Login del panel
ADMIN_USER=wiedmer
ADMIN_PASSWORD=otra-contraseña-tuya

SESSION_SECRET=              # openssl rand -hex 32
```

Si falta alguna variable de un rol, ese login rechaza cualquier intento (no
queda nada abierto por accidente). Si no configurás ninguna, el catálogo
funciona igual pero **nadie ve precios** — es a propósito: es preferible que se
note el olvido a que se le muestre la lista mayorista a todo el mundo.

En Vercel se cargan en *Project Settings → Environment Variables*.

### Panel de administración

> **Por qué no van en el código:** este repositorio es público. Una contraseña
> escrita en un archivo `.ts` queda visible para cualquiera y, aunque después la
> borres, **sigue estando en el historial de git**. Por eso viven fuera del repo.

Desde el panel se puede:

- **Productos** — listar, buscar, filtrar, crear, editar, borrar y subir imágenes.
- **Categorías** — ABM con slug automático y reasignación de productos al borrar.
- **Lista de precios** — subir un `.xlsx`/`.csv`, revisar la previsualización y
  aplicar la actualización masiva.
- **Configuración** — nombre, WhatsApp, textos y datos de contacto.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Sirve el build |
| `npm run lint` | ESLint |
| `npm run video` | Abre el estudio de Remotion para editar el video del hero |
| `npm run video:render` | Renderiza `public/video/hero-pintura.mp4` |
| `npm run video:poster` | Renderiza `public/video/hero-pintura.jpg` (primer cuadro) |
| `node scripts/generar-plantilla.mjs` | Regenera `public/plantilla-precios.xlsx` |
| `node scripts/optimizar-imagenes-categorias.mjs` | Convierte las fotos de `imagenes/` a WebP en `public/img/categorias/` |
| `node scripts/generar-imagenes-categorias.mjs` | Regenera los SVG de respaldo de categorías (ya no se usan) |

## El video del hero

En `remotion/` vive una animación hecha con [Remotion](https://remotion.dev):
la pintura cayendo de la lata a la bandeja, en plano fijo. El resultado ya está
renderizado en `public/video/hero-pintura.mp4` (1,1 MB, 1920×1080, 6 s, en
bucle perfecto y sin audio), así que **para levantar el sitio no hace falta
renderizar nada**.

Para tocarla:

```sh
npm run video          # estudio con previsualización en vivo
npm run video:render   # vuelve a generar el .mp4
```

El detalle de cómo está armada está en `CLAUDE.md`, sección "El video del hero".

> Remotion es gratis para personas y empresas de hasta 3 personas; más grande,
> pide licencia. El sitio publicado no ejecuta Remotion: sólo sirve el `.mp4`.

## Estructura rápida

```
src/
  config/site.ts     Credenciales y flags (no se editan desde el panel)
  data/              types.ts + los .json con productos, categorías y config
  lib/data-source.ts ★ Única capa de acceso a datos. Acá se migra a Supabase.
  lib/excel.ts       Parseo del Excel de precios
  lib/i18n.ts        Diccionarios español / inglés
  lib/locale.ts      Detección de idioma (país de IP, navegador, cookie)
  lib/request-context.ts  "¿Quién mira la página y en qué idioma?"
  components/wiedmer-logo.tsx  Logo SVG de la empresa
  components/story-carousel.tsx  Carrusel animado de la home
  components/whatsapp-fab.tsx    Botón flotante de WhatsApp
  app/api/lista-precios/         Genera la lista de precios en Excel
  proxy.ts           Idioma + protege /admin, /api/admin, /carrito, /checkout y /api/lista-precios
  app/(tienda)/      Catálogo público, carrito y checkout
  app/admin/         Panel
  app/api/admin/     Endpoints del panel (uploads, precios)
```

## Datos

No hay base de datos. Todo vive en archivos JSON dentro de `src/data/`, y se lee
y escribe **únicamente** desde `src/lib/data-source.ts`. Ese archivo tiene
comentarios `// TODO(supabase):` en cada función con el reemplazo concreto para
la migración.

## Deploy en Vercel

1. Subí el repo a GitHub.
2. En Vercel: *New Project* → importá el repo → cargá `CLIENT_USER`,
   `CLIENT_PASSWORD`, `ADMIN_USER`, `ADMIN_PASSWORD` y `SESSION_SECRET` en
   *Environment Variables* → *Deploy*.

> La detección de idioma por país de IP **solo funciona en Vercel**: es Vercel
> quien agrega el header `x-vercel-ip-country`. En local se usa el idioma del
> navegador, y en cualquier caso el selector ES/EN del header manda por encima.

> ⚠️ **Limitación conocida:** el panel escribe en el sistema de archivos, que en
> Vercel es efímero. El catálogo se ve perfecto, pero los cambios hechos desde
> `/admin` en producción no persisten. Se resuelve al migrar a Supabase (ver
> `CLAUDE.md`, sección 9).

## Pendientes

Ver la sección "Pendientes / próximos pasos" de `CLAUDE.md`.
