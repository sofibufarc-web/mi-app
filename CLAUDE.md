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
| Carrito persistente en el navegador | Cuentas de usuario individuales |
| Checkout que arma un pedido y lo envía por **WhatsApp** | Facturación / stock en tiempo real |
| Panel `/admin` protegido por login genérico | Historial de listas anteriores |
| Muro de precios: sin login se ve el catálogo pero no los precios | Precios distintos por cliente |
| Descarga de la lista de precios en Excel (solo clientes) | Envíos / logística |
| Datos en **Postgres (Supabase)** | Idiomas más allá de español e inglés |
| Modo día / modo noche | |
| Español e inglés, detectados por país de IP | Traducción de los nombres de producto |
| ABM de productos, categorías y config de tienda | |
| Carga masiva de precios desde Excel | |

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
  - El favicon es `src/app/icon.svg`: el bloque azul relleno con la W en blanco.
    No es el logo del header tal cual, y es a propósito: a 16 píxeles, que es el
    tamaño real de una pestaña, un contorno fino desaparece y un bloque macizo
    se distingue.
    > **Cuidado con `favicon.ico`.** El proyecto arrancó con el que trae Create
    > Next App, y mientras ese archivo existió la W no se vio nunca: cuando
    > están los dos, Next publica el `.ico` en `/favicon.ico` y el navegador lo
    > prefiere. Se borró. Si algún día vuelve a aparecer un `.ico` en
    > `src/app/`, es eso lo que tapa el isotipo.

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
- **Los números** (artículos, provincias, reparto) primero salieron del hero a
  una franja propia debajo, y después se sacaron del todo: eran un dato de
  folleto, no algo que el visitante viniera a buscar. Del hero se pasa directo a
  "¿Qué necesitás hacer?". Los textos siguen en el diccionario (`t.hero.stats`)
  por si algún día vuelven, pero hoy no los usa nadie.
- El original está en `imagenes/hero.png` y el `.webp` que se sirve pesa 109 KB
  contra 2,4 MB del PNG (−96%).

> `src/components/hero-carousel.tsx` era el hero anterior —cinco placas que
> rotaban solas— y **quedó sin uso**. El archivo sigue en el repo por si se
> quiere volver a él; sus textos son `t.carousel`, que hoy tampoco se usan.

### La home, bloque por bloque

| Bloque | Qué hace | Sin sesión | Con sesión |
| --- | --- | --- | --- |
| Hero | Franja con una foto fija, título y bajada | sí | sí (+ botón "hablar con un vendedor") |
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

### La cinta de colores — HOY SIN USO

> **Se sacó de la home.** Entre las categorías y lo institucional metía una
> parada que no devolvía al catálogo. El archivo sigue en el repo, como el
> simulador de color que estaba antes en ese mismo lugar; sus textos
> (`t.colorStrip`) y la carta (`src/data/paint-colors.ts`) también. Lo que sigue
> describe cómo está hecho, por si se lo quiere volver a poner.

`src/components/color-strip.tsx`. Dos filas con la carta de colores —látex
arriba, aerosol abajo— que se deslizan solas y en sentidos opuestos, de borde a
borde de la pantalla.

**Es un Server Component: no lleva `"use client"`.** Todo el movimiento es CSS,
así que no viaja ni una línea de JavaScript al navegador para que la cinta ande.
El único estado sería "¿está pausada?", y de eso se encarga `:hover` en la hoja
de estilos.

**El loop no tiene costura.** La lista se dibuja **dos veces**, una al lado de la
otra, y cada copia se corre el 100% de *su propio* ancho (`animate-marquee` en
`globals.css`). Cuando la primera termina de salir por la izquierda, la segunda
quedó exactamente donde arrancó la primera, así que el salto de vuelta al primer
cuadro no se ve. La copia duplicada lleva `aria-hidden`: un lector de pantalla
leería los doce colores dos veces seguidas sin que eso agregue nada.

Tres detalles que parecen menores y no lo son:

- **`linear` y no una curva suave.** Cualquier easing haría que la cinta acelere
  al principio y frene al final de cada vuelta, y ese frenado delata dónde está
  el corte.
- **Se anima `transform`, no `margin-left`.** Una transformación la resuelve la
  placa de video sola; mover un margen obliga a recalcular el layout de la
  página en cada cuadro, y esto no para nunca.
- **Las dos filas van para lados distintos.** Con las dos en la misma dirección
  el conjunto se lee como un solo bloque que se corrió y el movimiento se vuelve
  invisible; en sentidos opuestos cada fila hace de referencia fija de la otra.

La duración la pone cada fila por `style` (48 s y 40 s): no tienen la misma
cantidad de muestras, y con un solo número la más corta se vería más lenta.

Lo que la hace usable: se **pausa al pasar el mouse**, para poder leer un
nombre. Con `prefers-reduced-motion` la regla global de `globals.css` la deja
quieta en el primer cuadro, y las muestras se ven igual. Y una máscara en los
bordes (`mask-image`) hace que los colores se desvanezcan al entrar y salir en
vez de cortarse: sin ella la cinta parece un contenedor con scroll.

**La carta de colores** está en `src/data/paint-colors.ts`. Es un `.ts` y no una
tabla de la base porque el panel no la edita: la regla del proyecto es que a la
base va lo que se escribe en tiempo de ejecución, y la carta es fija. Los
**nombres de los colores no se traducen**, por lo mismo que no se traduce "Látex
Interior 20 L": es el nombre comercial del color. Lo que sí está en el
diccionario (`t.colorStrip`) es la interfaz alrededor.

`isLightColor()` en `src/lib/color.ts` decide si el nombre del color va escrito
en negro o en blanco encima de la muestra. No es el promedio de R, G y B: usa
los coeficientes de luminancia de la norma WCAG, porque el ojo percibe el verde
mucho más luminoso que el azul. Por eso un amarillo pleno se lee "claro" y un
azul pleno "oscuro", aunque los dos usen dos canales al máximo.

**Va después de las categorías, no antes.** Quien entra a un mayorista viene a
buscar un rubro: primero se le da eso, y la carta después, que además lo
devuelve al catálogo con sus dos links ("Ver pinturas" / "Ver aerosoles").
Arriba se comería el lugar de lo que la gente vino a hacer.

> `src/components/color-simulator.tsx` era lo que estaba antes en este lugar
> —elegías un color y lo veías aplicado sobre una pared o una reja dibujadas en
> SVG— y **quedó sin uso**: ocupaba media pantalla y le pedía al visitante que
> hiciera algo justo donde lo que se busca es que siga bajando. El archivo sigue
> en el repo por si se quiere volver a él; sus textos son `t.simulator`, y sus
> animaciones `animate-roller` y `animate-spray` siguen en `globals.css`.

