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
| Muro de precios: sin login se ve el catálogo pero no los precios | Precios distintos por cliente |
| Descarga de la lista de precios en Excel (solo clientes) | Historial de listas anteriores |
| Modo día / modo noche | |
| Español e inglés, detectados por país de IP | Traducción de los nombres de producto |
| ABM de productos, categorías y config de tienda | Envíos / logística |
| Carga masiva de precios desde Excel | Idiomas más allá de español e inglés |

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

Hay dos tokens más que no estaban en el sitio original y que existen por el
modo noche:

| Token | Uso |
| --- | --- |
| `page` | Fondo general de la página (antes se escribía `bg-white` a mano) |
| `card` | Fondo de fichas y paneles |
| `on-brand` | Texto que va **encima** de un fondo `brand` |

`on-brand` merece una explicación: en modo noche el azul de marca se aclara
para poder leerse sobre negro, y entonces el texto encima ya no puede ser
blanco. Por eso **nunca** se escribe `bg-brand text-white`, siempre
`bg-brand text-on-brand`.

### Modo día / modo noche

Tres estados: claro, oscuro, y "el que diga el sistema operativo".

- El truco: en vez de escribir `dark:` en cada elemento, **se redefine el valor
  de cada token** dentro de `:root[data-theme="dark"]` y dentro de
  `@media (prefers-color-scheme: dark)`. Como las utilidades de Tailwind son
  `background-color: var(--color-card)`, cambiar la variable cambia toda la
  interfaz de una.
- El prefijo `dark:` queda solo para los pocos casos donde el cambio no es de
  color sino de tratamiento (la barra de categorías, que en oscuro deja de ser
  azul saturado).
- El servidor lee la cookie `wiedmer_theme` y escribe `data-theme` en el
  `<html>` (`src/app/layout.tsx`). Eso evita el "flash" blanco al cargar que
  tienen los sitios que aplican el tema desde el JavaScript.
- El botón (`src/components/theme-toggle.tsx`) cambia el atributo en el acto y
  además guarda la cookie. Sin viaje al servidor.

### Animaciones

- `src/components/reveal.tsx`: envolvés algo y aparece con un fundido cuando
  llega a la pantalla. Usa `IntersectionObserver`, no el evento `scroll`.
- `src/components/hero-canvas.tsx`: la animación de pintura cayendo. **Ya no
  está en el hero**: hoy vive en el bloque de cierre de la home.
  Es un `<canvas>`, no un video: **capas de pintura cayendo**. Un chorro que
  baja desde el borde superior, cortinas colgando del techo con goterones que
  se alargan y vuelven a empezar, y charcos acumulados abajo con la superficie
  ondulando despacio.
  - Por qué canvas y no un `.mp4`: pesa unos KB en vez de varios MB, se ve
    nítido en cualquier pantalla, se estira a cualquier ancho sin recortes ni
    barras negras, y usa los azules de la marca en vez de traerlos quemados
    adentro del archivo.
  - Los parámetros de cada capa están arriba de todo, en las constantes
    `CURTAINS` y `POOLS`: color, opacidad, tamaño, amplitud y velocidad de la
    onda, y dónde cuelgan los goterones. Se toca ahí, no adentro del bucle.
  - Tamaños y amplitudes van en **fracción de la altura**, no en píxeles, para
    que la escena se vea igual de proporcionada en un celular que en un monitor.
- Utilidades `animate-fade-up`, `animate-fade-in`, `animate-nudge` en
  `globals.css`, con `[animation-delay:Nms]` para escalonar entradas.
- **Todo respeta `prefers-reduced-motion`**: si el usuario pidió reducir el
  movimiento, las animaciones se anulan pero el contenido se ve igual. No es un
  detalle estético: quien activa esa opción suele hacerlo por mareos.

### El video del hero (Remotion)

Además de la animación en canvas hay un **video renderizado**: la pintura
cayendo de la lata a la bandeja, en plano fijo. Archivos finales:

    public/video/hero-pintura.mp4   1,1 MB · 1920×1080 · 6 s · sin audio
    public/video/hero-pintura.jpg    185 KB · el primer cuadro, para `poster`

