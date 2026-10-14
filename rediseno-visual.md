# Rediseño visual – Wiedmer (modo día)

Oct 14, 2026 · @Sofi Bufarini

El sitio pasa a usarse en modo día (claro) por defecto, con botones y animaciones que se sientan tecnológicos sin perder seriedad institucional, y un catálogo donde cada producto agrupa sus variantes de color y tamaño, cada una con su propio código.

## Sistema visual

Modo día por defecto y modo noche como opción, con un mismo set de colores, tipografías y animaciones en todo el sitio.

### Paleta (modo día)

| Uso | Color sugerido | Dónde |
| --- | --- | --- |
| Fondo principal | Blanco cálido #FAFAF7 | Páginas |
| Fondo de secciones alternas | Gris muy claro #F1F3F6 | Bloques que se intercalan |
| Azul institucional | Azul Wiedmer #1E3A8A | Logo, títulos, menú activo |
| Acento | Naranja obra #F97316 | Solo botones principales, precios y "Agregar" |
| Texto | Grafito #1F2937 | Cuerpo de texto |
| Bordes | #E5E7EB | Tarjetas, separadores |

El modo noche actual se conserva como opción del botón luna, con la misma estructura de colores.

### Tipografía

- Títulos: una grotesca condensada con carácter industrial (Archivo o Barlow Condensed), en mayúsculas para los rótulos chicos.
- Texto y datos: la fuente actual. Los códigos de producto en una monoespaciada (JetBrains Mono o IBM Plex Mono), así se leen como dato técnico.

### Botones

- **Principal (naranja):** al pasar el mouse, un brillo que recorre el botón de izquierda a derecha y la flecha se desplaza 4 px. Al hacer clic, se hunde levemente (escala 0,97).
- **Secundario (contorno azul):** el relleno azul sube desde abajo al pasar el mouse y el texto pasa a blanco.
- **Botón magnético** en los llamados a la acción del inicio: sigue al cursor unos píxeles cuando se acerca.
- **Estados de carga:** al enviar o agregar, el texto se reemplaza por un spinner y termina en un tilde animado.
- **Foco visible** en todos los botones para navegación con teclado.

### Animaciones

- Aparición al hacer scroll: 300 ms, desplazamiento de 12–16 px, disparada antes de que el bloque entre en pantalla. Elementos de una misma fila con un escalonado de 60 ms.
- Transiciones entre páginas con View Transitions: la foto de la tarjeta "vuela" y se convierte en la foto de la ficha.
- Una sola curva de animación para todo el sitio (ease-out suave).
- Se respeta la opción "reducir movimiento" del sistema: con ella activa, todo aparece sin animación.

## Inicio, sección por sección