### Layout

- **Home**: es una PORTADA INSTITUCIONAL. **No muestra ni un producto.** El
  orden es: hero → accesos rápidos → categorías →
  la empresa → cómo se compra → cierre. Las categorías van arriba, pegadas a "¿Qué necesitás
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
├── vercel.json               ← región de las funciones (São Paulo, donde está la base)
├── .vercelignore             ← qué no subir al deploy (originales pesados, herramientas)
├── .env.example              ← variables de entorno (credenciales + base de datos)
├── supabase/
│   ├── config.toml           ← apunta al proyecto de Supabase
│   └── migrations/           ← ★ el esquema de la base, en orden cronológico
│       ├── 20260909120000_esquema_inicial.sql
│       ├── 20260909120100_datos_iniciales.sql
│       ├── 20260909140000_perfiles.sql      ← rol de cada cuenta de Supabase Auth
│       ├── 20260910203436_ids_de_mas_de_tres_digitos.sql
│       ├── 20260911120000_baja_tabla_users.sql
│       └── 20260911140000_storage_imagenes.sql  ← bucket de fotos y sus permisos
├── public/
│   ├── uploads/              ← vacío: las fotos ahora van a Supabase Storage
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
│   ├── db.mjs                       ← envoltorio del CLI de Supabase
│   ├── probar-conexion.mjs          ← chequeo rápido de la base
│   ├── crear-usuario.mjs            ← alta de cuenta (y el primer admin)
│   ├── cambiar-password.mjs         ← contraseña nueva, cuando el mail no es opción
│   ├── generar-plantilla.mjs        ← genera la plantilla .xlsx (lee la base)
│   ├── importar-lista.mjs           ← carga inicial del catálogo desde el Excel
│   ├── optimizar-imagenes.mjs           ← fotos originales → WebP
│   ├── fotos-proveedores.mjs            ← fotos de producto desde Sinteplast y Kuwait
│   ├── fotos-sitio.mjs                  ← fotos de producto desde wiedmer.com.ar
│   ├── unificar-fotos.mjs               ← una foto → fondo blanco, 1000×1000, mismo margen
│   ├── unificar-en-storage.mjs          ← rehace las fotos que ya usan los productos
│   ├── fotos-lote.mjs                   ← carga fotos propias en lote, desde un Excel
│   └── generar-imagenes-categorias.mjs   ← SVG de respaldo por categoría
└── src/
    ├── config/site.ts        ← config estática (credenciales, flags). NO editable desde el panel
    ├── data/
    │   ├── types.ts          ← Product, Category, StoreConfig, Order, CartItem
    │   ├── paint-colors.ts   ← carta de colores de la cinta (no la edita el panel)
    │   └── (los .json viejos se borraron: los datos están en la base)
    ├── lib/
    │   ├── db.ts             ← ★ conexión a Postgres
    │   ├── storage.ts        ← fotos de producto → Supabase Storage
    │   ├── data-source.ts    ← ★ ÚNICA capa de acceso a datos
    │   ├── auth.ts           ← las dos reglas de rol (ver precios / entrar al panel)
    │   ├── supabase/         ← clientes de Supabase Auth
    │   │   ├── client-config.ts ← URL y clave pública, en un solo lugar
    │   │   ├── server.ts     ← páginas y Server Actions
    │   │   ├── proxy-client.ts← el proxy (Edge)
    │   │   ├── browser.ts    ← solo la pantalla de restablecer contraseña
    │   │   └── admin.ts      ← altas de cuenta y mail de restablecimiento
    │   ├── request-context.ts← ★ "¿quién mira y en qué idioma?" (servidor)
    │   ├── i18n.ts           ← diccionarios es / en
    │   ├── locale.ts         ← detección de idioma (puro, sirve en Edge)
    │   ├── cart-store.ts     ← carrito en localStorage (store externo)
    │   ├── excel.ts          ← parseo y matching del Excel de precios
    │   ├── price-types.ts    ← tipos de la preview (compartidos cliente/servidor)
    │   ├── price-parse.ts    ← interpreta "$ 89.900,50" → 89900.5
    │   ├── whatsapp.ts       ← armado del mensaje de pedido
    │   ├── slug.ts           ← slugify / normalizeText
    │   ├── color.ts          ← ¿texto negro o blanco encima de este color?
    │   └── format.ts         ← formato de precios en ARS
    ├── components/           ← UI compartida (header, footer, cards, formularios…)
    │   ├── wiedmer-logo.tsx  ← logo SVG (isotipo + palabra)
    │   ├── hero-canvas.tsx   ← fondo animado del hero
    │   ├── color-strip.tsx   ← la cinta de colores, HOY SIN USO
    │   ├── color-simulator.tsx← el simulador viejo, HOY SIN USO
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
        ├── actualizar-password/page.tsx ← donde aterriza el link del mail
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
ni página escribe SQL. Funciones expuestas:

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

### La base de datos

Postgres, alojado en **Supabase**. La app se conecta **directo por Postgres** con
el driver `postgres` (postgres.js), no por la API HTTP de Supabase. Es la misma
base; cambia el camino.

`src/lib/db.ts` arma esa conexión y es el único lugar donde se lee la cadena.

> **El puerto importa, y no es el que parece.** Supabase da dos URLs para la
> misma base: `DIRECT_URL` (5432, pooler en modo sesión) y `DATABASE_URL` (6543,
> pooler en modo transacción). La app usa **la de 5432**.
>
> El motivo: postgres.js manda varias consultas encadenadas por la misma
> conexión sin esperar cada respuesta, que es lo que hace que una página que
> pide seis cosas tarde lo que la más lenta y no la suma. El pooler en modo
> transacción reparte una conexión distinta por transacción y con ese encadenado
> pierde el hilo: **deja de responder, sin dar error**. Medido contra esta base:
> 30 consultas de a una andan por los dos puertos, pero 30 en paralelo tardan
> 504 ms por el 5432 y no terminan nunca por el 6543.
>
> **Se volvió a intentar el 6543 y hubo que volver atrás.** La prueba aislada
> engaña: un script suelto por el 6543 anda bien. La app no. `/categoria/…`
> tardaba entre 2 y 7 minutos y después ni la home respondía; hasta
> `select * from store_config where id = 1` moría por `statement timeout`. En
> `pg_stat_activity` las conexiones quedaban `idle` con `ClientRead` y la
> consulta ya respondida: la base contestaba y el driver no levantaba la
> respuesta. Sin locks ni transacciones abiertas. Por el 5432, la misma página
> tarda 1,9 s. **Para probar esto no alcanza un script: hay que medir la app.**
>
> El 6543 es el que recomienda Supabase para Prisma, que no encadena consultas.
> Por eso la plantilla del panel lo pone primero.