**Cómo está hecho.** Remotion no simula líquidos: dibuja cuadros de React y los
junta en un video con ffmpeg. Así que la escena no se recrea desde cero. La
foto de referencia queda de fondo, quieta —la cámara no se mueve, la luz no
cambia—, y encima se dibujan en SVG sólo las tres cosas que en la realidad se
moverían:

1. **Reflejos que bajan por el chorro.** Un chorro de pintura espesa tiene la
   silueta casi quieta; lo que delata que cae son los brillos deslizándose por
   la superficie. Bajan acelerando y estirándose, como se estira un líquido
   viscoso.
2. **Ondas concéntricas** donde el chorro golpea el charco: nacen chicas, se
   abren y pierden fuerza.
3. Un temblor apenas perceptible en la pintura acumulada.

El rodillo, el pincel, el trapo y la lata no se tocan.

**El detalle que hace que se vea real: la silueta está medida, no dibujada a
ojo.** Los brillos tienen que caer exactamente sobre la pintura; un píxel
afuera y se ve el truco. Los números de `CHORRO` en
`remotion/hero-pintura/geometria.ts` salieron de recorrer la foto fila por fila
buscando dónde empieza y dónde termina el azul. Todo se trabaja en las
coordenadas de la foto original (1536×1024) y el `viewBox` del SVG se encarga de
escalarlas al tamaño del video, mida lo que mida.

Un detalle que costó: la primera medición buscó "azul brillante" y se comió
sólo la mitad iluminada del chorro. El costado en sombra es azul oscuro, casi
negro, y quedaba afuera del recorte. Hubo que medir por perfil (buscar el pico
de brillo de cada fila y bajar hasta que se apaga) para agarrar la cinta
entera.

**El loop es invisible a propósito.** Un hero se reproduce en bucle: cuando
termina vuelve a empezar. Si en el último cuadro las ondas quedaran a mitad de
camino, el salto se vería como un corte. Por eso todo el movimiento se calcula
a partir de `t` (0 al empezar, 1 al terminar) y da un número **entero** de
vueltas: el último cuadro empalma con el primero.

**Comandos:**

```sh
npm run video          # abre el estudio de Remotion (previsualización en vivo)
npm run video:render   # → public/video/hero-pintura.mp4
npm run video:poster   # → public/video/hero-pintura.jpg (primer cuadro)
```

El estudio es lo mejor para ajustar: se toca una constante, se guarda y el
cambio se ve al instante sin re-renderizar los 180 cuadros.

Hay dos composiciones: `HeroPintura` es la buena y `HeroPinturaGuias` es la
misma escena con las siluetas medidas dibujadas en rojo, para comprobar de un
vistazo que los recortes siguen cayendo sobre la pintura.

**La foto fuente no está en `public/`.** Sólo hace falta para renderizar, no
para el sitio, así que vive en `remotion/publico/pintura-vertiendo.jpg` y
`remotion.config.ts` apunta ahí con `Config.setPublicDir`. El original sin
comprimir está en `imagenes/pintura-vertiendo.png`, como el resto de los
originales.

Se probó también VP9 (`.webm`), que suele pesar menos: acá salió **más pesado**
que el H.264 (1,3 MB contra 1,1 MB). Con una escena tan oscura y con tan poco
movimiento, x264 comprime mejor. Quedó sólo el `.mp4`.

**Licencia:** Remotion es gratis para personas y para empresas de hasta 3
personas; a partir de ahí pide licencia paga. Renderizar el video una vez y
versionar el `.mp4` es lo que hace la app: el sitio publicado no ejecuta
Remotion.

### Tipografía

- **Libre Franklin** (Google Fonts) — la que usa el sitio real. Se carga con
  `next/font/google` en `src/app/layout.tsx`.
- Fallback: `system-ui, sans-serif`.
- Títulos: peso 700, `tracking-tight`. Cuerpo: 400. Precios: 700.
- El logo es el isotipo real de la empresa, recreado como **SVG** en
  `src/components/wiedmer-logo.tsx`: un recuadro redondeado con una W adentro,
  más la palabra WIEDMER en Libre Franklin 800.
  - Se dibuja con `currentColor`, así que hereda el color del contenedor: azul
    sobre fondo claro, blanco sobre fondo oscuro. Un solo componente, sin
    archivos duplicados por variante.
  - `WiedmerLogo` = isotipo + palabra. `WiedmerMark` = solo el isotipo (se usa
    de marca de agua gigante en el hero y como favicon en `src/app/icon.svg`).
  - El PNG original de referencia está en `imagenes/`. **No se usa en la app**:
    trae el fondo azul quemado adentro y no escala.

