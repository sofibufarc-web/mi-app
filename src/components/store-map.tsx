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
        html: `<span class="store-map-pin"></span>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -26],
      });

      L.marker([LAT, LNG], { icon: icono, title: storeName })
        .addTo(mapa)
        .bindPopup(
          `<strong>${storeName}</strong><br>${address}<br>${hours}`,
        )
        .openPopup();
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
    <div className="isolate overflow-hidden rounded-2xl border border-line bg-card">
      {/* El mapa necesita una altura fija: sin ella, el div mide 0 y no se ve. */}
      <div ref={contenedor} className="h-72 w-full sm:h-96" aria-label={t.title} />

      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          <p className="font-semibold text-ink">{address}</p>
          <p className="mt-1 text-ink-soft">Tel. {phone}</p>
          <p className="text-ink-soft">{hours}</p>
        </div>

        <a
          href={comoLlegar}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-brand px-6 py-3 text-sm font-bold text-on-brand transition hover:-translate-y-0.5 hover:bg-brand-dark"
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          {t.howToGet}
        </a>
      </div>
    </div>
  );
}