**Tres tablas**, que son los tres tipos de `data/types.ts`:

| Tabla | Notas |
| --- | --- |
| `categories` | ids `c-001`… generados por una secuencia |
| `products` | ids `p-001`…; `price` es `numeric`, no `float` |
| `store_config` | una sola fila; `contact` y `colors` van como `jsonb` |

**Dos formas de nombrar lo mismo.** Postgres usa snake_case (`category_id`) y la
app camelCase (`categoryId`). La traducción vive en `data-source.ts` y en ningún
otro lado, en las funciones `aProducto`, `aCategoria` y `aConfig`. Por eso la
migración no obligó a tocar ni una página.

**Tres detalles del driver** que sorprenden la primera vez:

1. **`numeric` llega como texto.** `price` vuelve como `"89900.00"`. El driver no
   convierte solo porque un `numeric` admite más precisión que un `number` de
   JavaScript y no quiere perder centavos en silencio. Se convierte con `Number()`.
2. **Las fechas llegan como `Date`**, y los tipos de la app las quieren en texto
   ISO. Van con `.toISOString()`.
3. **`NULL` no es `""`.** "Sin categoría" era la cadena vacía en los JSON; en la
   base es `NULL`, que es lo que una clave foránea sabe manejar.

**Cosas que antes hacía la app y ahora hace la base**, porque ahí es imposible
olvidárselas:

- Los ids (`p-034`) los genera una secuencia, no un `Math.max` sobre el array.
  > Ojo con el relleno de ceros: `lpad(n, 3, '0')` no solo rellena, también
  > **recorta**. El producto 1000 pedía el id `p-100`, que ya existía, y el alta
  > fallaba con "duplicate key". Se ve recién al pasar los 999 productos.
  > Lo arregla la migración `20260910203436_ids_de_mas_de_tres_digitos.sql`,
  > que rellena hasta tres dígitos y de ahí en más deja el número entero.
- `updated_at` lo pone un trigger en cada `UPDATE`.
- Borrar una categoría deja sus productos sin categoría, por la clave foránea
  (`on delete set null`), no por un bucle en JavaScript.
- Las operaciones de varios pasos (borrar categoría reasignando productos,
  aplicar una lista de precios) van en una transacción: pasan enteras o no pasan.
  Eso reemplazó a la cola de escrituras que serializaba los accesos al archivo.

**El buscador vive en la base.** `products.search_text` es una columna calculada
que junta nombre, sku, descripción y marca en minúsculas y sin tildes, con un
índice GIN de trigramas encima. Por eso escribir "latex" encuentra "Látex".

> El detalle que costó: `unaccent()` viene marcada como `STABLE`, no `IMMUTABLE`,
> y Postgres solo acepta funciones `IMMUTABLE` adentro de una columna calculada.
> Hay que envolverla en una función propia (`public.immutable_unaccent`) que sí
> lo declare. Es el atajo estándar y está comentado en la migración.

### Seguridad de la base: RLS sin políticas

Las tres tablas tienen **Row Level Security activo y CERO políticas**. Sin una
política que lo permita, RLS niega todo: los roles `anon` y `authenticated` no
pueden leer ni escribir nada.

No es exceso de celo. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` viaja al navegador
—eso significa el prefijo `NEXT_PUBLIC_`—. Si esa clave tuviera permiso de
lectura sobre `products`, cualquiera podría copiarla del inspector y bajarse la
tabla entera **con los precios adentro**, sin pasar por el login. El muro de
precios de la sección 5 quedaría de adorno.

La app entra por otro lado: la conexión directa de `DATABASE_URL`, que usa el
dueño de las tablas y por eso no le aplica RLS. Esa cadena vive solo en el
servidor, y `data-source.ts` y `db.ts` tienen `import "server-only"`, que hace
fallar el build si alguien los arrastra a un componente de cliente.

### Migraciones

El esquema no se toca a mano desde el panel de Supabase: se escribe en un archivo
de `supabase/migrations/` y se aplica con el CLI. Así el estado de la base es
reproducible y queda versionado junto al código.

```sh
npm run db:status              # qué migraciones están aplicadas y cuáles no
npm run db:new -- nombre_corto # crea un archivo nuevo, con fecha adelante
npm run db:push                # aplica a la nube las que falten
npm run db:check               # conteos, estado de RLS y prueba del buscador
```

Las migraciones son **acumulativas y no se editan una vez aplicadas**: para
cambiar algo se agrega una migración nueva. La fecha en el nombre es lo que fija
el orden.

`20260909120100_datos_iniciales.sql` es el catálogo que hasta acá vivía en los
`.json`. Termina con dos `setval`: las filas traen su id escrito, así que sin eso
las secuencias seguirían en cero y el primer alta desde el panel chocaría contra
`p-001`.

Los scripts se apoyan en `node --env-file=.env.local`, que carga las variables
sin necesidad de la librería dotenv. Next lo hace solo al arrancar; un script
suelto no.

### Las fotos de producto: Supabase Storage

Nada de la app escribe ya en el disco del servidor, y por eso el panel funciona
entero en Vercel. El último caso que faltaba eran las imágenes.

`/api/admin/upload` escribía con `fs` en `public/uploads/`. En una máquina
propia anda; en Vercel no, porque cada deploy arma una copia nueva del sitio a
partir del repositorio y el disco es de solo lectura fuera de `/tmp`. Las fotos
subidas desde el panel duraban hasta el deploy siguiente.

Hoy van a **Supabase Storage**, al bucket `productos`. La lógica está en
`src/lib/storage.ts` y el permiso en la migración
`20260911140000_storage_imagenes.sql`.

- **El bucket es público en lectura.** Son fotos de catálogo: las ve cualquiera
  que entre, igual que el nombre y el código del artículo. Lo que está detrás
  del login son los precios, no las imágenes.
- **Escribir es solo de admin.** Storage guarda un renglón por archivo en
  `storage.objects`, que tiene RLS como cualquier tabla. Las tres políticas
  (insert, update, delete) preguntan por `public.es_admin()`, una función
  `security definer` que mira `profiles`. Un cliente con sesión no puede subir
  ni borrar una foto.
- **No hizo falta una credencial nueva.** El servidor sube con la sesión del
  admin que está usando el panel, o sea con el mismo cliente de
  `supabase/server.ts` que ya lee quién es. La clave secreta del proyecto sigue
  sin usarse en ningún lado: una credencial que no existe no se puede filtrar.
- **Las URLs que se guardan en `products.images` ahora son absolutas**
  (`https://<proyecto>.supabase.co/storage/v1/object/public/productos/...`). Por
  eso `next.config.ts` declara ese dominio en `images.remotePatterns`:
  `next/image` solo optimiza imágenes de dominios declarados, para que nadie
  use el servidor de imágenes del sitio para procesar fotos ajenas. El dominio
  se deriva de `NEXT_PUBLIC_SUPABASE_URL`, no está escrito a mano.
