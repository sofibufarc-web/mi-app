/**
 * Diccionarios de la interfaz: español e inglés.
 *
 * ¿Por qué un .ts y no un .json?
 * Porque así TypeScript compara los dos diccionarios entre sí. El `satisfies`
 * del final obliga a que `en` tenga EXACTAMENTE las mismas claves que `es`: si
 * agregás un texto en español y te olvidás del inglés, el editor te lo marca
 * en rojo en el momento, en vez de aparecer un `undefined` en pantalla.
 *
 * Solo se traduce la interfaz. Los nombres y descripciones de los productos
 * quedan como se cargaron en el panel: "Látex Interior 20 L" es el nombre del
 * artículo, no un texto a traducir.
 *
 * Convención: las claves están agrupadas por pantalla o por componente, y en
 * inglés, para que se lean igual desde cualquier archivo.
 */

export const locales = ["es", "en"] as const;
export type Locale = (typeof locales)[number];

export const DEFAULT_LOCALE: Locale = "es";

/** ¿Este string es uno de los idiomas que soportamos? */
export function isLocale(value: string | undefined | null): value is Locale {
  return value === "es" || value === "en";
}

/** Nombre del idioma en su propio idioma, para el selector. */
export const localeLabels: Record<Locale, string> = {
  es: "Español",
  en: "English",
};

