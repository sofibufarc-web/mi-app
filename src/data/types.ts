/**
 * Modelo de datos de la tienda.
 *
 * Estos tipos son el contrato entre la capa de datos (`src/lib/data-source.ts`)
 * y el resto de la app. Cuando migremos a Supabase, las columnas de las tablas
 * tienen que respetar exactamente esta forma para que no haya que tocar nada más.
 */

export type Product = {
  id: string;
  /** Código de artículo. Es la clave que usa la carga de precios por Excel. */
  sku: string;
  name: string;
  /** Derivado del nombre. Se usa en la URL: /producto/<slug> */
  slug: string;
  /** Admite varios párrafos separados por "\n\n". */
  description: string;
  /** Precio en pesos, sin símbolo ni separadores. */
  price: number;
  /** Id de categoría. Cadena vacía = "sin categoría". */
  categoryId: string;
  brand?: string;
  /** Unidad de venta: "unidad", "litro", "kg", "juego"… */
  unit?: string;
  /** null = no se controla stock para este producto. */
  stock?: number | null;
  /** Aparece en la home. */
  featured: boolean;
  /** false = oculto en el catálogo público (sigue visible en el panel). */
  active: boolean;
  /** Paths públicos, ej. "/uploads/rodillo.jpg". El primero es la imagen principal. */
  images: string[];
  createdAt: string;
  updatedAt: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  /** Orden en el menú y en los listados. Menor = primero. */
  order: number;
};

export type StoreConfig = {
  storeName: string;
  logoText: string;
  logoImage?: string;
  /** Solo dígitos, con código de país. Ej: 5493416756969 */
  whatsappNumber: string;
  welcomeTitle: string;
  welcomeText: string;
  contact: {
    address: string;
    phone: string;
    email: string;
    hours: string;
  };
  colors: {
    brand: string;
    brandDark: string;
    brandDarker: string;
  };
};

/** Una línea del carrito. Se guarda en localStorage, por eso es plana. */
export type CartItem = {
  productId: string;
  sku: string;
  name: string;
  slug: string;
  price: number;
  quantity: number;
  image?: string;
};

/** Datos que el cliente completa en el checkout. */
export type Customer = {
  name: string;
  email?: string;
  address?: string;
  note?: string;
};

/**
 * Pedido armado en el checkout. Hoy NO se persiste: solo se convierte en el
 * mensaje de WhatsApp. Cuando exista Supabase, esto va a una tabla `orders`.
 */
export type Order = {
  customer: Customer;
  items: CartItem[];
  total: number;
  createdAt: string;
};

/** Lo que recibe `upsertProduct`: sin id = alta, con id = edición. */
export type ProductInput = Omit<Product, "id" | "slug" | "createdAt" | "updatedAt"> & {
  id?: string;
};

export type CategoryInput = Omit<Category, "id" | "slug"> & {
  id?: string;
  slug?: string;
};

/** Filtros del catálogo y del listado del panel. */
export type ProductFilters = {
  categoryId?: string;
  categorySlug?: string;
  search?: string;
  featured?: boolean;
  /** Por defecto el catálogo público pide solo los activos. */
  onlyActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sort?: "nombre" | "precio-asc" | "precio-desc" | "recientes";
};
