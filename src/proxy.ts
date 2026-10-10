import { NextResponse, type NextRequest } from "next/server";

import { siteConfig } from "@/config/site";
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_HEADER,
  resolveLocale,
} from "@/lib/locale";
import { createSupabaseProxyClient } from "@/lib/supabase/proxy-client";

/**
 * Proxy (lo que hasta Next 15 se llamaba "middleware").
 *
 * Se ejecuta ANTES de que Next resuelva la página, en cada request que matchee
 * el `config.matcher` de abajo. Hace tres cosas:
 *
 *   1. Renovar el token de sesión de Supabase si está por vencer.
 *   2. Resolver el idioma del visitante (país de la IP / navegador / cookie).
 *   3. Cortar el paso a las rutas que necesitan sesión.
 *
 * Ojo con el nombre: en Next 16 el archivo se llama `proxy.ts` y la función
 * exportada `proxy`. Es el mismo concepto que el middleware de versiones
 * anteriores; si leés un tutorial que habla de `middleware.ts`, es esto.
 *
 * ## Lo que el proxy NO puede saber
 *
 * Corre en el runtime "Edge", más limitado que Node: no hay `fs`, no hay
 * `node:crypto` y **no se puede abrir una conexión a Postgres**. El rol —admin o
 * cliente— vive en la tabla `profiles`, así que acá es inalcanzable.
 *
 * Por eso el proxy responde una sola pregunta: **¿hay sesión o no?**. Alcanza
 * para el carrito, el checkout y la lista de precios, que es lo que pide
 * cualquier cliente.
 *
 * Para `/admin` el proxy solo saca a los anónimos. Que sea admin de verdad lo
 * verifica `src/app/admin/layout.tsx`, que corre en Node y sí puede consultar la
 * base, y cada endpoint de `/api/admin`. No se filtra nada: el layout redirige
 * antes de renderizar una sola línea del panel.
 *
 * Que la comprobación real esté ahí tiene además una ventaja: al leerse de la
 * base en cada navegación, bajar a alguien de admin a cliente tiene efecto
 * inmediato. Con la cookie firmada que había antes, el cambio tardaba lo que
 * tardara en vencer la sesión.
 */

/**
 * Rutas que exigen haber iniciado sesión, con cualquier rol.
 *
 * `/api/lista-precios` está acá y no es un detalle: si solo escondiéramos el
 * botón de descarga, cualquiera podría escribir esa dirección a mano y bajarse
 * la lista mayorista entera.
 */
const CUSTOMER_ONLY_PATHS = ["/carrito", "/checkout", "/api/lista-precios"];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // --- 1. Sesión ----------------------------------------------------------
  // `getUser()` valida el token contra el servidor de Auth y, de paso, lo
  // renueva si estaba por vencer. Las cookies nuevas quedan en `pendientes`
  // hasta saber qué respuesta se va a devolver.
  //
  // Para un visitante sin cookie de sesión esto no sale a la red: la librería
  // se da cuenta de que no hay nada que validar y responde en el acto. O sea que
  // el catálogo público no paga este costo.
  const { supabase, pendientes } = createSupabaseProxyClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const haySesion = user !== null;

  // --- 2. Idioma ----------------------------------------------------------
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = resolveLocale({
    cookie: cookieLocale,
    // Vercel resuelve el país de la IP y lo manda en este header. En local no
    // existe, y entonces `resolveLocale` cae al idioma del navegador.
    country: request.headers.get("x-vercel-ip-country"),
    acceptLanguage: request.headers.get("accept-language"),
  });

  /**
   * Última parada de toda respuesta que sale de acá.
   *
   * Le pega las cookies de sesión renovadas y la del idioma. Es importante que
   * pase por acá también un redirect: si el token se renovó y la respuesta es
   * "andá al login", sin estas cookies la sesión nueva se perdería.
   */
  function finalizar(response: NextResponse) {
    for (const { name, value, options } of pendientes) {
      response.cookies.set(name, value, options);
    }
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
  const pasar = () =>
    finalizar(NextResponse.next({ request: { headers: requestHeaders } }));

  // --- 3. Acceso ----------------------------------------------------------

  // Ya logueado y entrando a /login → no tiene nada que hacer ahí.
  // Va al catálogo y no al panel porque acá todavía no sabemos si es admin; de
  // mandar a cada uno a su lugar se encarga `loginAction`, que sí lo sabe.
  if ((pathname === "/login" || pathname === "/login/admin") && haySesion) {
    return finalizar(NextResponse.redirect(new URL("/", request.url)));
  }

  const esRutaDeAdmin =
    pathname.startsWith("/admin") ||
    // Los endpoints del panel (subir imágenes, cargar precios) viven bajo
    // /api/admin justamente para quedar cubiertos por esta misma regla.
    pathname.startsWith("/api/admin");

  // Carrito y checkout: sin precios no tiene sentido armar un pedido, así que
  // se pide la misma sesión que para verlos.
  const esRutaDeCliente = CUSTOMER_ONLY_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  const rechazado =
    !haySesion &&
    (esRutaDeAdmin ||
      esRutaDeCliente ||
      // Con el flag en true, todo el catálogo pasa a ser privado.
      (siteConfig.requireLoginForCatalog &&
        pathname !== "/login" &&
        pathname !== "/login/admin"));

  if (rechazado) {
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
      return finalizar(
        NextResponse.json({ error: "Sesión expirada." }, { status: 401 }),
      );
    }

    // El panel tiene su propio login (email + contraseña); el resto, el de
    // clientes (solo contraseña).
    const loginUrl = new URL(esRutaDeAdmin ? "/login/admin" : "/login", request.url);
    // Guardamos a dónde quería ir para volver ahí después del login.
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return finalizar(NextResponse.redirect(loginUrl));
  }

  return pasar();
}

export const config = {
  /**
   * Qué rutas pasan por acá. Excluimos los assets estáticos (_next, favicon,
   * uploads, imágenes) para no gastar tiempo en cada archivo.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|uploads|img|plantilla-precios.xlsx).*)",
  ],
};
