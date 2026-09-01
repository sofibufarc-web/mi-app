# Tienda Wiedmer

E-commerce para **Wiedmer**, distribuidor mayorista de artículos de pinturería y
ferretería (Rosario). Catálogo público con carrito, panel de administración y
checkout que envía el pedido por **WhatsApp**. No procesa pagos.

> La documentación completa del proyecto —guía de estilo, arquitectura, modelo
> de datos, decisiones— está en [`CLAUDE.md`](./CLAUDE.md).

## Requisitos

- Node.js 20 o superior (probado con 24)
- npm

## Arrancar

```sh
npm install
cp .env.example .env.local   # completá las credenciales del panel
npm run dev
```

Abrí http://localhost:3000.

El **catálogo funciona sin `.env.local`**. Lo único que lo necesita es el panel
de administración.

### Panel de administración

http://localhost:3000/login

Las credenciales **no están en el código**: se definen en `.env.local`, que git
ignora. Elegí las que quieras:

```sh
ADMIN_USER=wiedmer
ADMIN_PASSWORD=una-contraseña-tuya
SESSION_SECRET=              # openssl rand -hex 32
```

Si falta alguna de las tres, el login rechaza cualquier intento (no queda el
panel abierto por accidente). En Vercel se cargan en *Project Settings →
Environment Variables*.

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
| `node scripts/generar-plantilla.mjs` | Regenera `public/plantilla-precios.xlsx` |
| `node scripts/generar-imagenes-categorias.mjs` | Regenera los SVG de categorías |

## Estructura rápida

```
src/
  config/site.ts     Credenciales y flags (no se editan desde el panel)
  data/              types.ts + los .json con productos, categorías y config
  lib/data-source.ts ★ Única capa de acceso a datos. Acá se migra a Supabase.
  lib/excel.ts       Parseo del Excel de precios
  proxy.ts           Protege /admin y /api/admin (el "middleware" de Next 16)
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
2. En Vercel: *New Project* → importá el repo → *Deploy*. Se detecta Next.js
   solo y no hay variables de entorno obligatorias.

> ⚠️ **Limitación conocida:** el panel escribe en el sistema de archivos, que en
> Vercel es efímero. El catálogo se ve perfecto, pero los cambios hechos desde
> `/admin` en producción no persisten. Se resuelve al migrar a Supabase (ver
> `CLAUDE.md`, sección 9).

## Pendientes

Ver la sección "Pendientes / próximos pasos" de `CLAUDE.md`.