- El nombre del archivo lleva un sufijo único: dos personas subiendo `foto.jpg`
  el mismo día pisarían una el archivo de la otra sin enterarse.

`public/uploads/` quedó vacío y sin uso. Los paths viejos tipo `/uploads/x.jpg`
que hubiera en la base siguen resolviendo en local, pero no se genera ninguno
nuevo.

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

Hay **dos niveles**, y las cuentas las maneja **Supabase Auth**.

| Quién | Cómo entra | Qué ve |
| --- | --- | --- |
| Visitante sin sesión | — | Catálogo completo: fotos, nombres, códigos, marcas, descripciones. **Sin precios y sin carrito.** En su lugar, botón "Consultar precio" que abre WhatsApp con el artículo ya escrito |
| Cliente | email y contraseña | Todo lo anterior **más** precios, carrito y checkout |
| Admin | email y contraseña | Todo lo del cliente **más** el panel `/admin` |

Es el modelo habitual de un mayorista: la lista de precios es información
comercial y no se muestra en la vía pública, pero el catálogo sí, porque es lo
que trae clientes nuevos.

### Cómo se aplica el muro

`ProductPrice` y compañía (`src/components/price-gate.tsx`) son **Server
Components**. Cuando `showPrices` es `false`, el precio **no se manda al
navegador**: no está escondido con CSS, directamente no viaja en el HTML. Si
estuviera oculto con `display:none` alcanzaría con abrir el inspector.

> Comprobado sobre `/categoria/pinturas`: con sesión el HTML trae 1272 precios
> con formato de pesos; sin sesión, cero.

Los filtros también se sanean **en el servidor** con `withoutPriceFilters()`:
si un anónimo escribe `?sort=precio-desc` a mano en la barra de direcciones, se
ignora. Sin eso, aunque no viera los números, podría deducir de un vistazo cuál
es el artículo más caro del rubro.

`/carrito` y `/checkout` los corta el proxy: sin precios no hay pedido posible.

### Dónde vive cada cosa

Esta app **no guarda contraseñas ni las ve nunca**. Lo único propio es el rol.

| Qué | Dónde | Quién lo administra |
| --- | --- | --- |
| Cuentas, contraseñas, sesiones | `auth.users`, esquema de Supabase | Supabase Auth |
| Rol (`admin` / `cliente`) y si está activa | `public.profiles` | Esta app, desde `/admin/usuarios` |

Las dos tablas comparten el id, y un trigger (`on_auth_user_created`) crea el
perfil solo en cuanto nace la cuenta. Así no existe una cuenta que pueda entrar
pero no tenga rol. Está en la migración `20260909140000_perfiles.sql`.

**Por qué el rol no va en la cuenta de Supabase.** Supabase permite colgarle
datos propios a una cuenta (`app_metadata`), pero escribir ahí exige la **clave
secreta** del proyecto. Una tabla nuestra se administra con la misma conexión a
Postgres que ya usa el resto de la app, sin sumar una credencial más que
cuidar.

### El mecanismo

- El login (`loginAction`, en `src/app/actions/auth.ts`) le pasa el email y la
  contraseña a Supabase, que responde si son válidas y deja la sesión en
  cookies. Después se busca el perfil: si no existe o está inactivo, se deshace
  la sesión recién creada.
- Un solo mensaje de error para todos los motivos de rechazo —email que no
  existe, contraseña equivocada, cuenta desactivada—. Si dijéramos "ese email no
  está registrado", cualquiera podría ir probando direcciones hasta armar la
  lista de las que sí existen, y recién entonces atacar las contraseñas.
- `getSession()` (`src/lib/request-context.ts`) es la función que usa toda la app
  para preguntar "¿quién es este?". Junta las dos mitades: quién es lo dice
  Supabase, qué rol tiene lo dice `profiles`.
  - Usa `getUser()` y no `getSession()` de Supabase. La diferencia importa:
    `getSession()` se cree lo que dice la cookie, que el navegador puede haber
    modificado; `getUser()` valida el token contra el servidor de Auth.
  - Va envuelta en `cache()` de React. Una página pregunta por el visitante
    varias veces —el header, el layout, cada ficha— y sin eso serían varios
    viajes para responder siempre lo mismo.
- `src/proxy.ts` corre antes de resolver la página. Hace tres cosas: renueva el
  token si está por vencer, resuelve el idioma y corta el paso a `/admin/*`,
  `/api/admin/*`, `/carrito`, `/checkout` y `/api/lista-precios`. En las de API
  devuelve `401` en JSON en vez de redirigir, porque un `fetch` no sabe qué hacer
  con una página de login.
  > Nombre: en Next 16 el archivo se llama `proxy.ts` y exporta `proxy()`. Hasta
  > Next 15 era `middleware.ts` / `middleware()`. Es exactamente lo mismo; si
  > leés un tutorial que dice "middleware", habla de este archivo.
- El botón "Cerrar sesión" está en el header de la tienda y en el del panel.

### Lo que el proxy no puede saber, y por qué no importa

El proxy corre en Edge, que **no puede abrir una conexión a Postgres**. El rol
vive en `profiles`, así que ahí es inalcanzable. Por eso el proxy responde una
sola pregunta: **¿hay sesión o no?**.

Para `/admin` eso solo saca a los anónimos. Que sea admin de verdad lo verifica
`src/app/admin/layout.tsx`, que corre en Node, y cada endpoint de `/api/admin`.
No se filtra nada: el layout redirige antes de renderizar una línea del panel.

Y tiene una ventaja sobre el esquema anterior. Antes el rol viajaba firmado
adentro de la cookie, o sea que era una foto del momento del login: bajar a
alguien de admin a cliente no tenía efecto hasta que venciera la sesión. Ahora el
rol se lee de la base en cada request, así que el cambio es inmediato.

> El costo es una llamada al servidor de Auth por request **con sesión**. Un
> visitante anónimo no paga nada: sin cookie, la librería contesta al instante
> sin salir a la red. Medido: las rutas protegidas rechazan a un anónimo en 2 ms.

### Restablecer contraseñas

El panel **no puede** ponerle una contraseña a otra cuenta: para eso haría falta
la clave secreta del proyecto. Y está bien que no pueda, porque la contraseña de
una persona no debería pasar por las manos de otra.

