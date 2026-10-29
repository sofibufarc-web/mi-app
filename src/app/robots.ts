import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

/**
 * robots.txt: le dice a los buscadores qué pueden recorrer.
 *
 * Next convierte este archivo en `/robots.txt`. Se deja afuera todo lo que no
 * tiene sentido que aparezca en Google: el panel, los endpoints internos, el
 * carrito y el checkout (que además exigen sesión) y el buscador interno
 * (cada búsqueda es una página "casi vacía" distinta, y Google las castiga como
 * contenido duplicado).
 *
 * Ojo: robots.txt NO es seguridad. Es una cortesía que los buscadores
 * respetan; la protección real de /admin está en `src/proxy.ts`.
 *
 * `sitemap` apunta al mapa de páginas, que es lo que más acelera que Google
 * descubra los productos nuevos (ver `sitemap.ts`).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api/",
        "/carrito",
        "/checkout",
        "/buscar",
        "/actualizar-password",
      ],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