| Sección | Qué se cambia | Botones y animación |
| --- | --- | --- |
| Encabezado | Fondo blanco; al bajar se achica y queda translúcido con desenfoque. Ícono de carrito con contador e ícono de usuario | El contador del carrito "salta" al agregar un producto. Buscador que se expande al hacer foco |
| Buscador | Resultados mientras escribís, con foto, código y categoría; búsqueda exacta por código | Lista desplegable con aparición escalonada; atajo de teclado "/" para abrir |
| Menú | Mega-menú con subcategorías y una foto destacada por categoría | Subrayado que se desliza entre ítems; el panel baja con fundido de 200 ms |
| Hero | Foto a pantalla completa con texto encima; dos botones: "Ver catálogo" (naranja) y "Soy cliente – Ingresar" (contorno) | Zoom lento de la foto (o video corto en loop); el título aparece palabra por palabra; botones magnéticos |
| Cifras | Franja bajo el hero: +1.100 productos, 6 provincias, reparto semanal, años de trayectoria | Contadores que suben de 0 al número al entrar en pantalla |
| Marcas | Franja de logos de marcas (Sinteplast, Doble B, Pinas, Trimas…) | Desplazamiento continuo; logos en gris que toman color al pasar el mouse |
| Diferenciales | Se suben justo después de las cifras; cuatro tarjetas con un dato grande cada una | Íconos de línea que se "dibujan" al aparecer; leve elevación al pasar el mouse |
| Categorías | Grilla tipo bento con Pinturas en grande; todas con foto real | Zoom suave de la foto, aparece "147 productos" y la flecha avanza; efecto de inclinación 3D sutil siguiendo el mouse |
| La empresa | Foto real del depósito o de los camiones; año de fundación | Mapa de Argentina en SVG con las provincias de cobertura que se pintan una por una |
| Mapa del depósito | Estilo claro y limpio, marcador con el logo; tarjeta flotante con dirección, horario y "Cómo llegar" | El marcador cae y rebota una vez al entrar en pantalla |
| Cómo se compra | Los tres pasos unidos por una línea; al costado, mockup del mensaje de WhatsApp con el pedido | La línea se completa con el scroll; el mensaje se "escribe" solo |
| Llamado final | Foto y nombre de un vendedor real; botones "WhatsApp" y "Llamar" | Fondo azul con un degradado animado muy lento |
| Pie de página | Redes, CUIT y razón social, "Descargar lista de precios (PDF)" para clientes, selector de idioma, "Volver arriba" | Enlaces con subrayado que crece desde el centro |
| Botón de WhatsApp | Fijo abajo a la derecha | Pulso solo la primera vez; a los pocos segundos, una burbuja "¿Te ayudo con un pedido?" que se puede cerrar |

## Catálogo: un producto por tarjeta

Cada categoría muestra el producto una sola vez y sus colores y tamaños quedan como variantes dentro. Pinturas pasa de 636 tarjetas a unas 150.

- **Tarjeta:** foto sobre fondo gris claro uniforme, etiqueta de marca en la esquina, nombre del producto y una línea de resumen: "5 presentaciones · 12 colores".
- **Muestras de color:** círculos chicos con los colores disponibles debajo del nombre. Al pasar el mouse por un círculo cambia la foto de la tarjeta, si hay foto por color.
- **Chips de tamaño:** ¼ · ½ · 1 · 4 · 20 lt, solo como información en la tarjeta.
- **Al pasar el mouse:** la tarjeta se eleva con sombra suave y aparece el botón "Ver variantes".
- **Filtros laterales:** marca, presentación, color, uso (interior o exterior) y terminación. Al filtrar, las tarjetas se reacomodan con una animación de reordenamiento.
- **Carga:** paginado o "cargar más" con tarjetas esqueleto mientras llegan los datos.

## Variantes y códigos

El producto es el "padre" y cada variante (color + tamaño) es una fila con su propio código, precio y stock. El código de cada variante es el que ya existe hoy, así la lista de precios se sigue importando por código sin cambios.

| Producto (padre) | Color | Tamaño | Código | Precio |
| --- | --- | --- | --- | --- |
| Esmalte Sintético Doble B | Aluminio | ¼ lt | 36210 | de la lista |
| Esmalte Sintético Doble B | Aluminio | ½ lt | 36220 | de la lista |
| Esmalte Sintético Doble B | Aluminio | 1 lt | 36230 | de la lista |
| Esmalte Sintético Doble B | Aluminio | 4 lt | 36240 | de la lista |
| Esmalte Sintético Doble B | Amarillo | 1 lt | 35030 | de la lista |

- **Importar una lista de precios:** se sube el Excel con código y precio; el sistema busca cada código, actualiza el precio de esa variante y muestra un resumen de actualizados, sin cambios y códigos no encontrados.
- **Agrupar lo existente:** se arma una tabla de equivalencias código → producto padre + color + tamaño. Gran parte se puede deducir de los nombres actuales ("Amarillo Sintetico Bb x 1/2"), y lo que no, se revisa a mano.
- **Códigos nuevos:** si la lista trae un código que no existe, queda en una bandeja de "pendientes de asignar" para elegir a qué producto padre pertenece.

## Ficha de producto (cliente logueado)