En su lugar manda un mail con un link de un solo uso, que aterriza en
`/actualizar-password`. Esa página es la única del sitio que habla con Supabase
**desde el navegador**, y no es un capricho: el token viene en el fragmento de la
URL —la parte después del `#`— y los navegadores nunca mandan el fragmento al
servidor. Es a propósito de Supabase: así el token no queda escrito en los
registros del servidor.

> ⚠️ El servidor de correo que Supabase trae por defecto manda muy pocos mails
> por hora y **solo a integrantes del proyecto**. Para usarlo con clientes reales
> hay que configurar un SMTP propio en el panel de Supabase.

### El primer admin

Para entrar al panel hay que ser admin, y alguien tiene que crear el primero.
Ese es el único caso que se resuelve por terminal:

```sh
npm run db:usuario -- sofia@ejemplo.com admin
```

Pide la contraseña por teclado, sin mostrarla. Hace tres cosas: crea la cuenta en
Supabase Auth, le confirma el email (el alta la hace alguien con acceso a la
terminal del proyecto, no hace falta que espere un correo) y le pone el rol al
perfil. Si el email ya tiene cuenta no falla: le corrige el rol y la reactiva,
que es lo que hace falta cuando alguien se quedó afuera del panel.

**Lo que NO hace es cambiarle la contraseña a una cuenta que ya existe.** Para
eso está el mail de restablecimiento, y para cuando el mail no es una opción
—el correo por defecto de Supabase sólo escribe a integrantes del proyecto— hay
una salida de emergencia por terminal:

```sh
npm run db:password -- sofia@ejemplo.com
```

Escribe el hash bcrypt directo en `auth.users` con `pgcrypto`, que es el mismo
formato que guarda Supabase Auth, y de paso cierra las sesiones abiertas de esa
cuenta. Va por SQL y no por la API de administración de Supabase porque esa API
pide la clave secreta del proyecto, y la regla de la casa es no tenerla.

**Flag de catálogo privado:** `requireLoginForCatalog` en `src/config/site.ts`.
Default `false`. En `true`, el proxy protege también el catálogo y no se ve
absolutamente nada sin sesión.

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

### La carga inicial del catálogo real

El catálogo de muestra (33 artículos inventados, códigos tipo `ACC-2201`) se
reemplazó por el listado real del proveedor: **1230 artículos con precio al
28-05**. Lo hace `scripts/importar-lista.mjs`:

```sh
node --env-file=.env.local scripts/importar-lista.mjs --dry-run   # solo informa
node --env-file=.env.local scripts/importar-lista.mjs             # respalda, borra e inserta
MOSTRAR=200 node ... --dry-run                                    # lista más sin clasificar
```

No usa el flujo de `/admin/precios` porque ahí no hay nada que actualizar: los
códigos del proveedor son numéricos y ninguno cruzaba con los de muestra. Y crea
los productos **activos**, al revés que `updatePriceList()`, que da de alta los
nuevos ocultos porque llegan sin foto: con 1230 el catálogo se habría visto
vacío.

Tres cosas que resolvió y conviene no volver a descubrir:

1. **Las fracciones ¼ y ½ rompían el slug.** `slugify` borra todo lo que no sea
   letra o número, así que `X ¼ LT.` y `X ½ LT.` daban el mismo slug y la
   segunda variante terminaba en `-2`. Se escriben `1/4` y `1/2`, y los dígitos
   sobreviven. Son 34 productos, todos variantes de tamaño del mismo artículo.
2. **La categoría sale del nombre, no del código.** El rango de código no agrupa
   nada: el 1400 mezcla tacos de madera con protectores para madera, y 489
   artículos tienen código de 5 dígitos sin orden temático. Las reglas están en
   la constante `REGLAS`, en orden, gana la primera que coincide. Quedan ~75 sin
   categoría (6%): yeso, pastina y sueltos varios.
3. **Se sumaron dos categorías**, `Cintas y Adhesivos` y
   `Ferretería y Herramientas`, para lo que no entraba en las seis originales.
   Sus ilustraciones de respaldo salen de
   `scripts/generar-imagenes-categorias.mjs`, que tiene el dibujo de cada slug
   escrito a mano: **si agregás una categoría, agregala también ahí**, porque la
   home hace `src={category.image ?? ""}` y con `null` la ficha se rompe.

El listado llega en PDF y el panel espera Excel; ese puente todavía se hace a
mano. Ver la sección 9.

---

## 6 bis. Fotos de producto, traídas de los proveedores

`scripts/fotos-proveedores.mjs`. El catálogo son 1230 artículos sin una sola foto
propia. Las dos marcas que más pesan publican las suyas en sus sitios, así que se
traen de ahí.

```sh
npm run fotos:catalogo    # baja las dos listas → datos-proveedores/catalogo.json
npm run fotos:proponer    # cruza con la base   → fotos-propuestas.xlsx
npm run fotos:aplicar -- --dry-run   # qué haría
npm run fotos:aplicar                # sube y anota
```

**Son tres pasos porque el del medio lo tiene que mirar una persona.** El
proveedor tiene una foto por LÍNEA ("RECUPLAST INTERIOR - MATE") y esta base una
fila por ARTÍCULO ("Recuplast Interior Mate 4 lt."), con los nombres abreviados
como los manda el proveedor. Cruzar las dos listas es adivinar con reglas, y las
reglas se equivocan. Mejor que se equivoquen sobre un Excel. Es el mismo criterio
de `/admin/precios`: primero la previsualización, después la confirmación.

### De dónde sale cada catálogo

- **Sinteplast** arma su listado desde el navegador pidiéndole los productos a
  `/php/producto_GET.php`. Con el filtro vacío devuelve los 265 de una, así que
  es **un solo pedido** en vez de recorrer las 34 secciones.
- **Kuwait** está hecho en Wix y no tiene una llamada así, pero sí el sitemap con
  las 27 fichas. De cada una se leen el `<title>` y la primera imagen del
  contenido. Son 27 pedidos, con pausa entre uno y otro, y un reintento: Wix a
  veces devuelve la página sin el contenido dinámico y una sola respuesta rara
  dejaría afuera a toda una línea.

Las fotos de Wix traen el tamaño escrito en la propia dirección
(`/v1/fit/w_800,h_800,.../`). Se reescribe a 1200 px en vez de bajar la original,
que en varias fichas pesa megas.

### Cómo se cruzan las dos listas

**Sinteplast: la marca de línea es el ancla.** "Latex Interior 4 lt" no dice de
quién es; "Recuplast Interior Mate 4 lt." sí. Primero se busca una de las líneas
conocidas (`LINEAS_SINTEPLAST`) en el nombre del artículo y recién **entre los
productos de esa línea** se elige el más parecido. Sin ese paso, "Manta
Sint.Media" se llevaba la foto de SINTESPRAY porque empieza igual, y "Mascarilla
Anti Polvo" la de ANTIBURBUJAS.