const es = {
  common: {
    home: "Inicio",
    categories: "Categorías",
    products: "productos",
    product: "producto",
    cart: "Carrito",
    search: "Buscar",
    searchPlaceholder: "Buscar por nombre o código…",
    searchAria: "Buscar productos",
    panel: "Panel",
    login: "Ingresar",
    logout: "Cerrar sesión",
    code: "Cód.",
    viewCatalog: "Ver catálogo",
    whatsapp: "WhatsApp",
    skipToContent: "Saltar al contenido",
    whatsappFab: "Escribinos por WhatsApp",
  },

  theme: {
    light: "Modo día",
    dark: "Modo noche",
    toggleAria: "Cambiar entre modo día y modo noche",
  },

  language: {
    switchAria: "Cambiar idioma",
  },

  hero: {
    eyebrow: "Importación directa · Reparto propio",
    title: "Distribuidora",
    titleAccent: "Wiedmer",
    subtitle:
      "Catálogo completo para pinturerías y ferreterías, con la lista de precios actualizada a un solo clic.",
    ctaPrimary: "Ver el catálogo",
    ctaSecondary: "Hablar con un vendedor",
    scroll: "Seguí bajando",
    stats: {
      products: "Artículos en catálogo",
      provinces: "Provincias con reparto",
      delivery: "Reparto propio semanal",
    },
  },

  homeCategories: {
    eyebrow: "Qué distribuimos",
    title: "Elegí una categoría",
    subtitle:
      "Cada categoría abre su propia página con el listado completo y los filtros de búsqueda.",
    seeProducts: "Ver productos",
  },

  /**
   * Placas del carrusel. Son cuatro, como en las campañas de las que salió la
   * idea: la primera presenta, las dos del medio argumentan y la última cierra.
   * Las fotos NO están acá: las elige la home, porque son datos del proyecto y
   * no texto a traducir.
   */
  carousel: {
    label: "Presentación de la empresa",
    prev: "Placa anterior",
    next: "Placa siguiente",
    goTo: "Ir a la placa",
    pause: "Pausar",
    play: "Reanudar",
    slides: [
      {
        eyebrow: "Importación directa",
        title: "De la fábrica a tu mostrador",
        text: "Traemos la mercadería nosotros. Un escalón menos en la cadena es un precio mejor para tu comercio.",
      },
      {
        eyebrow: "Reparto propio",
        title: "Camiones nuestros, todas las semanas",
        text: "No dependemos de terceros para entregar. Frecuencia semanal en toda la zona de cobertura.",
      },
      {
        eyebrow: "Stock real",
        title: "Lo que ves está en el depósito",
        text: "El catálogo muestra lo que hay. Sin promesas de reposición a tres semanas.",
      },
      {
        eyebrow: "Lista actualizada",
        title: "Precios al día, sin sorpresas",
        text: "La lista se actualiza permanentemente y la descargás cuando querés, en Excel.",
      },
    ],
  },

  /**
   * Simulador de color de la home.
   *
   * Los NOMBRES de los colores no están acá: viven en `src/data/paint-colors.ts`
   * y no se traducen, por lo mismo que no se traduce el nombre de un producto.
   * Acá está solo la interfaz que los rodea.
   */
  simulator: {
    eyebrow: "Probalo antes de comprar",
    title: "Mirá cómo queda",
    subtitle:
      "Elegí un color y miralo aplicado. Sirve para mostrarle al cliente en el mostrador por qué un tono le va a cerrar y otro no.",
    surfaceLabel: "Qué querés pintar",
    wall: "Una pared",
    spray: "Una reja",
    paletteLabel: "Elegí un color",
    /** Se le pega el nombre del color: "Pared pintada de Terracota". */
    sceneWall: "Pared pintada de",
    sceneSpray: "Reja pintada de",
    ctaWall: "Ver pinturas",
    ctaSpray: "Ver aerosoles",
    disclaimer:
      "Los colores en pantalla son orientativos. El tono final cambia con la luz del ambiente, la mano de fondo y el brillo del acabado.",
  },

  /** Los tres accesos rápidos de la home. Dos se destraban con la sesión. */
  actions: {
    eyebrow: "Para empezar",
    title: "¿Qué necesitás hacer?",
    catalog: {
      title: "Recorrer el catálogo",
      text: "Todos los rubros, con fotos, códigos y presentaciones.",
      cta: "Ver categorías",
    },
    priceList: {
      title: "Lista de precios del mes",
      text: "El catálogo completo en Excel, con códigos y precios vigentes.",
      cta: "Descargar Excel",
      note: "Se descarga con los precios de hoy.",
    },
    seller: {
      title: "Hablar con un vendedor",
      text: "Consultas de stock, condiciones y armado de pedidos grandes.",
      cta: "Escribir por WhatsApp",
    },
  },

  /** Sección institucional: quiénes somos y cómo se compra. */
  about: {
    eyebrow: "La empresa",
    title: "Distribuimos para quien vive de esto",
    lead: "Wiedmer importa y distribuye artículos para pinturerías, ferreterías y corralones. No vendemos al público en un local: abastecemos comercios que necesitan reponer y facturar.",
    paragraphs: [
      "Trabajamos desde Almafuerte 645, en la zona norte de Rosario, con depósito propio. Desde ahí sale el reparto que cubre Gran Rosario, Santa Fe, el norte de Buenos Aires, Entre Ríos, Córdoba y La Pampa.",
      "El pedido se arma acá, en el catálogo, y se cierra por WhatsApp con un vendedor: disponibilidad, condiciones de pago y fecha de entrega. Sin formularios eternos ni esperar una respuesta tres días.",
    ],
    coverageTitle: "Zona de reparto",
    coverage: [
      "Gran Rosario",
      "Santa Fe",
      "Norte de Buenos Aires",
      "Entre Ríos",
      "Córdoba",
      "La Pampa",
    ],
    howTitle: "Cómo se compra",
    steps: [
      {
        title: "Elegís del catálogo",
        text: "Buscás por rubro o por código y armás el carrito con lo que necesitás reponer.",
      },
      {
        title: "Nos llega por WhatsApp",
        text: "El pedido se envía ya escrito, con códigos, cantidades y total. No hay que dictar nada.",
      },
      {
        title: "Coordinamos entrega",
        text: "Un vendedor confirma disponibilidad, forma de pago y en qué reparto sale.",
      },
    ],
  },

  homeWhy: {
    eyebrow: "Por qué Wiedmer",
    title: "Un proveedor, no un intermediario",
    items: [
      {
        title: "Importación directa",
        text: "Traemos la mercadería nosotros. Menos escalones entre la fábrica y tu mostrador.",
      },
      {
        title: "Reparto propio",
        text: "Camiones nuestros con frecuencia semanal en toda la zona de cobertura.",
      },
      {
        title: "Stock real",
        text: "Lo que ves en el catálogo está en el depósito. Sin esperas de tres semanas.",
      },
      {
        title: "Lista actualizada",
        text: "Los precios se actualizan permanentemente. Sin sorpresas al facturar.",
      },
    ],
  },

  homeCta: {
    title: "¿Armamos tu primer pedido?",
    subtitle:
      "Escribinos por WhatsApp y te pasamos la lista completa con las condiciones para comercios.",
    button: "Escribinos por WhatsApp",
    hours: "Atendemos de lunes a viernes de 8 a 17 h.",
  },

  storeMap: {
    eyebrow: "Dónde estamos",
    title: "Pasá por el depósito",
    howToGet: "Cómo llegar",
  },

  product: {
    addToCart: "Agregar al carrito",
    added: "Agregado ✓",
    featured: "Destacado",
    outOfStock: "Sin stock",
    unit: "Presentación",
    stock: "Stock",
    units: "u.",
    priceNote: "Precio unitario, IVA no incluido.",
    description: "Descripción",
    related: "Otros productos de",
    relatedFallback: "la tienda",
    decreaseAria: "Quitar una unidad",
    increaseAria: "Agregar una unidad",
    quantityAria: "Cantidad",
    empty: "No encontramos productos con esos criterios.",
  },

  /** Textos del muro de precios: lo que ve quien no inició sesión. */
  gate: {
    priceHidden: "Precio para clientes",
    unlock: "Ingresá para ver precios",
    askByWhatsapp: "Consultar precio",
    inquiryMessage: "Hola, quisiera consultar el precio de:",
    bannerTitle: "Los precios están reservados para clientes",
    bannerText:
      "Podés recorrer todo el catálogo libremente. Para ver los precios y armar pedidos, ingresá con el usuario que te dio tu vendedor.",
    bannerButton: "Ingresar",
  },

  filters: {
    search: "Buscar",
    searchPlaceholder: "Nombre o código",
    priceFrom: "Precio desde",
    priceTo: "Precio hasta",
    noCap: "Sin tope",
    sortBy: "Ordenar por",
    sortName: "Nombre (A-Z)",
    sortPriceAsc: "Precio: menor a mayor",
    sortPriceDesc: "Precio: mayor a menor",
    sortRecent: "Más recientes",
    apply: "Aplicar",
    clear: "Limpiar",
  },

  search: {
    title: "Buscar productos",
    resultsFor: "Resultados para",
    hint: "Escribí el nombre o el código del artículo que buscás.",
  },

  cart: {
    title: "Tu pedido",
    empty: "Tu carrito está vacío",
    emptyHint: "Agregá productos del catálogo para armar tu pedido.",
    summary: "Resumen",
    items: "Artículos",
    subtotal: "Subtotal",
    total: "Total",
    taxNote: "IVA no incluido.",
    checkout: "Finalizar pedido",
    clear: "Vaciar carrito",
    remove: "Eliminar",
    removeAria: "Quitar una unidad de",
    addAria: "Agregar una unidad de",
    quantityAria: "Cantidad de",
  },

  checkout: {
    title: "Finalizar pedido",
    yourData: "Tus datos",
    dataHint:
      "Con esto armamos el pedido y te contactamos por WhatsApp para cerrarlo.",
    name: "Nombre o razón social *",
    namePlaceholder: "Pinturería San Martín",
    email: "Email",
    emailPlaceholder: "compras@ejemplo.com",
    address: "Dirección de entrega",
    addressPlaceholder: "San Martín 1234, Rosario",
    note: "Nota para el pedido",
    notePlaceholder: "Horario de entrega, forma de pago, aclaraciones…",
    yourOrder: "Tu pedido",
    send: "Enviar pedido por WhatsApp",
    sendHint:
      "Se abre WhatsApp con el pedido ya escrito. No se cobra nada acá: el pago se coordina con el vendedor.",
    errorName: "Necesitamos tu nombre para identificar el pedido.",
    errorEmpty: "El carrito está vacío.",
    nothingYet: "No hay nada para pedir todavía",
    sentTitle: "¡Pedido enviado!",
    sentText:
      "Abrimos WhatsApp con tu pedido cargado. Si no se abrió solo, revisá que el navegador no haya bloqueado la ventana emergente y escribinos directamente.",
    sentContact:
      "Te contactamos para confirmar disponibilidad, forma de pago y entrega. Nuestro horario es",
  },

  login: {
    title: "Ingresar",
    subtitle: "Usá el email y la contraseña que te dio tu vendedor.",
    email: "Email",
    password: "Contraseña",
    showPassword: "Mostrar contraseña",
    hidePassword: "Ocultar contraseña",
    submit: "Ingresar",
    submitting: "Ingresando…",
    back: "Volver al catálogo",
    error: "Email o contraseña incorrectos.",
    notConfigured:
      "El acceso no está configurado. Faltan las variables de Supabase.",
    whyTitle: "¿Para qué sirve?",
    whyText:
      "El catálogo se puede ver sin cuenta, pero los precios y el armado de pedidos son solo para clientes.",
  },

  footer: {
    tagline:
      "Importador y distribuidor mayorista de artículos para pinturerías y ferreterías.",
    contact: "Contacto",
    orders: "Pedidos",
    ordersText: "Armá tu pedido en el carrito y lo recibimos por WhatsApp.",
    ordersButton: "Escribinos por WhatsApp",
    rights: "Todos los derechos reservados.",
    priceDisclaimer: "Los precios no incluyen IVA y pueden variar sin previo aviso.",
  },

  notFound: {
    title: "No encontramos esta página",
    text: "Puede que el producto ya no esté en el catálogo o que el link esté mal escrito.",
    button: "Volver al inicio",
  },
};