La ficha se arma en dos columnas: a la izquierda la foto, a la derecha la compra. Debajo, la carpeta técnica a todo el ancho. En celular todo queda en una columna y la barra de compra se fija abajo.

**Columna izquierda**

1. Foto grande con zoom al pasar el mouse y miniaturas debajo.
2. La foto cambia con un fundido cuando se elige otro color.

**Columna derecha, en este orden**

1. Marca con su logo, nombre del producto y etiqueta de uso (Interior / Exterior).
2. **Botones de color:** círculos con el color real; el elegido queda con un anillo. Los colores sin stock se ven tachados.
3. **Botones de tamaño:** píldoras ¼ · ½ · 1 · 4 · 20 lt. El indicador de selección se desliza de un botón a otro.
4. **Código de la variante elegida** en tipografía monoespaciada, con botón para copiarlo (muestra "Copiado" con un tilde).
5. **Precio:** al cambiar de variante, los números giran hasta el nuevo valor. Al lado, el precio por litro para comparar presentaciones.
6. **Stock y entrega:** punto verde "Disponible" o naranja "Consultar", y "Sale en el próximo reparto".
7. **Cantidad y agregar:** contador +/− y botón naranja "Agregar al pedido". Al agregar, una miniatura del producto vuela hasta el carrito.
8. **Tabla de presentaciones:** todas las variantes con código, tamaño, precio y cantidad, para cargar varias de una vez. Es la vista más rápida para un comprador que repone.

Cada variante tiene su propia dirección web (por ejemplo, "?codigo=36230"), así un vendedor puede mandar el enlace exacto.

**Carpeta técnica (debajo, a todo el ancho)**

Se muestra solo a clientes logueados, organizada en pestañas con transición deslizante:

| Pestaña | Contenido |
| --- | --- |
| Datos técnicos | Rendimiento (m² por litro), manos recomendadas, secado al tacto y entre manos, dilución, terminación, superficies aptas |
| Modo de uso | Preparación de la superficie, aplicación y limpieza de herramientas, en pasos numerados |
| Documentos | Ficha técnica y hoja de seguridad del fabricante en PDF, con vista previa y descarga |
| Productos complementarios | Lo que se usa con este producto: diluyente, fondo, lija, rodillo o pincel, con botón "Agregar" |

La información técnica se carga una vez por producto padre y vale para todas sus variantes. Los PDF se suben desde el panel de administración y se buscan en la web de cada fabricante.

## Login y celular

**Login**

- Pantalla partida: a la izquierda una foto del depósito o de los productos con una frase institucional; a la derecha el formulario sobre fondo blanco.
- Campo de contraseña con botón para mostrarla y enlace "¿No tenés usuario? Pedíselo a tu vendedor por WhatsApp".
- Al ingresar: el botón pasa a tilde, transición suave al catálogo y saludo con el nombre del comercio ("Hola, Pinturería San Martín").
- Una vez dentro, los precios aparecen en todas las tarjetas con un fundido escalonado.

**Celular**

- "Ingresar" visible siempre, como ícono de usuario en el encabezado.
- Menú hamburguesa a pantalla completa con las categorías en lista grande.
- Barra inferior fija: Inicio · Categorías · Buscar · Pedido · WhatsApp.
- Hero más bajo para que el título se vea sin bajar.
- En la ficha, la barra "Precio + Agregar" fija abajo y los botones de variante con tamaño cómodo para el dedo (mínimo 44 px).

## Orden de implementación

1. Corregir las animaciones de aparición y paginar las categorías (hoy dejan bloques vacíos y la página de Pinturas tarda en cargar).
2. Pasar a modo día con la nueva paleta, tipografía y estilos de botones.
3. Armar el modelo de producto padre + variantes con código y la importación de listas de precios por código.
4. Rediseñar la tarjeta de catálogo y la ficha de producto con los botones de variante y el precio animado.
5. Agregar la carpeta técnica y el panel para cargar datos y PDF por producto.
6. Rediseñar el inicio sección por sección.
7. Ajustes de celular, login y animaciones finas.