### El hero

Una franja de **poca altura y todo el ancho** con una sola foto fija: pintura
azul cayendo de un tarro a una bandeja. Encima, dos velos negros, el título
*Wiedmer Mayorista* y una bajada corta.

- **Por qué baja y no una portada a pantalla completa:** un hero alto obliga a
  scrollear antes de ver nada útil. Acá, apenas se entra, ya se ve que abajo hay
  categorías. La foto acompaña, no es el contenido.
- **Los dos velos** (`bg-black/55` parejo + un degradado de izquierda a derecha)
  no son decoración: sin ellos el texto blanco competiría con los brillos del
  metal. El degradado oscurece el lado del texto y deja limpio el chorro de
  pintura, que es lo que se quiere ver.
- **`min-h` y no `h`:** fija un piso pero deja crecer. Con altura fija, en un
  celular angosto el título se saldría de la foto.
- **Los números** (artículos, provincias, reparto) salieron del hero a una
  franja propia sobre `surface`, justo debajo. Adentro obligaban a que la foto
  fuera alta; afuera se leen igual y el hero queda corto.
- El original está en `imagenes/hero.png` y el `.webp` que se sirve pesa 109 KB
  contra 2,4 MB del PNG (−96%).

> `src/components/hero-carousel.tsx` era el hero anterior —cinco placas que
> rotaban solas— y **quedó sin uso**. El archivo sigue en el repo por si se
> quiere volver a él; sus textos son `t.carousel`, que hoy tampoco se usan.

### La home, bloque por bloque

| Bloque | Qué hace | Sin sesión | Con sesión |
| --- | --- | --- | --- |
| Hero | Franja con una foto fija, título y bajada | sí | sí (+ botón "hablar con un vendedor") |
| Números | Franja fina con los datos reales del catálogo | sí | sí |
| Accesos | Las acciones concretas del visitante | solo "recorrer el catálogo" + cartel de acceso | las tres |
| Categorías | Fichas con foto y nombre encima | sí | sí |
| La empresa | Quiénes somos, zona de reparto, contacto | sí | sí |
| Cómo se compra | Los tres pasos del pedido, en fichas numeradas | sí | sí |
| Cierre | Llamada a WhatsApp | sí | sí |

Los dos accesos con sesión (**descargar la lista** y **hablar con un vendedor**)
**no se renderizan** para el visitante anónimo: no están escondidos con CSS, no
existen en el HTML.

El **botón flotante de WhatsApp** (`src/components/whatsapp-fab.tsx`) es aparte
y lo ve cualquiera, con o sin sesión: es el canal de contacto general, no el
comercial. Vive en el layout de la tienda, así que acompaña por todo el
catálogo. Aparece recién después de bajar 400 px para no competirle a los
botones del hero.

### El carrusel de placas

`src/components/story-carousel.tsx`. La idea sale de las campañas que se arman
como una tira de placas: la primera presenta, las del medio argumentan y la
última cierra. Acá la tira no se scrollea, avanza sola cada 6 segundos.

Qué lo hace parecer video y no un slider de plantilla:

- Cada foto entra con un acercamiento lento y continuo (Ken Burns). La
  animación dura 8 s contra los 6 s de la placa, así el movimiento se corta
  mientras todavía anda y nunca se lo ve "frenar", que es lo que delata el truco.
- Las placas se cruzan con un fundido, no con un salto.
- El texto entra escalonado. El truco para que se reanime en cada placa es la
  `key={actual}` en el contenedor del texto: React ve una key distinta, monta un
  elemento nuevo y la animación CSS arranca de cero.
- Una barra de progreso muestra cuánto falta. Sin eso el avance automático se
  siente arbitrario.

