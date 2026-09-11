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
- **Datos en Postgres** (Supabase), con el esquema versionado en
  `supabase/migrations/`.

> La documentación completa del proyecto —guía de estilo, arquitectura, modelo
> de datos, decisiones— está en [`CLAUDE.md`](./CLAUDE.md).

## Requisitos

- Node.js 20 o superior (probado con 24)
- npm

## Arrancar

```sh
npm install
cp .env.example .env.local   # completá las credenciales y la URL de la base
npm run db:push              # crea las tablas y carga el catálogo
npm run dev
```

Abrí http://localhost:3000.

`npm run db:push` aplica los archivos de `supabase/migrations/` sobre tu proyecto
de Supabase: la primera migración crea las tablas y la segunda carga las 6
categorías y los 33 productos del catálogo. Para comprobar que quedó bien:
`npm run db:check`.

El CLI de Supabase viene como dependencia de desarrollo, así que `npm install` ya
lo instala. No hace falta Homebrew ni Docker: Docker solo sirve para levantar una
copia local de Supabase, y estos comandos van contra la nube.

## Quién ve qué

| Quién | Qué ve |
| --- | --- |
| **Cualquiera**, sin usuario | Catálogo completo: fotos, nombres, códigos, marcas y descripciones. **Sin precios y sin carrito**: en su lugar aparece un botón para consultar el precio por WhatsApp |
| **Cliente** | Lo anterior más precios, carrito, checkout, descarga de la lista en Excel y contacto directo con un vendedor |
| **Admin** | Lo del cliente más el panel `/admin` |

Los dos entran por el mismo formulario: http://localhost:3000/login

Las cuentas las maneja **Supabase Auth**: esta app no guarda contraseñas ni las
ve nunca. Lo único propio es el rol, que vive en la tabla `profiles`.

En `.env.local` van tres variables, todas obligatorias:

