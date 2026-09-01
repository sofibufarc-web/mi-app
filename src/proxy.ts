import { NextResponse, type NextRequest } from "next/server";

import { siteConfig } from "@/config/site";
import { isValidSessionToken } from "@/lib/auth";

/**
 * Proxy (lo que hasta Next 15 se llamaba "middleware").
 *
 * Se ejecuta ANTES de que Next resuelva la página, en cada request que matchee
 * el `config.matcher` de abajo. Es el lugar correcto para proteger rutas,
 * porque corta el paso antes de renderizar nada.
 *
 * Ojo con el nombre: en Next 16 el archivo se llama `proxy.ts` y la función
 * exportada `proxy`. Es exactamente el mismo concepto que el middleware de
 * versiones anteriores; si leés un tutorial que habla de `middleware.ts`, es esto.
 *
 * Corre en el runtime "Edge", que es un entorno más limitado que Node: no hay
 * `fs` ni `node:crypto`. Por eso las credenciales viven en `src/config/site.ts`
 * (un .ts común, sin `fs`) y el hash se calcula con Web Crypto.
 */
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(siteConfig.auth.cookieName)?.value;
  const isLoggedIn = await isValidSessionToken(token);
  const { pathname, search } = request.nextUrl;

  // Ya logueado y entrando a /login → mandarlo directo al panel.
  if (pathname === "/login" && isLoggedIn) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  const needsAuth =
    pathname.startsWith("/admin") ||
    // Los endpoints del panel (subir imágenes, cargar precios) viven bajo
    // /api/admin justamente para quedar cubiertos por esta misma regla.
    pathname.startsWith("/api/admin") ||
    // Con el flag en true, todo el catálogo pasa a ser privado.
    (siteConfig.requireLoginForCatalog && pathname !== "/login");

  if (needsAuth && !isLoggedIn) {
    // A una llamada de API no le sirve un redirect a HTML: el `fetch` del panel
    // lo seguiría y recibiría la página de login. Le contestamos 401 en JSON.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sesión expirada." }, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    // Guardamos a dónde quería ir para volver ahí después del login.
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  /**
   * Qué rutas pasan por acá. Excluimos los assets estáticos (_next, favicon,
   * uploads, imágenes) para no gastar tiempo en cada archivo.
   *
   * `/api/auth` queda afuera a propósito: si lo protegiéramos, nadie podría
   * loguearse nunca.
   */
  matcher: [
    "/((?!_next/static|_next/image|api/auth|favicon.ico|uploads|img|plantilla-precios.xlsx).*)",
  ],
};