Y lo que lo hace usable: se pausa al pasar el mouse o al llegar con el teclado,
se pausa si la pestaña deja de estar visible, y con `prefers-reduced-motion` no
avanza solo ni hace zoom (queda la primera placa y los botones).

Los **textos** de las placas están en el diccionario (`t.carousel.slides`); las
**fotos** las elige la home, porque son datos del proyecto y no texto a traducir.

### Descarga de la lista de precios

`GET /api/lista-precios` arma un `.xlsx` en el momento con los productos activos
y lo devuelve como descarga (`Content-Disposition: attachment`). El nombre lleva
el período: `lista-precios-wiedmer-2026-09.xlsx`.

- **No se guarda en disco a propósito.** Una lista guardada envejece en silencio
  y termina siendo el motivo de una discusión con un cliente que facturó con
  precios viejos. Se genera con los precios de hoy, cada vez.
- **La protege `src/proxy.ts`**, no el botón. Esconder el botón no es seguridad:
  sin la regla del proxy, cualquiera podría escribir la dirección a mano y
  bajarse la lista mayorista entera.
- El rechazo es distinto según quién pide: `/api/admin/*` recibe `401` en JSON
  porque lo llama un `fetch`; `/api/lista-precios` recibe un redirect al login,
  porque es un link que una persona toca en el navegador y un JSON crudo en
  pantalla sería una pared.

### Fotos de categoría

Cada categoría tiene una foto propia en `public/img/categorias/<slug>.webp`, y
aparece en tres lugares: la ficha de la home (con el **nombre escrito encima**),
la cabecera de `/categoria/<slug>` y el fondo de las placas del carrusel.

- **Los originales viven en `imagenes/`**, fuera de `public/`, así no se
  publican ni se suben en cada deploy. Son PNG de 1254×1254 y ~2,2 MB cada uno.
- **Se convierten con `node scripts/optimizar-imagenes.mjs`**, que
  las pasa a WebP calidad 80. Las seis juntas bajan de 12,8 MB a 0,72 MB (−94%)
  sin diferencia visible: WebP comprime mucho mejor que PNG cuando la imagen es
  una foto. El script se corre a mano cuando cambia una foto, no en el build; lo
  que se versiona es el resultado.
- El mapa "slug → archivo original" está escrito a mano dentro del script,
  porque los nombres originales traen espacios y acentos. Si agregás una
  categoría, agregala también ahí.
- No se recorta el tamaño en píxeles: `next/image` se encarga de servir la
  versión chica a un celular y la grande a un monitor, y **no agranda más allá
  del original** (comprobado: pedir 3840 px devuelve los 1254 nativos).

Sobre la legibilidad del texto encima de la foto: la cabecera de categoría
apila tres capas —foto, velo azul parejo y degradado horizontal opaco del lado
del título—. El degradado no es decoración: sin él habría que elegir entre foto
visible o título legible, porque algunas fotos son claras (lijas) y otras
oscuras (impermeabilizantes).

### Layout

- **Home**: es una PORTADA INSTITUCIONAL. **No muestra ni un producto.** El
  orden es: hero → números → accesos rápidos → categorías → la empresa →
  cómo se compra → cierre. Las categorías van arriba, pegadas a "¿Qué necesitás
  hacer?", porque son el destino real del visitante: lo institucional se lee
  después, no antes. Los artículos viven en
  `/categoria/<slug>`, y se llega por las fichas de categoría.