```sh
# La base. Sale de Supabase → Project Settings → Database → Connection
# string → Session pooler. Ojo con el puerto: tiene que ser el 5432. El
# 6543 es el pooler en modo transacción, que se cuelga con este driver
# (el porqué está en CLAUDE.md, sección 3).
DIRECT_URL="postgresql://…:5432/postgres"

# Supabase Auth. Las dos salen de Project Settings → API.
# NEXT_PUBLIC_ significa que viajan al navegador: la clave publishable es
# pública por diseño, y es inofensiva porque todas las tablas tienen Row
# Level Security activo y cero políticas.
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

La clave **secreta** del proyecto no se usa en ningún lado, y es a propósito:
una credencial que no existe no se puede filtrar.

Sin `DIRECT_URL` la app no arranca. Sin las de Supabase el catálogo se ve igual
pero nadie puede entrar, así que nadie ve precios. Es a propósito: es preferible
que se note el olvido a que se le muestre la lista mayorista a todo el mundo.

En Vercel se cargan en *Project Settings → Environment Variables*.

### Crear el primer usuario

Para entrar al panel hay que ser admin, y alguien tiene que crear el primero:

```sh
npm run db:usuario -- tu@email.com admin
```

Pide la contraseña por teclado, sin mostrarla. De ahí en más las cuentas se
administran desde `/admin/usuarios`.

### Panel de administración

Desde el panel se puede:

- **Productos** — listar, buscar, filtrar, crear, editar, borrar y subir imágenes.
- **Categorías** — ABM con slug automático y reasignación de productos al borrar.
- **Lista de precios** — subir un `.xlsx`/`.csv`, revisar la previsualización y
  aplicar la actualización masiva.
- **Configuración** — nombre, WhatsApp, textos y datos de contacto.
- **Usuarios** — crear cuentas, cambiarles el rol, desactivarlas y mandarles el
  link para elegir una contraseña nueva.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Sirve el build |
| `npm run lint` | ESLint |
| `npm run db:push` | Aplica a la nube las migraciones que falten |
| `npm run db:status` | Muestra qué migraciones están aplicadas |
| `npm run db:new -- <nombre>` | Crea un archivo de migración nuevo |
| `npm run db:check` | Conteos, estado de RLS y prueba del buscador |
| `npm run db:usuario -- <email> <rol>` | Crea (o repara) una cuenta desde la terminal |
| `npm run video` | Abre el estudio de Remotion para editar el video del hero |
| `npm run video:render` | Renderiza `public/video/hero-pintura.mp4` |
| `npm run video:poster` | Renderiza `public/video/hero-pintura.jpg` (primer cuadro) |
| `node --env-file=.env.local scripts/generar-plantilla.mjs` | Regenera `public/plantilla-precios.xlsx` desde la base |
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
supabase/migrations/  El esquema de la base, en orden cronológico
src/
  config/site.ts     Credenciales y flags (no se editan desde el panel)
  data/types.ts      El modelo: Product, Category, StoreConfig, CartItem
  lib/db.ts          ★ Conexión a Postgres
  lib/data-source.ts ★ Única capa de acceso a datos. Nadie más escribe SQL.
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

Postgres, alojado en Supabase. Tres tablas —`products`, `categories` y
`store_config`— que son los tres tipos de `src/data/types.ts`.

La app se conecta **directo por Postgres**, no por la API HTTP de Supabase, y
toda lectura y escritura pasa **únicamente** por `src/lib/data-source.ts`. Nadie
más en el proyecto escribe SQL.

El esquema no se toca a mano desde el panel de Supabase: se escribe una migración
en `supabase/migrations/` y se aplica con `npm run db:push`. Las migraciones no
se editan una vez aplicadas; para cambiar algo se agrega una nueva.

> **Sobre la seguridad:** las tres tablas tienen Row Level Security activo y cero
> políticas, o sea que la clave pública de Supabase —la que viaja al navegador—
> no puede leer ni escribir nada. Si pudiera leer `products`, cualquiera podría
> copiarla del inspector y bajarse la lista de precios sin pasar por el login.
> El detalle está en `CLAUDE.md`, sección 3.

## Deploy en Vercel

El proyecto ya está preparado: `vercel.json` fija la región y `.vercelignore`
deja afuera los originales pesados. Lo que falta es hacerlo una vez.

### 1. Antes de subir nada

Aplicá las migraciones contra la base de la nube desde tu máquina:

```sh
npm run db:push
npm run db:check     # conteos, RLS y prueba del buscador
```

Las migraciones **no** se aplican en el build. Que un deploy cambie el esquema
solo es la forma más rápida de romper producción sin enterarse.

### 2. Subir el repositorio

```sh
git push origin main
```

### 3. Crear el proyecto en Vercel

*New Project* → importá el repositorio → en *Environment Variables* cargá las
tres, para los tres entornos (Production, Preview y Development):

| Variable | De dónde sale |
| --- | --- |
| `DIRECT_URL` | Supabase → Project Settings → Database → Connection string → **Session pooler (5432)** |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | La misma pantalla |

Las tres son obligatorias: sin la primera el sitio no levanta, y sin las otras
dos nadie puede iniciar sesión. `DATABASE_URL` (puerto 6543) **no hace falta**:
la app no la usa.

Después, *Deploy*. No hay que tocar el comando de build ni el framework: Vercel
detecta Next.js solo.

### 4. Configurar Supabase para el dominio nuevo

En el panel de Supabase → *Authentication* → *URL Configuration*:

- **Site URL**: la dirección del sitio publicado.
- **Redirect URLs**: agregá `https://<tu-dominio>/actualizar-password`.

Sin eso, el link de "restablecer contraseña" que llega por mail vuelve a
`localhost` y no le sirve a nadie.

### 5. Probar

- Entrá a `/login` con la cuenta de admin.
- Editá un producto y subí una foto: tiene que quedar guardada después de un
  deploy nuevo. Las fotos van a **Supabase Storage**, no al disco del servidor.
- Descargá la lista de precios desde la home.

### Detalles que conviene saber

**La región.** `vercel.json` pone las funciones en `gru1` (São Paulo), que es
donde está la base (`aws-0-sa-east-1`). Por defecto Vercel las pondría en
Washington, y cada consulta cruzaría el continente dos veces. Si algún día
mudás el proyecto de Supabase a otra región, cambiá también este archivo.

**El idioma por país.** La detección por IP **solo funciona en Vercel**: es
Vercel quien agrega el header `x-vercel-ip-country`. En local se usa el idioma
del navegador, y en cualquier caso el selector ES/EN del header manda por
encima.

**El correo.** El servidor de mails que trae Supabase por defecto manda muy
pocos por hora y **solo a integrantes del proyecto**. Para que el link de
restablecer contraseña le llegue a un cliente real hay que configurar un SMTP
propio en Supabase → *Project Settings* → *Authentication* → *SMTP Settings*.

## Pendientes

Ver la sección "Pendientes / próximos pasos" de `CLAUDE.md`.
