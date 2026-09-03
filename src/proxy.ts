import { NextResponse, type NextRequest } from "next/server";

import { siteConfig } from "@/config/site";
import { canManageStore, canSeePrices, roleForSessionToken } from "@/lib/auth";
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_HEADER,
  resolveLocale,
} from "@/lib/locale";

/**
 * Proxy (lo que hasta Next 15 se llamaba "middleware").
 *
 * Se ejecuta ANTES de que Next resuelva la página, en cada request que matchee
 * el `config.matcher` de abajo. Hace dos cosas:
 *
 *   1. Resolver el idioma del visitante (país de la IP / navegador / cookie).
 *   2. Cortar el paso a las rutas que necesitan sesión.
 *
 * Es el lugar correcto para las dos cosas porque corre antes de renderizar
 * nada: no se gasta trabajo en una página que después se va a descartar.
 *
 * Ojo con el nombre: en Next 16 el archivo se llama `proxy.ts` y la función
 * exportada `proxy`. Es el mismo concepto que el middleware de versiones
 * anteriores; si leés un tutorial que habla de `middleware.ts`, es esto.
 *
 * Corre en el runtime "Edge", que es un entorno más limitado que Node: no hay
 * `fs` ni `node:crypto`. Por eso las credenciales viven en `src/config/site.ts`
 * (un .ts común, sin `fs`) y el hash se calcula con Web Crypto.
 */

/**
 * Rutas que exigen haber iniciado sesión con cualquiera de los dos roles.
 *
 * `/api/lista-precios` está acá y no es un detalle: si solo escondiéramos el
 * botón de descarga, cualquiera podría escribir esa dirección a mano y bajarse
 * la lista mayorista entera.
 */
const CUSTOMER_ONLY_PATHS = ["/carrito", "/checkout", "/api/lista-precios"];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const role = await roleForSessionToken(
    request.cookies.get(siteConfig.auth.cookieName)?.value,
  );

  // --- 1. Idioma ----------------------------------------------------------
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = resolveLocale({
    cookie: cookieLocale,
    // Vercel resuelve el país de la IP y lo manda en este header. En local no
    // existe, y entonces `resolveLocale` cae al idioma del navegador.
    country: request.headers.get("x-vercel-ip-country"),
    acceptLanguage: request.headers.get("accept-language"),
  });

  /**
   * Prepara la respuesta con el idioma ya resuelto:
   * - como header del REQUEST, para que la página lo lea en este mismo render;
   * - como cookie de la RESPUESTA, para que la próxima visita no tenga que
   *   volver a adivinar (y para que respete lo que el usuario elija después).
   */
  function withLocale(response: NextResponse) {
    if (cookieLocale !== locale) {
      response.cookies.set(LOCALE_COOKIE, locale, {
        path: "/",
        maxAge: LOCALE_COOKIE_MAX_AGE,
        sameSite: "lax",
      });
    }
    return response;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(LOCALE_HEADER, locale);
  const pass = () =>
    withLocale(NextResponse.next({ request: { headers: requestHeaders } }));

  // --- 2. Acceso ----------------------------------------------------------

  // Ya logueado y entrando a /login → mandarlo a donde corresponda.
  if (pathname === "/login" && role !== null) {
    const target = canManageStore(role) ? "/admin" : "/";
    return withLocale(NextResponse.redirect(new URL(target, request.url)));
  }

  const isAdminPath =
    pathname.startsWith("/admin") ||
    // Los endpoints del panel (subir imágenes, cargar precios) viven bajo
    // /api/admin justamente para quedar cubiertos por esta misma regla.
    pathname.startsWith("/api/admin");

  // Carrito y checkout: sin precios no tiene sentido armar un pedido, así que
  // se piden las mismas credenciales que para verlos.
  const isCustomerPath = CUSTOMER_ONLY_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  const denied =
    (isAdminPath && !canManageStore(role)) ||
    (isCustomerPath && !canSeePrices(role)) ||
    // Con el flag en true, todo el catálogo pasa a ser privado.
    (siteConfig.requireLoginForCatalog && pathname !== "/login" && role === null);

  if (denied) {
    /*
     * Cómo se rechaza depende de QUIÉN pidió la ruta, no de si empieza con
     * /api:
     *
     * - `/api/admin/*` lo llama el `fetch` del panel. A un fetch no le sirve un
     *   redirect a HTML: lo seguiría y recibiría la página de login como si
     *   fuera la respuesta. Se le contesta 401 en JSON, que sí sabe interpretar.
     * - `/api/lista-precios` es un link que la persona toca en el navegador.
     *   Ahí un JSON crudo en pantalla es una pared; lo correcto es mandarla al
     *   login y, después de entrar, devolverla a la descarga.
     */
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json({ error: "Sesión expirada." }, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    // Guardamos a dónde quería ir para volver ahí después del login.
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return withLocale(NextResponse.redirect(loginUrl));
  }

  return pass();
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
    "/((?!_next/static|_next/image|api/auth|favicon.ico|icon.svg|uploads|img|plantilla-precios.xlsx).*)",
  ],
};