- **Header** sticky con `backdrop-blur`: logo a la izquierda, buscador al centro,
  y a la derecha selector de idioma, modo noche, sesión y carrito. Debajo, barra
  azul (`brand`) con las categorías. Al scrollear se compacta: la franja de
  contacto se pliega y aparece una sombra.
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
│   ├── img/categorias/       ← fotos .webp de cada categoría (+ SVG viejos)
│   ├── video/                ← video del hero ya renderizado (+ su póster)
│   └── plantilla-precios.xlsx← plantilla descargable para la carga de precios
├── remotion.config.ts        ← ajustes del render (códec, calidad, carpeta pública)
├── remotion/                 ← el video del hero. No forma parte del sitio
│   ├── index.ts              ← punto de entrada de Remotion
│   ├── Root.tsx              ← catálogo de composiciones (medidas, duración)
│   ├── publico/              ← la foto que usa la escena, sólo para renderizar
│   └── hero-pintura/
│       ├── escena.tsx        ← la animación
│       └── geometria.ts      ← silueta del chorro, MEDIDA sobre la foto
├── scripts/
│   ├── generar-plantilla.mjs        ← genera la plantilla .xlsx
│   ├── optimizar-imagenes.mjs           ← fotos originales → WebP
│   └── generar-imagenes-categorias.mjs   ← SVG de respaldo (ya no se usan)
└── src/
    ├── config/site.ts        ← config estática (credenciales, flags). NO editable desde el panel
    ├── data/
    │   ├── types.ts          ← Product, Category, StoreConfig, Order, CartItem
    │   ├── products.json     ← datos persistidos
    │   ├── categories.json
    │   └── store-config.json
    ├── lib/
    │   ├── data-source.ts    ← ★ ÚNICA capa de acceso a datos
    │   ├── auth.ts           ← sesión y ROLES (Web Crypto, sirve en Edge)
    │   ├── request-context.ts← ★ "¿quién mira y en qué idioma?" (servidor)
    │   ├── i18n.ts           ← diccionarios es / en
    │   ├── locale.ts         ← detección de idioma (puro, sirve en Edge)
    │   ├── cart-store.ts     ← carrito en localStorage (store externo)
    │   ├── excel.ts          ← parseo y matching del Excel de precios
    │   ├── price-types.ts    ← tipos de la preview (compartidos cliente/servidor)
    │   ├── price-parse.ts    ← interpreta "$ 89.900,50" → 89900.5
    │   ├── whatsapp.ts       ← armado del mensaje de pedido
    │   ├── slug.ts           ← slugify / normalizeText
    │   └── format.ts         ← formato de precios en ARS
    ├── components/           ← UI compartida (header, footer, cards, formularios…)
    │   ├── wiedmer-logo.tsx  ← logo SVG (isotipo + palabra)
    │   ├── hero-canvas.tsx   ← fondo animado del hero
    │   ├── reveal.tsx        ← aparición al scrollear
    │   ├── theme-toggle.tsx  ← modo día / modo noche
    │   ├── language-switcher.tsx
    │   └── price-gate.tsx    ← precio o cartel "solo para clientes"
    ├── proxy.ts              ← idioma + protege /admin, /api/admin, /carrito, /checkout
    └── app/
        ├── layout.tsx                  ← <html lang y data-theme>, fuente, estilos
        ├── icon.svg                    ← favicon (convención de Next)
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

Y una segunda capa chica, `src/lib/request-context.ts`, que responde "¿quién
está mirando esta página?". La usan las páginas y layouts del servidor:

