import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { getSitemapEntries } from "@/lib/data-source";

/**
 * sitemap.xml: la lista de páginas que queremos que Google conozca.
 *
 * Un buscador descubre páginas siguiendo links, pero con cientos de productos
 * es lento y se deja cosas sin ver. El sitemap se lo entrega directo.
 *
 * `force-dynamic`: se arma cuando alguien lo pide y no durante el build. Así el
 * build de Vercel no depende de poder conectarse a la base, y cuando se carga
 * un producto nuevo aparece en el sitemap sin esperar a un deploy.
 *
 * No hay ningún precio acá: el sitemap es público, como el catálogo.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const { categorias, productos } = await getSitemapEntries();

  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    ...categorias.map((slug) => ({
      url: `${base}/categoria/${slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...productos.map(({ slug, updatedAt }) => ({
      url: `${base}/producto/${slug}`,
      lastModified: updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
