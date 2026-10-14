"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

import type { Dictionary } from "@/lib/i18n";

/**
 * Mapa interactivo del local — arrastrable, con zoom y un pin que abre los
 * datos de la tienda al tocarlo.
 *
 * ## Por qué es un Client Component (`"use client"`)
 *
 * Un mapa así vive en el navegador: se arrastra, hace zoom y responde a clics.
 * Nada de eso existe en el servidor, que solo arma HTML. Por eso todo el
 * armado va adentro de `useEffect`, que corre una vez que el componente ya está
 * montado en la página real.
 *
 * ## Por qué Leaflet + OpenStreetMap
 *
 * Leaflet es la librería de mapas estándar y gratuita. Las imágenes ("tiles")
 * las sirve OpenStreetMap, el mapa libre de la comunidad, sin clave de API ni
 * costo por uso. La alternativa (Google Maps) cobra por carga y obliga a
 * registrar una tarjeta. Para marcar un local, Leaflet sobra.
 *
 * ## Por qué se importa Leaflet DENTRO del efecto (`await import`)
 *
 * Leaflet, apenas se carga, toca `window` —el objeto del navegador—. En el
 * servidor `window` no existe, así que importarlo arriba de todo rompería el
 * render. Con `await import("leaflet")` la librería se trae recién en el
 * navegador, que es el único lugar donde tiene sentido.
 */

/**
 * Coordenadas del local. Salieron de geocodificar "Almafuerte 645, Rosario"
 * contra OpenStreetMap (Nominatim): calle Almafuerte, Distrito Norte de
 * Rosario. Si algún día se muda la tienda, se cambian estos dos números.
 */
const LAT = -32.91719;
const LNG = -60.67866;

type Props = {
  storeName: string;
  address: string;
  phone: string;
  hours: string;
  t: Dictionary["storeMap"];
};

export function StoreMap({ storeName, address, phone, hours, t }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelado = false;
    // Guardamos la instancia para poder desmontarla al salir. Sin esto, al
    // navegar y volver Leaflet se quejaría de que el div "ya tiene un mapa".
    let mapa: import("leaflet").Map | undefined;

    (async () => {
      const L = (await import("leaflet")).default;

      const div = contenedor.current;
      if (cancelado || !div) return;

      // React en desarrollo monta cada componente dos veces para detectar
      // errores. `_leaflet_id` es la marca que Leaflet deja en el div cuando ya
      // lo inicializó: si está, no lo inicializamos de nuevo.
      if ((div as unknown as { _leaflet_id?: number })._leaflet_id) return;

      mapa = L.map(div, {
        center: [LAT, LNG],
        zoom: 15,
        // El zoom con la rueda queda apagado a propósito: si estuviera prendido,
        // scrollear la página con el mouse encima del mapa haría zoom en vez de
        // seguir bajando. Se agranda con los botones + / − o con dos dedos.
        scrollWheelZoom: false,
      });

      // Mosaicos de OpenStreetMap (sin clave de API). Los de CARTO se probaron
      // y piden clave: dejan el mapa lleno de carteles «API KEY REQUIRED». El
      // estilo claro se logra con un filtro CSS (`.leaflet-tile-pane` en
      // globals.css), no con otro proveedor.
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        // Atribución obligatoria por la licencia de OpenStreetMap.
        attribution: "&copy; OpenStreetMap",
      }).addTo(mapa);

      // Pin propio en azul de marca, dibujado con HTML/CSS en vez del ícono de
      // imagen que trae Leaflet. El ícono por defecto depende de archivos que
      // los empaquetadores suelen romper; con un `divIcon` nos ahorramos ese
      // problema y de paso el pin usa el color del sitio.
      const icono = L.divIcon({
        className: "",
        // El marcador lleva la W de la marca. Arranca «arriba» y fuera de
        // vista; cuando el mapa entra en pantalla se le agrega `.cae` y cae
        // con un rebote (ver globals.css).
        html: `<span class="store-map-logo"><span>W</span></span>`,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
      });

      L.marker([LAT, LNG], { icon: icono, title: storeName }).addTo(mapa);

      const observador = new IntersectionObserver(
        ([entrada]) => {
          if (!entrada.isIntersecting) return;
          div.querySelector(".store-map-logo")?.classList.add("cae");
          observador.disconnect();
        },
        { threshold: 0.4 },
      );
      observador.observe(div);
    })();

    return () => {
      cancelado = true;
      mapa?.remove();
    };
    // Sin dependencias: se arma una sola vez, al montar. Los datos de la tienda
    // no cambian mientras la página está abierta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Enlace a "Cómo llegar": abre Google Maps con la ruta hacia el local. No
  // necesita clave de API porque es un link, no la librería de Google.
  const comoLlegar = `https://www.google.com/maps/dir/?api=1&destination=${LAT},${LNG}`;

  return (
    <div className="relative isolate overflow-hidden rounded-2xl border border-line bg-card">
      {/* El mapa necesita una altura fija: sin ella, el div mide 0 y no se ve. */}
      <div ref={contenedor} className="h-96 w-full sm:h-[28rem]" aria-label={t.title} />

      {/* Tarjeta flotante sobre el mapa. En celular pasa debajo para no tapar
          el marcador. `z-[500]` > capas de Leaflet (que llegan a 400). */}
      <div className="static z-[500] border-t border-line bg-card/95 p-5 backdrop-blur sm:absolute sm:left-4 sm:top-4 sm:max-w-xs sm:rounded-xl sm:border sm:shadow-xl sm:shadow-black/10">
        <p className="font-display text-base font-bold text-brand">{storeName}</p>
        <p className="mt-1 text-sm font-medium text-ink">{address}</p>
        <p className="mt-1 text-sm text-ink-soft">Tel. {phone}</p>
        <p className="text-sm text-ink-soft">{hours}</p>
        <a
          href={comoLlegar}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary mt-4 px-5 py-2.5 text-sm"
        >
          {t.howToGet} <span className="btn-arrow">→</span>
        </a>
      </div>
    </div>
  );
}
