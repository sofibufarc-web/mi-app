# CLAUDE.md — Tienda Wiedmer

Fuente de verdad del proyecto. Si durante la implementación cambia una decisión,
se actualiza este archivo.

---

## 1. Qué es esta aplicación

E-commerce para **Wiedmer** (https://wiedmer.com.ar/), importador y distribuidor
mayorista de artículos para **pinturerías y ferreterías**, con base en la zona norte
de Rosario (Almafuerte 645) y reparto en Gran Rosario, Santa Fe, norte de Buenos
Aires, Entre Ríos, Córdoba y La Pampa.

**Público:** comercios (pinturerías, ferreterías, corralones) y consumidor final.

**Alcance de esta app:**

| Incluye | No incluye |
| --- | --- |
| Catálogo público de productos y categorías | Pasarela de pagos |
| Carrito persistente en el navegador | Base de datos (por ahora) |
| Checkout que arma un pedido y lo envía por **WhatsApp** | Cuentas de usuario individuales |
| Panel `/admin` protegido por login genérico | Facturación / stock en tiempo real |
| ABM de productos, categorías y config de tienda | Envíos / logística |
| Carga masiva de precios desde Excel | Multi-idioma |

**No se procesan pagos.** El checkout genera un mensaje de texto formateado y abre
WhatsApp (`https://wa.me/<numero>?text=...`) hacia el número de la tienda.

---

## 2. Cómo se tiene que ver (guía de estilo)

Identidad tomada del sitio real. Estilo **sobrio, industrial, mayorista**: mucho
blanco, azul fuerte como único acento, tipografía sans limpia, fichas de producto
compactas y densas (es un catálogo de reposición, no una tienda de moda).

### Paleta

Extraída del CSS de wiedmer.com.ar.

| Token | Hex | Uso |
| --- | --- | --- |
| `brand` | `#113bc2` | Azul principal: botones, links, precios, badges |
| `brand-dark` | `#0d2d94` | Hover de botones, header |
| `brand-darker` | `#07184d` | Footer, fondos oscuros |
| `ink` | `#191919` | Texto principal |
| `ink-soft` | `#5a6475` | Texto secundario, descripciones |
| `line` | `#e8e8e8` | Bordes, separadores |
| `surface` | `#f7f8fa` | Fondo de secciones, cards |
| `white` | `#ffffff` | Fondo base |

En Tailwind v4 estos colores se declaran en `src/app/globals.css` dentro de
`@theme`, lo que genera automáticamente utilidades como `bg-brand`,
`text-ink-soft`, `border-line`.

### Tipografía

- **Libre Franklin** (Google Fonts) — la que usa el sitio real. Se carga con
  `next/font/google` en `src/app/layout.tsx`.
- Fallback: `system-ui, sans-serif`.
- Títulos: peso 700, `tracking-tight`. Cuerpo: 400. Precios: 700.
- El logo es la palabra **WIEDMER** en mayúsculas, sans, peso alto y `tracking`
  amplio. Se reproduce con texto (no hace falta imagen).

### Layout

- **Header** blanco, sticky: logo a la izquierda, buscador al centro, carrito a la
  derecha. Debajo, barra azul (`brand`) con las categorías.
- **Grilla de productos** densa: 2 columnas en mobile, 3 en tablet, 4 en desktop.
- **Ficha de producto** (card): imagen cuadrada con fondo `surface`, nombre en 2
  líneas máximo, SKU chico en gris, precio en azul y grande, botón "Agregar".
- **Footer** azul oscuro (`brand-darker`) con datos de contacto y horarios.
- **Mobile-first**, todo responsive.

### Datos de contacto reales (se usan como valores por defecto)

- Dirección: Almafuerte 645, Rosario, Santa Fe
- Teléfono: (0341) 430-5931
- WhatsApp: 5493416756969
- Horario: Lunes a viernes de 8 a 17 h

---

## 3. Arquitectura

```
mi-app/
├── CLAUDE.md                 ← este archivo
├── README.md                 ← cómo correr y deployar
├── .env.example              ← variables futuras (Supabase), todas opcionales
├── public/
│   ├── uploads/              ← imágenes subidas desde el panel (git las ignora)
│   ├── img/categorias/       ← ilustraciones SVG de categorías
│   └── plantilla-precios.xlsx← plantilla descargable para la carga de precios
├── scripts/
│   ├── generar-plantilla.mjs        ← genera la plantilla .xlsx
│   └── generar-imagenes-categorias.mjs
└── src/
    ├── config/site.ts        ← config estática (credenciales, flags). NO editable desde el panel
    ├── data/
    │   ├── types.ts          ← Product, Category, StoreConfig, Order, CartItem
    │   ├── products.json     ← datos persistidos
    │   ├── categories.json
    │   └── store-config.json
    ├── lib/
    │   ├── data-source.ts    ← ★ ÚNICA capa de acceso a datos
    │   ├── auth.ts           ← token de sesión (Web Crypto, sirve en Edge)
    │   ├── cart-store.ts     ← carrito en localStorage (store externo)
    │   ├── excel.ts          ← parseo y matching del Excel de precios
    │   ├── price-types.ts    ← tipos de la preview (compartidos cliente/servidor)
    │   ├── price-parse.ts    ← interpreta "$ 89.900,50" → 89900.5
    │   ├── whatsapp.ts       ← armado del mensaje de pedido
    │   ├── slug.ts           ← slugify / normalizeText
    │   └── format.ts         ← formato de precios en ARS
    ├── components/           ← UI compartida (header, footer, cards, formularios…)
    ├── proxy.ts              ← protege /admin y /api/admin
    └── app/
        ├── layout.tsx                  ← <html>, fuente, estilos globales
        ├── (tienda)/                   ← route group: catálogo con header y footer
        │   ├── page.tsx                ← home
        │   ├── categoria/[slug]/page.tsx
        │   ├── producto/[slug]/page.tsx
        │   ├── buscar/page.tsx
        │   ├── carrito/page.tsx
        │   └── checkout/{page.tsx,enviado/page.tsx}
        ├── login/page.tsx
        ├── actions/auth.ts             ← Server Actions de login y logout
        ├── admin/
        │   ├── layout.tsx  page.tsx  actions.ts
        │   ├── productos/{page.tsx,nuevo/,[id]/}
        │   ├── categorias/page.tsx
        │   ├── precios/page.tsx
        │   └── configuracion/page.tsx
        └── api/admin/                  ← endpoints del panel
            ├── upload/route.ts
            └── precios/{preview,aplicar}/route.ts
```

### Capa de datos — lo importante

**Toda** lectura y escritura pasa por `src/lib/data-source.ts`. Ningún componente
ni página toca `fs` ni los `.json` directamente. Funciones expuestas:

```ts
getProducts(filtros?)  getProductById(id)  getProductBySlug(slug)
upsertProduct(input)   deleteProduct(id)
getCategories()        getCategoryBySlug(slug)
upsertCategory(input)  deleteCategory(id, opciones)
getStoreConfig()       updateStoreConfig(parcial)
updatePriceList(cambios)
```

**Por qué JSON y no `.ts`:** el panel escribe datos en tiempo de ejecución. Un
archivo `.ts` importado queda cacheado por el bundler y habría que reiniciar el
server para ver los cambios; un `.json` leído con `fs.readFile` en cada request
siempre devuelve el estado actual. Los tipos viven aparte en `data/types.ts`, así
que no se pierde el tipado.

### Migrar a Supabase (pendiente)

Solo se toca `src/lib/data-source.ts`. Cada función tiene un comentario
`// TODO(supabase):` con el reemplazo concreto. Ejemplo:

```ts
// TODO(supabase): reemplazar por
//   const { data } = await supabase.from('products').select('*')
```

El resto de la app no cambia porque nunca importa `fs` ni los JSON.

### Persistencia en Vercel — advertencia

Los route handlers escriben con `fs` en el sistema de archivos. **En local funciona;
en Vercel el filesystem es efímero y de solo lectura fuera de `/tmp`**: los cambios
del panel se pierden en el siguiente deploy o incluso entre invocaciones. Esto se
resuelve al migrar a Supabase (datos) + Supabase Storage o Vercel Blob (imágenes).
Hasta entonces, el deploy en Vercel sirve para mostrar el catálogo, no para
administrarlo.

---

## 4. Modelo de datos

Definido en `src/data/types.ts`.

```ts
type Product = {
  id: string;              // "p-001"
  sku: string;             // código, clave de matching con el Excel
  name: string;
  slug: string;            // autogenerado desde name
  description: string;     // admite varios párrafos (\n\n)
  price: number;           // ARS, sin símbolo
  categoryId: string;      // "" = sin categoría
  brand?: string;
  unit?: string;           // "litro", "unidad", "kg"
  stock?: number | null;
  featured: boolean;       // aparece en la home
  active: boolean;         // false = oculto en el catálogo público
  images: string[];        // paths tipo "/uploads/xxx.jpg"; [0] es la principal
  createdAt: string;       // ISO
  updatedAt: string;       // ISO
};

type Category = {
  id: string;              // "c-001"
  name: string;
  slug: string;            // autogenerado
  description?: string;
  image?: string;
  order: number;           // orden en el menú
};

type StoreConfig = {
  storeName: string;
  logoText: string;
  logoImage?: string;
  whatsappNumber: string;  // solo dígitos, con código de país: 5493416756969
  welcomeTitle: string;
  welcomeText: string;
  contact: { address, phone, email, hours };
  colors: { brand, brandDark, brandDarker };
  requireLoginForCatalog: boolean;  // default false → catálogo público
};

type CartItem   = { productId, sku, name, price, quantity, image? };
type OrderInput = { customer: { name, email?, address?, note? }, items: CartItem[], total: number };
```

`Order` no se persiste: se arma en memoria en el checkout y se convierte en el
mensaje de WhatsApp.

---

## 5. Autenticación

Login **único y genérico**, igual para todos los clientes.

- Credenciales **solo por variables de entorno**: `ADMIN_USER`,
  `ADMIN_PASSWORD` y `SESSION_SECRET`. `src/config/site.ts` las lee sin valor
  por defecto (`process.env.X ?? ""`), porque el repo es público y una
  contraseña escrita en el código quedaría en el historial de git para siempre.
- En local van en `.env.local` (ignorado por git); en Vercel, en *Project
  Settings → Environment Variables*. Plantilla: `.env.example`.
- Si falta alguna de las tres, `adminAuthIsConfigured()` da `false` y el login
  rechaza todo. **El catálogo público sigue funcionando sin `.env.local`**: lo
  único que se deshabilita es el panel. Por eso `expectedSessionToken()`
  devuelve `string | null` en vez de hashear cadenas vacías, que daría un token
  fijo y adivinable.
- `POST /api/auth/login` valida y setea la cookie **httpOnly** `wiedmer_session`
  con un token = SHA-256 de `usuario:contraseña:secreto`. Al no guardar la
  contraseña en la cookie, robarla no revela las credenciales.
- `src/proxy.ts` corre antes de resolver la página: si la cookie no coincide con
  el token esperado, redirige a `/login?next=<ruta>`. Protege `/admin/*` y
  también `/api/admin/*` (ahí devuelve `401` en JSON en vez de redirigir, porque
  un `fetch` no sabe qué hacer con una página de login).
  > Nombre: en Next 16 el archivo se llama `proxy.ts` y exporta `proxy()`. Hasta
  > Next 15 era `middleware.ts` / `middleware()`. Es exactamente lo mismo; si
  > leés un tutorial que dice "middleware", habla de este archivo.
- `POST /api/auth/logout` borra la cookie. El botón "Cerrar sesión" está en el
  header del panel.
- El token se calcula con **Web Crypto** (`crypto.subtle`), que funciona tanto en
  el runtime Edge del middleware como en Node.

**Flag de catálogo privado:** `requireLoginForCatalog` en `src/config/site.ts`.
Default `false` (catálogo público). En `true`, el proxy protege también el
catálogo.

Las credenciales se leen en `src/config/site.ts` y no en `store-config.json`
porque el proxy corre en el runtime Edge, donde no existe `fs`: no puede leer un
archivo JSON. Las variables de entorno sí llegan al Edge.
`store-config.json` queda para lo que sí se edita desde el panel.

---

## 6. Carga de lista de precios por Excel

Pantalla: `/admin/precios`.

### Formato esperado

| Columna | Obligatoria | Notas |
| --- | --- | --- |
| `codigo` | Sí | SKU. Es la **clave de matching** |
| `precio` | Sí | Numérico. Acepta `$ 1.234,56` y `1234.56` |
| `nombre` | No | Solo se usa si se crean productos nuevos |
| `categoria` | No | Nombre o slug de categoría, para productos nuevos |

Headers **tolerantes**: se normalizan a minúsculas, sin tildes, sin espacios ni
guiones. Aceptan sinónimos: `codigo` ≈ `código`/`sku`/`cod`/`articulo`;
`precio` ≈ `precio unitario`/`p. lista`/`importe`; `nombre` ≈ `descripcion`/`detalle`.

### Flujo

1. El usuario sube `.xlsx` / `.xls` / `.csv` a `POST /api/precios/preview`.
2. El servidor parsea con SheetJS y devuelve una **previsualización** clasificada:
   - **A actualizar**: SKU encontrado y precio distinto (muestra viejo → nuevo y el %).
   - **Sin cambios**: SKU encontrado, mismo precio.
   - **Nuevos**: SKU no existe en el sistema. Checkbox para crearlos.
   - **Con error**: precio no numérico, código vacío, filas duplicadas.
   - **No presentes en el archivo**: productos del sistema que el Excel no menciona
     (no se tocan; solo informativo).
3. Nada se guarda todavía. El usuario revisa y confirma.
4. `POST /api/precios/aplicar` recibe las filas confirmadas y llama a
   `updatePriceList()`, que persiste.

### Errores manejados

Archivo vacío o corrupto · extensión no soportada · archivo > 5 MB · faltan
columnas obligatorias · hoja sin filas · precio no numérico o negativo · código
repetido dentro del archivo.

Plantilla descargable: `/plantilla-precios.xlsx` (se regenera con
`node scripts/generar-plantilla.mjs`).

---

## 7. Checkout por WhatsApp

El número destino sale de `store-config.json` → `whatsappNumber` (solo dígitos,
con código de país y el `9` de Argentina: `5493416756969`). Se edita desde
`/admin/configuracion`.

Formato del mensaje (`src/lib/whatsapp.ts`):

```
*NUEVO PEDIDO — WIEDMER*

*Cliente:* Juan Pérez
*Email:* juan@mail.com
*Dirección:* San Martín 1234, Rosario

*Productos:*
1. Látex Interior Recuplast 20 L
   Cód. SIN-1020 · 2 x $ 89.900,00 = $ 179.800,00
2. Rodillo Lana Natural 22 cm
   Cód. ACC-2201 · 3 x $ 8.450,00 = $ 25.350,00

*TOTAL: $ 205.150,00*

_Nota:_ Entregar por la mañana
```

Se codifica con `encodeURIComponent` y se abre `https://wa.me/<numero>?text=<msg>`
en una pestaña nueva. Después se redirige a `/checkout/enviado` y **se vacía el
carrito**.

El carrito vive en `localStorage` (clave `wiedmer_cart_v1`). La fuente de verdad
es un store externo (`src/lib/cart-store.ts`) al que los componentes se conectan
con `useSyncExternalStore` a través del hook `useCart()`
(`src/components/use-cart.ts`). No hay Context ni provider: el store es un
módulo. Además de ser el patrón que recomienda React 19 para estado que vive
fuera de React, mantiene el carrito sincronizado entre pestañas.

---

## 8. Cómo correr el proyecto

```sh
npm install
cp .env.example .env.local   # completar ADMIN_USER / ADMIN_PASSWORD / SESSION_SECRET
npm run dev                  # http://localhost:3000
```

Panel: http://localhost:3000/login, con las credenciales de `.env.local`.
Para el `SESSION_SECRET`: `openssl rand -hex 32`.

El catálogo arranca sin `.env.local`; solo el panel lo necesita.

### Deploy en Vercel

1. Subir el repo a GitHub.
2. En Vercel: *New Project* → importar el repo → cargar `ADMIN_USER`,
   `ADMIN_PASSWORD` y `SESSION_SECRET` en *Environment Variables* → *Deploy*.
   Sin ellas el sitio funciona pero no se puede entrar al panel.
3. Recordar la limitación de la sección 3: las escrituras del panel no persisten
   en Vercel hasta migrar a Supabase.

---

## 9. Pendientes / próximos pasos

1. **Supabase** — reemplazar el cuerpo de `src/lib/data-source.ts` (tablas
   `products`, `categories`, `store_config`). Todos los puntos están marcados con
   `// TODO(supabase):`.
2. **Imágenes** — mover `public/uploads/` a Supabase Storage o Vercel Blob.
3. ~~**Credenciales**~~ — hecho: ya no hay valores por defecto en el código,
   van por variables de entorno. Falta cargarlas en Vercel al deployar.
4. **Persistencia de pedidos** — hoy el pedido solo viaja por WhatsApp; guardarlo
   en una tabla `orders` para tener historial.
5. **Precios mayorista/minorista** — el sitio real es mayorista; evaluar lista
   doble de precios según si el cliente está logueado.
6. Imágenes reales de producto (hoy hay un placeholder con la marca).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