Tres detalles que cambiaron el resultado:

1. **"SINTEPLAST" no cuenta como palabra.** El sitio firma medio catálogo con la
   marca al final ("AGRESTE SINTEPLAST"). Contándola, "Recuplast Agreste" se
   parecía tanto a esa ficha como a cualquier otro RECUPLAST; sin contarla, gana
   la correcta.
2. **Se prueban todas las líneas del nombre, no la primera.** "Recuplast Agreste"
   nombra dos.
3. **Hay palabras que cambian el producto, no el acabado**: hidro, epoxi,
   membrana, fibrado, atérmico. "Recuplast Hidro Bco Satin" es un esmalte al agua
   y "RECUPLAST INTERIOR - SATINADO" un látex de pared. Si el artículo trae una
   de esas palabras y la foto candidata no, la fila baja a REVISAR.

**Kuwait no tiene marca escrita en esta base**: sus productos están cargados como
"Aerosol Amarillo x 240 cm3". Lo que se sabe es que los aerosoles de la casa son
Kuwait, así que el cruce va por TIPO y sólo dentro de la categoría Aerosoles, con
reglas en orden (`REGLAS_KUWAIT`), como las reglas de categoría de
`importar-lista.mjs`. En esa categoría también hay aerosoles de Sinteplast
—"Brillospray Max Epoxi"—, así que si el nombre nombra una línea de Sinteplast la
regla de Kuwait no se aplica.

### El Excel

Dos hojas. En `propuestas`, una fila por artículo, **ordenadas por foto**: cada
bloque es "estos doce artículos se llevan esta misma foto", que es como conviene
revisarlo. La columna `aplicar` viene con:

- **SI** cuando coincidió algo más que la línea;
- **REVISAR** cuando coincidió sólo la línea. La foto es de esa línea, pero puede
  no ser la del artículo. Son casi todos los Brilloplast y los Satinplast: el
  sitio tiene dos latas de esmalte casi iguales y el nombre no alcanza para saber
  cuál va.

Para corregir una fila se escribe en la columna `foto` el nombre de otra de la
hoja `catalogo`. Al aplicar, la dirección se busca **por ese nombre**, no por la
columna `url`, justamente para que la corrección a mano tenga efecto.

### La subida

Las fotos van al mismo bucket `productos` de Supabase Storage donde sube el
panel, y por el mismo camino: **el script inicia sesión con un usuario admin de
verdad** y sube con esa sesión. La otra forma sería la clave secreta del
proyecto, que saltea las políticas, pero la regla de la casa es no tenerla: una
credencial que no existe no se puede filtrar. La contraseña se pide por teclado
y no se pasa por argumento, que quedaría en el historial de la terminal.

Una misma foto le toca a muchos artículos, así que **se sube una sola vez** y
todos guardan la misma dirección. Se convierte a WebP de hasta 1200 px, sin
agrandar las que vienen más chicas (las de Sinteplast son de 500 px de ancho).
Lo que se anota en la base va en una transacción: o quedan todos los artículos
apuntando a su foto o no queda ninguno.

Ni el catálogo bajado ni el Excel se versionan (`.gitignore`): son datos que se
vuelven a bajar cuando hagan falta. Lo versionado es el resultado, que vive en
Storage y en `products.images`.

---

## 6 ter. Fotos del sitio viejo (wiedmer.com.ar)

`scripts/fotos-sitio.mjs`. La otra fuente de fotos propias es el sitio que la
empresa ya tiene publicado: 240 fichas, con foto de estudio y fondo blanco, de
artículos que son exactamente los de este catálogo.

```sh
npm run sitio:catalogo   # baja fichas y fotos → imagenes/sitio-wiedmer/
npm run sitio:proponer   # cruza con la base   → fotos-sitio-propuestas.xlsx
npm run sitio:aplicar -- --dry-run   # qué haría
npm run sitio:aplicar                # sube a Storage y anota
```

Son los mismos tres pasos que `fotos-proveedores.mjs` y por el mismo motivo: el
sitio tiene una ficha por PRODUCTO y esta base una fila por ARTÍCULO (el mismo
producto en 1/4, 1 y 4 litros), así que el cruce se hace por parecido de nombre
y hay que mirarlo antes de aplicarlo.

**De dónde salen las fotos.** El catálogo está en `/productos/pag/N`, de a 64.
Cada ficha guarda sus fotos en una carpeta con su id, y publica dos tamaños:

    /webfiles/wiedmer/productos/<id>/1_500x500.jpg     ← la del listado
    /webfiles/wiedmer/productos/<id>/1_1000x1000.jpg   ← la de la ficha

Se baja la de 1000, que es la más grande que hay, y se prueban `2_`, `3_`… hasta
el primer 404: así se levantan las fichas que tienen más de una foto sin tener
que abrir cada una.

> El detalle que costó: el listado se parsea cortando por
> `<div class="tt-product `, **con el espacio final**. Adentro de cada tarjeta
> hay otro `<div class="tt-product-inside-hover">`, y sin el espacio el corte lo
> agarra también: cada ficha salía dos veces, la segunda sin título.

**Dónde quedan los originales.** En `imagenes/sitio-wiedmer/`, junto al resto de
los originales del proyecto, fuera de `public/` y sin versionar: son datos que se
vuelven a bajar cuando hagan falta. Lo que termina en el sitio es la copia WebP
de hasta 1200 px que el paso `aplicar` sube a Supabase Storage, por el mismo
camino que el panel: iniciando sesión con un admin de verdad, no con una clave
secreta.

**Por defecto no le toca la foto a un artículo que ya tiene una**, así que no
pisa lo que trajo `fotos-proveedores.mjs`. Para revisar también esos,
`npm run sitio:proponer -- --pisar`.

## 6 quater. Unificar las fotos (mismo fondo, tamaño y margen)

`scripts/unificar-fotos.mjs` y `scripts/unificar-en-storage.mjs`. Las fotos vienen
de tres lugares (Sinteplast, Kuwait y el sitio viejo) y cada una tiene su fondo,
su encuadre y su luz. Para que el catálogo se vea parejo, **toda foto pasa por
la misma función antes de subirse**: `unificar()`.

```sh
npm run fotos:unificar -- --dry-run                 # procesa y deja copias en imagenes/, NO sube
npm run fotos:unificar                              # sube y reapunta (pide email y contraseña de un admin)
npm run fotos:unificar -- --desde-respaldo          # rehace partiendo de los ORIGINALES
```