```ts
getLocale()   // "es" | "en"
getT()        // el diccionario de este request
getRole()     // "admin" | "cliente" | null
getViewer()   // { role, showPrices, locale, t } — todo junto
getTheme()    // "light" | "dark" | null (null = el del sistema)
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

## 5. Autenticación y muro de precios

Hay **dos niveles**, con la misma cookie y el mismo mecanismo.

| Quién | Credenciales | Qué ve |
| --- | --- | --- |
| Visitante sin sesión | — | Catálogo completo: fotos, nombres, códigos, marcas, descripciones. **Sin precios y sin carrito.** En su lugar, botón "Consultar precio" que abre WhatsApp con el artículo ya escrito |
| Cliente | `CLIENT_USER` / `CLIENT_PASSWORD` | Todo lo anterior **más** precios, carrito y checkout |
| Admin | `ADMIN_USER` / `ADMIN_PASSWORD` | Todo lo del cliente **más** el panel `/admin` |

Es el modelo habitual de un mayorista: la lista de precios es información
comercial y no se muestra en la vía pública, pero el catálogo sí, porque es lo
que trae clientes nuevos.

### Cómo se aplica el muro

`ProductPrice` y compañía (`src/components/price-gate.tsx`) son **Server
Components**. Cuando `showPrices` es `false`, el precio **no se manda al
navegador**: no está escondido con CSS, directamente no viaja en el HTML. Si
estuviera oculto con `display:none` alcanzaría con abrir el inspector.

Los filtros también se sanean **en el servidor** con `withoutPriceFilters()`:
si un anónimo escribe `?sort=precio-desc` a mano en la barra de direcciones, se
ignora. Sin eso, aunque no viera los números, podría deducir de un vistazo cuál
es el artículo más caro del rubro.

`/carrito` y `/checkout` los corta el proxy: sin precios no hay pedido posible.

### El mecanismo

- Credenciales **solo por variables de entorno**. `src/config/site.ts` las lee
  sin valor por defecto (`process.env.X ?? ""`), porque el repo es público y una
  contraseña escrita en el código quedaría en el historial de git para siempre.
- En local van en `.env.local` (ignorado por git); en Vercel, en *Project
  Settings → Environment Variables*. Plantilla: `.env.example`.
- Si falta alguna variable de un rol, ese login rechaza todo. Si no hay
  ninguno configurado, **el catálogo sigue funcionando pero nadie ve precios**.
  Es a propósito: entre "mostrarle la lista mayorista a todo el mundo por un
  olvido" y "no mostrarle el precio a nadie", el segundo error se nota enseguida
  y no hace daño.
- El login (`loginAction`) compara contra los dos juegos de credenciales y setea
  la cookie **httpOnly** `wiedmer_session` con un token = SHA-256 de
  `rol:usuario:contraseña:secreto`. Al no guardar la contraseña en la cookie,
  robarla no revela las credenciales. El `rol:` adelante importa: sin él, si
  cliente y admin tuvieran las mismas credenciales, los dos tokens serían
  idénticos y no se podrían distinguir.
- `roleForSessionToken(cookie)` devuelve `"admin" | "cliente" | null`. Es la
  función que usa toda la app para preguntar "¿quién es este?".
- `src/proxy.ts` corre antes de resolver la página: si el rol no alcanza para la
  ruta, redirige a `/login?next=<ruta>`. Protege `/admin/*`, `/api/admin/*`,
  `/carrito` y `/checkout` (en las de API devuelve `401` en JSON en vez de
  redirigir, porque un `fetch` no sabe qué hacer con una página de login).
  > Nombre: en Next 16 el archivo se llama `proxy.ts` y exporta `proxy()`. Hasta
  > Next 15 era `middleware.ts` / `middleware()`. Es exactamente lo mismo; si
  > leés un tutorial que dice "middleware", habla de este archivo.
- El botón "Cerrar sesión" está en el header de la tienda y en el del panel.
- El token se calcula con **Web Crypto** (`crypto.subtle`), que funciona tanto en
  el runtime Edge del proxy como en Node.

**Flag de catálogo privado:** `requireLoginForCatalog` en `src/config/site.ts`.
Default `false`. En `true`, el proxy protege también el catálogo y no se ve
absolutamente nada sin usuario.

Las credenciales se leen en `src/config/site.ts` y no en `store-config.json`
porque el proxy corre en el runtime Edge, donde no existe `fs`: no puede leer un
archivo JSON. Las variables de entorno sí llegan al Edge.
`store-config.json` queda para lo que sí se edita desde el panel.

---

## 5 bis. Idiomas (español / inglés)

Solo se traduce la **interfaz**. Los nombres y descripciones de los productos
quedan como se cargaron: "Látex Interior 20 L" es el nombre del artículo, no un
texto a traducir.

### Cómo se elige el idioma

En este orden, gana el primero que exista:

1. **La cookie `wiedmer_lang`** — el usuario tocó el selector ES/EN del header.
   Manda siempre; a partir de ahí no volvemos a adivinar.
2. **El país de la IP** — header `x-vercel-ip-country` que agrega Vercel.
   Argentina y el resto de los países hispanohablantes → español; el resto del
   mundo → inglés.
3. **El idioma del navegador** — header `Accept-Language`. Es el que se usa en
   local, donde el header de país no existe.
4. Español, que es el idioma de la casa.

> **Sobre "que cambie según la VPN":** un navegador no le cuenta a la web si hay
> una VPN de por medio; es justamente lo que una VPN oculta. Lo que sí llega es
> la IP, y de ahí el país. Como la VPN cambia esa IP, el efecto termina siendo el
> buscado: si alguien entra por un servidor de Estados Unidos, el sitio lo ve
> como visitante de Estados Unidos y le habla en inglés. **En local no funciona**
> (no hay header de país); ahí manda el idioma del navegador.

### Cómo está armado

- `src/lib/i18n.ts` — los dos diccionarios. Es un `.ts` y no un `.json` para que
  TypeScript los compare entre sí: el `satisfies` del final obliga a que `en`
  tenga exactamente las mismas claves que `es`. Si agregás un texto en español y
  te olvidás del inglés, el editor te lo marca en rojo.
- `src/lib/locale.ts` — la detección. Funciones puras, sin `next/headers`,
  porque las importa el proxy (runtime Edge).
- `src/proxy.ts` — resuelve el idioma y lo deja en el header `x-wiedmer-lang`
  del request (para que la página lo lea en este mismo render) y en la cookie
  (para la próxima visita).
- `src/lib/request-context.ts` — `getT()` devuelve el diccionario del request.
  Lo llaman las páginas y layouts del servidor.

**No hay rutas `/es/…` y `/en/…`.** Se decidió por cookie para no tener que
mover toda la carpeta `app/` adentro de un `[lang]`. La contra es que Google
indexa una sola versión de cada URL; para un catálogo mayorista detrás de un
login, no compensa el trabajo. Si algún día hace falta SEO en inglés, la guía
oficial de Next está en `node_modules/next/dist/docs/01-app/02-guides/internationalization.md`.

### Textos en componentes cliente

Los componentes que corren en el navegador reciben los textos **por props**, ya
traducidos, y piden solo la rebanada que usan (`Dictionary["product"]`, no
`Dictionary` entero). Todo lo que un Server Component le pasa a un Client
Component viaja al navegador dentro del HTML: pedir de más es mandar de más. Por
eso no hay Context de idioma.

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
cp .env.example .env.local   # completar las 5 variables
npm run dev                  # http://localhost:3000
```

Variables a completar: `CLIENT_USER`, `CLIENT_PASSWORD`, `ADMIN_USER`,
`ADMIN_PASSWORD` y `SESSION_SECRET`.
Para el `SESSION_SECRET`: `openssl rand -hex 32`.

Login (el mismo para los dos roles): http://localhost:3000/login

El catálogo arranca sin `.env.local`, pero **sin precios**: sin credenciales
configuradas no hay forma de destrabarlos.

Para probar el idioma inglés en local, cambiá el idioma preferido del navegador
o usá el selector ES/EN del header.

### Deploy en Vercel

1. Subir el repo a GitHub.
2. En Vercel: *New Project* → importar el repo → cargar `CLIENT_USER`,
   `CLIENT_PASSWORD`, `ADMIN_USER`, `ADMIN_PASSWORD` y `SESSION_SECRET` en
   *Environment Variables* → *Deploy*.
   Sin ellas el sitio funciona pero nadie ve precios ni puede entrar al panel.
   La detección de idioma por país de IP **solo funciona en Vercel**: es Vercel
   quien agrega el header `x-vercel-ip-country`.
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
5. **Precios mayorista/minorista** — hoy hay un solo precio y el corte es
   "ve / no ve". El lugar donde se decide es `canSeePrices()` en
   `src/lib/auth.ts`: está en una función propia justamente para que el día que
   existan dos listas se cambie en un solo lugar.
6. Imágenes reales de producto (hoy hay un placeholder con la marca).
7. **Usar el video en el hero** — el `.mp4` ya está renderizado
   (`public/video/hero-pintura.mp4`) pero la home sigue mostrando `HeroCanvas`.
   Falta decidir cuál queda: el canvas pesa ~6 KB y usa los azules de la marca;
   el video pesa 1,1 MB y es una escena real. Si gana el video, se reemplaza
   `<HeroCanvas />` por un `<video muted loop playsInline autoPlay preload="none"
   poster="/video/hero-pintura.jpg">` y hay que acordarse de dos cosas: en
   `prefers-reduced-motion` mostrar sólo el póster, y no ponerle `autoPlay` sin
   `muted` porque los navegadores lo bloquean.
8. **SEO en inglés** — hoy el idioma va por cookie y Google indexa una sola
   versión de cada URL. Si hace falta, migrar a rutas `/es/…` y `/en/…`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