const en = {
  common: {
    home: "Home",
    categories: "Categories",
    products: "products",
    product: "product",
    cart: "Cart",
    search: "Search",
    searchPlaceholder: "Search by name or code…",
    searchAria: "Search products",
    panel: "Admin",
    login: "Sign in",
    logout: "Sign out",
    code: "Code",
    viewCatalog: "View catalog",
    whatsapp: "WhatsApp",
    skipToContent: "Skip to content",
    whatsappFab: "Message us on WhatsApp",
  },

  theme: {
    light: "Light mode",
    dark: "Dark mode",
    toggleAria: "Switch between light and dark mode",
  },

  language: {
    switchAria: "Change language",
  },

  hero: {
    eyebrow: "Direct imports · Own delivery fleet",
    title: "Wiedmer",
    titleAccent: "Distributor",
    subtitle:
      "The full catalog for paint and hardware stores, with the price list kept up to date a single click away.",
    ctaPrimary: "Browse the catalog",
    ctaSecondary: "Talk to a sales rep",
    scroll: "Scroll down",
    stats: {
      products: "Items in the catalog",
      provinces: "Provinces served",
      delivery: "Weekly own delivery",
    },
  },

  homeCategories: {
    eyebrow: "What we distribute",
    title: "Pick a category",
    subtitle:
      "Each category opens its own page with the full listing and search filters.",
    seeProducts: "See products",
  },

  carousel: {
    label: "Company presentation",
    prev: "Previous panel",
    next: "Next panel",
    goTo: "Go to panel",
    pause: "Pause",
    play: "Resume",
    slides: [
      {
        eyebrow: "Direct imports",
        title: "From the factory to your counter",
        text: "We bring the goods in ourselves. One less link in the chain means a better price for your business.",
      },
      {
        eyebrow: "Own delivery fleet",
        title: "Our own trucks, every week",
        text: "We don't depend on third parties to deliver. Weekly runs across the whole coverage area.",
      },
      {
        eyebrow: "Real stock",
        title: "What you see is in the warehouse",
        text: "The catalog shows what we have. No three-week restocking promises.",
      },
      {
        eyebrow: "Live price list",
        title: "Up-to-date prices, no surprises",
        text: "The list is kept current and you can download it as a spreadsheet whenever you want.",
      },
    ],
  },

  simulator: {
    eyebrow: "Try before you buy",
    title: "See how it looks",
    subtitle:
      "Pick a color and see it applied. Handy for showing a customer at the counter why one shade works and another doesn't.",
    surfaceLabel: "What do you want to paint",
    wall: "A wall",
    spray: "A railing",
    paletteLabel: "Pick a color",
    sceneWall: "Wall painted in",
    sceneSpray: "Railing painted in",
    ctaWall: "See paints",
    ctaSpray: "See spray paints",
    disclaimer:
      "On-screen colors are a guide only. The final shade shifts with the room's light, the primer underneath and the sheen of the finish.",
  },

  actions: {
    eyebrow: "Get started",
    title: "What do you need to do?",
    catalog: {
      title: "Browse the catalog",
      text: "Every category, with photos, codes and pack sizes.",
      cta: "See categories",
    },
    priceList: {
      title: "This month's price list",
      text: "The full catalog as a spreadsheet, with codes and current prices.",
      cta: "Download spreadsheet",
      note: "Downloads with today's prices.",
    },
    seller: {
      title: "Talk to a sales rep",
      text: "Stock questions, trade terms and help with larger orders.",
      cta: "Message on WhatsApp",
    },
  },

  about: {
    eyebrow: "The company",
    title: "We supply the people who do this for a living",
    lead: "Wiedmer imports and distributes supplies for paint stores, hardware stores and builders' merchants. We don't sell to the public over a counter: we stock the businesses that need to restock and invoice.",
    paragraphs: [
      "We work out of Almafuerte 645, in the north of Rosario, with our own warehouse. That's where the delivery runs start, covering Greater Rosario, Santa Fe, northern Buenos Aires, Entre Ríos, Córdoba and La Pampa.",
      "You build the order here in the catalog and close it on WhatsApp with a sales rep: availability, payment terms and delivery date. No endless forms, no waiting three days for a reply.",
    ],
    coverageTitle: "Delivery area",
    coverage: [
      "Greater Rosario",
      "Santa Fe",
      "Northern Buenos Aires",
      "Entre Ríos",
      "Córdoba",
      "La Pampa",
    ],
    howTitle: "How ordering works",
    steps: [
      {
        title: "Pick from the catalog",
        text: "Search by category or by code and fill the cart with what you need to restock.",
      },
      {
        title: "It reaches us on WhatsApp",
        text: "The order arrives already written out, with codes, quantities and total. Nothing to dictate.",
      },
      {
        title: "We arrange delivery",
        text: "A sales rep confirms availability, payment terms and which run it goes out on.",
      },
    ],
  },

  homeWhy: {
    eyebrow: "Why Wiedmer",
    title: "A supplier, not a middleman",
    items: [
      {
        title: "Direct imports",
        text: "We bring the goods in ourselves. Fewer steps between the factory and your counter.",
      },
      {
        title: "Own delivery fleet",
        text: "Our own trucks, weekly, across the whole coverage area.",
      },
      {
        title: "Real stock",
        text: "What you see in the catalog is in the warehouse. No three-week waits.",
      },
      {
        title: "Live price list",
        text: "Prices are kept up to date permanently. No surprises at invoicing.",
      },
    ],
  },

  homeCta: {
    title: "Shall we put together your first order?",
    subtitle:
      "Message us on WhatsApp and we'll send you the full list with trade terms.",
    button: "Message us on WhatsApp",
    hours: "We're open Monday to Friday, 8 am to 5 pm.",
  },

  storeMap: {
    eyebrow: "Where to find us",
    title: "Come by the warehouse",
    howToGet: "Get directions",
  },

  product: {
    addToCart: "Add to cart",
    added: "Added ✓",
    featured: "Featured",
    outOfStock: "Out of stock",
    unit: "Presentation",
    stock: "Stock",
    units: "units",
    priceNote: "Unit price, VAT not included.",
    description: "Description",
    related: "More from",
    relatedFallback: "the store",
    decreaseAria: "Remove one unit",
    increaseAria: "Add one unit",
    quantityAria: "Quantity",
    empty: "No products match those filters.",
  },

  gate: {
    priceHidden: "Price for customers",
    unlock: "Sign in to see prices",
    askByWhatsapp: "Ask for price",
    inquiryMessage: "Hi, I'd like to ask about the price of:",
    bannerTitle: "Prices are reserved for customers",
    bannerText:
      "You can browse the whole catalog freely. To see prices and place orders, sign in with the account your sales rep gave you.",
    bannerButton: "Sign in",
  },

  filters: {
    search: "Search",
    searchPlaceholder: "Name or code",
    priceFrom: "Price from",
    priceTo: "Price up to",
    noCap: "No cap",
    sortBy: "Sort by",
    sortName: "Name (A-Z)",
    sortPriceAsc: "Price: low to high",
    sortPriceDesc: "Price: high to low",
    sortRecent: "Most recent",
    apply: "Apply",
    clear: "Clear",
  },

  search: {
    title: "Search products",
    resultsFor: "Results for",
    hint: "Type the name or the code of the item you're looking for.",
  },

  cart: {
    title: "Your order",
    empty: "Your cart is empty",
    emptyHint: "Add products from the catalog to build your order.",
    summary: "Summary",
    items: "Items",
    subtotal: "Subtotal",
    total: "Total",
    taxNote: "VAT not included.",
    checkout: "Complete order",
    clear: "Empty cart",
    remove: "Remove",
    removeAria: "Remove one unit of",
    addAria: "Add one unit of",
    quantityAria: "Quantity of",
  },

  checkout: {
    title: "Complete order",
    yourData: "Your details",
    dataHint: "We use this to build the order and reach you on WhatsApp to close it.",
    name: "Name or company *",
    namePlaceholder: "San Martín Paints",
    email: "Email",
    emailPlaceholder: "purchasing@example.com",
    address: "Delivery address",
    addressPlaceholder: "San Martín 1234, Rosario",
    note: "Note for the order",
    notePlaceholder: "Delivery window, payment method, remarks…",
    yourOrder: "Your order",
    send: "Send order on WhatsApp",
    sendHint:
      "WhatsApp opens with the order already written. Nothing is charged here: payment is arranged with the sales rep.",
    errorName: "We need your name to identify the order.",
    errorEmpty: "The cart is empty.",
    nothingYet: "Nothing to order yet",
    sentTitle: "Order sent!",
    sentText:
      "WhatsApp opened with your order loaded. If it didn't open on its own, check that your browser didn't block the pop-up and write to us directly.",
    sentContact:
      "We'll get in touch to confirm availability, payment and delivery. Our hours are",
  },

  login: {
    title: "Sign in",
    subtitle: "Use the email and password your sales rep gave you.",
    email: "Email",
    password: "Password",
    showPassword: "Show password",
    hidePassword: "Hide password",
    submit: "Sign in",
    submitting: "Signing in…",
    back: "Back to the catalog",
    error: "Wrong email or password.",
    notConfigured: "Access is not configured. Supabase variables are missing.",
    whyTitle: "What is this for?",
    whyText:
      "The catalog is open to everyone, but prices and ordering are for customers only.",
  },

  footer: {
    tagline:
      "Importer and wholesale distributor of supplies for paint and hardware stores.",
    contact: "Contact",
    orders: "Orders",
    ordersText: "Build your order in the cart and we receive it on WhatsApp.",
    ordersButton: "Message us on WhatsApp",
    rights: "All rights reserved.",
    priceDisclaimer: "Prices exclude VAT and may change without notice.",
  },

  notFound: {
    title: "We couldn't find this page",
    text: "The product may no longer be in the catalog, or the link may be misspelled.",
    button: "Back to home",
  },
};

/** La forma del diccionario la define el español; el inglés tiene que calzar. */
export type Dictionary = typeof es;

export const dictionaries = { es, en } satisfies Record<Locale, Dictionary>;

/** Devuelve el diccionario de un idioma. */
export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