`fotos-proveedores.mjs aplicar` y `fotos-sitio.mjs aplicar` llaman a la misma
función, así que las fotos nuevas salen ya unificadas.

### Qué le hace a cada foto (sin IA, solo `sharp`)

1. **Fondo a blanco.** El color del fondo se estima con la **mediana** de una
   franja de 12 px en los bordes (la mediana no se deja engañar por un producto
   que roza el borde) y se multiplica cada canal para que ese color pase a
   blanco puro. Es el mismo principio que el balance de blancos de una cámara.
   Después todo lo que queda casi blanco (≥ 232) se manda a 255, y con eso
   desaparecen los degradados leves y las sombras suaves.
2. **Encuadre.** Se busca el rectángulo que contiene todo lo que no es blanco y
   se recorta a eso.
3. **Tamaño.** El recorte se centra en un lienzo de **1000 × 1000** con **8 %**
   de margen por lado y se guarda en WebP calidad 85.

Lo que **no** hace: no cambia la luz del producto en sí (si una lata se
fotografió más oscura, sigue más oscura), no endereza fotos tomadas en diagonal
y no saca sombras fuertes. Eso exigiría recortar el producto con un modelo de IA
y volver a iluminarlo, con riesgo de bordes raros. Para una foto realmente
pareja hay que sacarla con fondo y luz fijos.

### Dos cosas que costaron

- **La transparencia hay que pintarla de blanco antes de todo.** Las fotos de
  Kuwait son WebP con fondo transparente. Con `removeAlpha()` los píxeles
  transparentes quedaban negros o grises, eso movía el recorte y la lata
  terminaba corrida con una línea gris. Se usa `flatten({ background: "#fff" })`.
  Afectaba a los 29 productos que comparten la foto de Línea Clásica.
- **Agrandar una foto chica la pixela.** Las de Sinteplast llegan de 500 × 750 px
  y el producto mide unos 460 px de alto, así que llenar el cuadro es estirarlas
  casi al doble. Sinteplast no publica nada más grande. Por eso el agrandado
  tiene **tope de 1,5×** con un realce leve de nitidez (`MAX_AMPLIACION`,
  `NITIDEZ`). El costo: esas fotos ocupan menos lugar en el cuadro que una
  lata de 1000 px. Es un compromiso entre nitidez y tamaño parejo; si se quiere
  que llenen el cuadro, se sube el tope y se acepta la pixelación.

### Cómo se rehace lo que ya está subido

`unificar-en-storage.mjs` junta las direcciones **distintas** del bucket
`productos` (una foto la comparten muchos artículos: 136 fotos cubrían 454
productos), baja cada una, la unifica y la sube con un nombre nuevo (`u-…`). No
pisa la anterior: sigue en Storage. Después reapunta los productos en una
transacción.

- **Respaldo antes de escribir.** Guarda `id` e `images` de cada producto en
  `respaldos/products-images-<fecha>.json`. Si ya existe uno del día **no lo
  pisa**: puede ser el estado original de antes de una corrida anterior. Volver
  atrás es volver a escribir esas direcciones.
- **`--desde-respaldo` existe para no agrandar dos veces.** Si se repitiera el
  proceso sobre las fotos ya unificadas, se estaría estirando una foto que ya se
  estiró. Con ese flag se parte de las direcciones **originales** del respaldo
  más viejo, y solo para los productos que siguen apuntando a una foto `u-…`
  (los que se cambiaron a mano no se tocan).
- Un producto se reapunta solo si **todas** sus fotos del bucket se pudieron
  reemplazar.

### Cargar fotos propias en lote (`scripts/fotos-lote.mjs`)

Para los productos que ninguna fuente cubre. El Excel agrupa por artículo, así
que una sola foto de lata puede asignarse a todos sus colores y tamaños.

```sh
npm run lote:plantilla              # fotos-lote.xlsx: una fila por producto sin foto
npm run lote:aplicar -- --dry-run   # unifica y deja copias en imagenes/fotos-lote-previa/, NO sube
npm run lote:aplicar                # sube y anota (pide email y contraseña de un admin)
```

1. Poner las fotos en `imagenes/fotos-nuevas/` (jpg, png o webp).
2. En la columna `archivo` del Excel, escribir el nombre de la foto de cada
   producto; repetirlo si varios comparten la misma. Las filas vacías se ignoran,
   así que se puede completar de a poco y volver a correr.
3. `aplicar` unifica cada foto, la sube **una vez** y la anota en todos los que la
   nombran, en una transacción.

Por defecto **no toca productos que ya tienen foto**; `--pisar` los reemplaza y
guarda antes un respaldo en `respaldos/`. Un archivo que falla (por ejemplo un
HEIC del iPhone, que `sharp` no abre: hay que pasarlo a JPG) se reporta y no
frena al resto. `unificar()` respeta la orientación EXIF, así que las fotos de
celular "acostadas" salen derechas.

### Aprobar propuestas: no confiar en el puntaje

Los Excel de `fotos:proponer` y `sitio:proponer` marcan casi todo `REVISAR`, y
con razón: el puntaje de parecido llega a 0,67 como máximo y **no separa lo
bueno de lo malo**. Entre las propuestas había "Látex Azul Traful" → una foto de
Enduido, "Masilla Trimas" → láminas plásticas y "Barniplast" → Barniz Ignífugo.
Una foto equivocada en un catálogo mayorista es peor que no tener foto, así que
se aprueban a ojo, **mirando la foto**, y solo cuando coinciden producto y marca.
Una foto de línea (la lata de Brilloplast) sí sirve para todos los colores de esa
línea. Al aplicar, las filas ya subidas se marcan `HECHO` para que un segundo
`aplicar` no las repita.

Estado al cerrar esta sección: **741 de 1230 productos con foto**. Los 489 que
faltan no tienen foto en ninguna de las dos fuentes; están sobre todo en
Pinturas (esmaltes por color, antióxidos y convertidores). La lista sale de la
base: productos activos con `cardinality(images) = 0`.

> **Detalles del entorno que conviene saber.** El prompt del script (`Email del
> admin: `) no termina en salto de línea, así que parece que el script se colgó
> cuando en realidad espera que se escriba. Y la versión ESM de la librería de
> Excel necesita `XLSX.set_fs(fs)` (o leer/escribir con `fs` a mano) antes de
> abrir o guardar archivos, o falla con "Cannot access file".

---

## 7. Checkout por WhatsApp

El número destino sale de la tabla `store_config` → `whatsapp_number` (solo dígitos,
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
cp .env.example .env.local   # completar las variables
npm run db:push              # crea las tablas y carga el catálogo
npm run dev                  # http://localhost:3000
```

Variables a completar:

| Variable | De dónde sale |
| --- | --- |
| `DIRECT_URL` | Supabase → Project Settings → Database → Connection string → **Session pooler (5432)**. Es la que usa la app |
| `DATABASE_URL` | La misma pantalla → Transaction pooler (6543). Hoy no la usa nadie; ver el recuadro de la sección 3 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | La misma pantalla. Es pública: viaja al navegador |

Las tres son **obligatorias**: sin base no arranca, y sin las de Supabase no
hay login posible.

Ya no hay credenciales en el `.env`: las cuentas viven en Supabase Auth. Para
crear el primer admin:

```sh
npm run db:usuario -- tu@email.com admin
```

Login: http://localhost:3000/login

Para verificar que la base quedó bien: `npm run db:check`.

> El CLI de Supabase se instaló como dependencia de desarrollo, así que no hace
> falta instalarlo aparte ni con Homebrew: `npm install` ya lo trae. Sí hace
> falta Docker, pero **solo** para levantar una copia local de Supabase; para
> aplicar migraciones contra la nube, que es lo que hacen estos scripts, no.

Para probar el idioma inglés en local, cambiá el idioma preferido del navegador
o usá el selector ES/EN del header.

### Deploy en Vercel

1. Subir el repo a GitHub.
2. En Vercel: *New Project* → importar el repo → cargar en *Environment
   Variables* `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL` y
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` → *Deploy*.
   Las tres son obligatorias: sin la primera el sitio no levanta, sin las otras
   dos nadie puede iniciar sesión.
   La detección de idioma por país de IP **solo funciona en Vercel**: es Vercel
   quien agrega el header `x-vercel-ip-country`.
3. Las migraciones se aplican desde tu máquina con `npm run db:push`, no en el
   build de Vercel. Es a propósito: que un deploy cambie el esquema solo es la
   forma más rápida de romper producción sin darse cuenta.
4. En Supabase → *Authentication* → *URL Configuration*, poner el dominio
   nuevo como **Site URL** y agregar `https://<dominio>/actualizar-password` a
   las **Redirect URLs**. Sin eso, el link de restablecer contraseña que llega
   por mail apunta a `localhost`.

**Dos archivos que ya están puestos:**

- `vercel.json` fija la región de las funciones en `gru1` (São Paulo), que es
  donde vive la base (`aws-0-sa-east-1`). Por defecto Vercel las pondría en
  Washington y cada consulta cruzaría el continente dos veces. Si se muda el
  proyecto de Supabase, hay que cambiar también este archivo.
- `.vercelignore` deja afuera `imagenes/` (20 MB de originales), `remotion/`,
  `supabase/` y `scripts/`: nada de eso participa del build. Se aplica siempre,
  también cuando el deploy viene de GitHub; el log del build lo dice
  ("Removed N ignored files defined in .vercelignore").
  > **Cada patrón lleva `/` adelante y no es decorativo.** Sin la barra, el
  > patrón coincide con cualquier carpeta de ese nombre a cualquier
  > profundidad: escrito `supabase/`, se lleva puesta también
  > `src/lib/supabase/`, que es el código del login, y el deploy falla con
  > siete "Module not found". En local no se nota, porque este archivo solo
  > actúa durante el deploy. Ya pasó una vez.

---

## 9. Pendientes / próximos pasos

1. ~~**Supabase**~~ — hecho: los datos viven en Postgres. El esquema está en
   `supabase/migrations/` y la conexión en `src/lib/db.ts`.
2. ~~**Imágenes**~~ — hecho: las fotos de producto van a Supabase Storage
   (bucket `productos`). Ya nada escribe en el filesystem del servidor.
3. ~~**Credenciales**~~ — hecho: las cuentas las maneja Supabase Auth y el rol
   vive en `public.profiles`. Ya no hay contraseñas en el código ni en el `.env`.
4. **SMTP propio** — el correo que trae Supabase por defecto manda muy pocos
   mails por hora y solo a integrantes del proyecto. Sin un SMTP configurado en
   el panel de Supabase, el link de restablecer contraseña no le llega a un
   cliente real.
5. **Persistencia de pedidos** — hoy el pedido solo viaja por WhatsApp; guardarlo
   en una tabla `orders` para tener historial. Ahora que hay base, es agregar una
   migración y una función en `data-source.ts`.
6. **Precios mayorista/minorista** — hoy hay un solo precio y el corte es
   "ve / no ve". El lugar donde se decide es `canSeePrices()` en
   `src/lib/auth.ts`: está en una función propia justamente para que el día que
   existan dos listas se cambie en un solo lugar.
7. **Imágenes reales de producto** — avanzado: 741 de 1230 con foto, todas
   unificadas (secciones 6 bis, 6 ter y 6 quater). Faltan 489: los esmaltes
   sintéticos por color, los antióxidos y convertidores, y los artículos sueltos
   de ferretería. Hay que sacarlas o pedírselas al proveedor.
8. ~~**Borrar los `.json` viejos**~~ — hecho.
9. **Usar el video en el hero** — el `.mp4` ya está renderizado
   (`public/video/hero-pintura.mp4`) pero la home sigue mostrando `HeroCanvas`.
   Falta decidir cuál queda: el canvas pesa ~6 KB y usa los azules de la marca;
   el video pesa 1,1 MB y es una escena real. Si gana el video, se reemplaza
   `<HeroCanvas />` por un `<video muted loop playsInline autoPlay preload="none"
   poster="/video/hero-pintura.jpg">` y hay que acordarse de dos cosas: en
   `prefers-reduced-motion` mostrar sólo el póster, y no ponerle `autoPlay` sin
   `muted` porque los navegadores lo bloquean.
10. **PDF del proveedor → Excel** — el listado mensual llega en PDF y
   `/admin/precios` espera Excel. La conversión de la carga inicial se hizo a
   mano. Para dejarlo repetible hace falta leer PDF desde Node: agregar
   `pdfjs-dist` como dependencia de desarrollo y escribir
   `scripts/pdf-a-excel.mjs`. Con eso, el mes que viene es convertir y subir el
   archivo por el panel, que ya muestra la preview con los cambios y el
   porcentaje.
11. **Los 540 sin precio** — el PDF los lista en cero. Quedaron fuera de la
    carga, en la hoja `sin-precio` de `lista-precios-2026-05-28.xlsx`. Ni ese
    Excel ni el PDF del proveedor se versionan (`.gitignore`): son datos que
    llegan cada mes, no código. Viven en la máquina donde se hizo la carga.
12. **SEO en inglés** — hoy el idioma va por cookie y Google indexa una sola
   versión de cada URL. Si hace falta, migrar a rutas `/es/…` y `/en/…`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
