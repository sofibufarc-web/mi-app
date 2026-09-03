"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import type { Dictionary } from "@/lib/i18n";

/**
 * Hero de la home: un carrusel de placas a pantalla completa.
 *
 * Es lo primero que se ve al entrar. Funciona como una tira de placas de
 * campaña —la primera presenta la empresa, las siguientes argumentan— que
 * avanza sola cada 6 segundos, como un video.
 *
 * La parte que ROTA es el texto de arriba (antetítulo, título, bajada) y la
 * foto de fondo. La parte que NO rota son los botones y los números: son las
 * acciones y los datos de la empresa, y tienen que estar siempre disponibles,
 * no aparecer y desaparecer.
 *
 * Qué lo hace parecer video y no un slider de plantilla:
 *
 * - Cada foto entra con un acercamiento lento y continuo (efecto Ken Burns).
 *   Una imagen fija delata enseguida que es una diapositiva; una que se mueve
 *   apenas se lee como filmación.
 * - Las placas se cruzan con un fundido, no con un salto.
 * - El texto entra escalonado: antetítulo, título y bajada, con un retraso
 *   entre cada uno.
 * - Una barra de progreso muestra cuánto falta para la próxima. Sin eso, el
 *   avance automático se siente arbitrario y molesta.
 *
 * Y lo que lo hace usable:
 *
 * - Se pausa al pasar el mouse o al llegar con el teclado. Nada peor que estar
 *   leyendo una placa y que se vaya por la mitad.
 * - Se pausa si la pestaña deja de estar visible: no gastamos batería animando
 *   algo que nadie mira.
 * - Con "reducir movimiento" activado NO avanza solo ni hace zoom. Queda la
 *   primera placa fija y los botones para pasarlas a mano.
 */

/** Cuánto dura cada placa en pantalla. */
const DURACION_MS = 6000;

export type HeroSlide = {
  /** Path público de la foto de fondo. */
  image: string;
  eyebrow: string;
  title: string;
  /**
   * Segunda mitad del título, pintada con un degradado. Solo la usa la primera
   * placa, que es la que lleva el mensaje de marca.
   */
  titleAccent?: string;
  text: string;
};

export function HeroCarousel({
  slides,
  t,
  /**
   * Botones y números. Llegan como `children` desde la home, que es un Server
   * Component: así los links de siempre y los datos del catálogo se arman en el
   * servidor y este componente cliente solo se ocupa de la animación.
   */
  children,
}: {
  slides: HeroSlide[];
  t: Dictionary["carousel"];
  children?: ReactNode;
}) {
  const [actual, setActual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  // useRef para el temporizador: guarda un valor entre renders SIN provocar
  // uno nuevo cuando cambia. Un useState acá dispararía un render por tick.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = slides.length;

  const ir = useCallback(
    (indice: number) => {
      // El módulo hace que el carrusel sea circular: después de la última
      // vuelve a la primera. El `+ total` es para que un -1 no dé negativo.
      setActual(((indice % total) + total) % total);
    },
    [total],
  );

  // ¿El sistema pide movimiento reducido? Se consulta una vez y se escucha por
  // si el usuario lo cambia con la página abierta.
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const leer = () => setReduceMotion(media.matches);
    leer();
    media.addEventListener("change", leer);
    return () => media.removeEventListener("change", leer);
  }, []);

  // Avance automático.
  useEffect(() => {
    if (pausado || reduceMotion) return;

    timerRef.current = setTimeout(() => ir(actual + 1), DURACION_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // Depende de `actual`: cada vez que cambia la placa se arma un temporizador
    // nuevo, así el tiempo se cuenta desde que la placa apareció y no desde que
    // arrancó el carrusel.
  }, [actual, pausado, reduceMotion, ir]);

  // Pausa cuando la pestaña se va a segundo plano.
  useEffect(() => {
    const alCambiar = () => setPausado(document.hidden);
    document.addEventListener("visibilitychange", alCambiar);
    return () => document.removeEventListener("visibilitychange", alCambiar);
  }, []);

  function alTeclear(event: React.KeyboardEvent) {
    if (event.key === "ArrowRight") ir(actual + 1);
    if (event.key === "ArrowLeft") ir(actual - 1);
  }

  return (
    <section
      // roledescription le avisa al lector de pantalla que esto es un carrusel
      // y no una lista cualquiera, así anuncia los controles como corresponde.
      aria-roledescription="carousel"
      aria-label={t.label}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
      onKeyDown={alTeclear}
      className="relative isolate flex min-h-[40rem] items-center overflow-hidden bg-brand-darker text-white lg:min-h-[42rem]"
    >
      {/* ---- Fotos de fondo ---- */}
      {slides.map((slide, i) => {
        const activa = i === actual;
        return (
          <div
            key={slide.image}
            aria-hidden
            className={`absolute inset-0 transition-opacity duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              activa ? "opacity-100" : "opacity-0"
            }`}
          >
            <Image
              src={slide.image}
              alt=""
              fill
              sizes="100vw"
              // priority solo en la primera: es la que se ve al entrar y la que
              // conviene que cargue antes que nada. Pedir prioridad para las
              // cinco sería pedirla para ninguna.
              priority={i === 0}
              // La clase de animación se pone y se saca según `activa`. Al
              // volver a agregarse, el navegador ve que `animation-name` cambió
              // de "ninguna" a una animación y la ejecuta de cero: por eso el
              // acercamiento se reinicia en cada vuelta.
              className={`object-cover ${
                activa && !reduceMotion ? "animate-ken-burns" : ""
              }`}
            />
          </div>
        );
      })}

      {/* ---- Velos ----
          Las mismas capas que la cabecera de categoría: un velo parejo y un
          degradado opaco del lado del texto. No es decoración: es lo que
          garantiza que el título blanco se lea sobre cualquier foto, clara u
          oscura. El tercero oscurece abajo, donde van los controles. */}
      <div className="absolute inset-0 bg-brand-darker/30" />
      <div className="absolute inset-0 bg-gradient-to-r from-brand-darker via-brand-darker/80 to-brand-darker/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-brand-darker/85 via-transparent to-brand-darker/40" />

      <div className="container-wiedmer relative z-10 py-16 lg:py-20">
        <div className="max-w-3xl">
          {/*
            Todas las placas se apilan en la MISMA celda de grilla
            (`col-start-1 row-start-1`). Así el bloque mide siempre lo que mide
            la placa más alta, y los botones de abajo no saltan cuando cambia
            el texto. Solo cambia la opacidad.
          */}
          <div className="grid">
            {slides.map((slide, i) => {
              const activa = i === actual;
              return (
                <div
                  key={slide.title}
                  data-active={activa}
                  // `group` habilita las variantes `group-data-[active=true]:`
                  // de los hijos, que es como se escalona la entrada.
                  className={`group col-start-1 row-start-1 ${
                    activa ? "" : "pointer-events-none"
                  }`}
                  aria-hidden={!activa}
                >
                  {/*
                    Las transiciones se disparan solas cada vez que cambia
                    `data-active`, sin trucos de `key` ni remontajes. Los
                    `delay-*` distintos son los que escalonan la entrada.
                  */}
                  <p className="translate-y-4 text-xs font-bold uppercase tracking-[0.3em] text-sky-300 opacity-0 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[active=true]:translate-y-0 group-data-[active=true]:opacity-100">
                    {slide.eyebrow}
                  </p>

                  {/* Un solo <h1> en toda la página: el de la placa activa. Las
                      otras van como <p> con el mismo aspecto, solo para que el
                      bloque reserve su alto. */}
                  {activa ? (
                    <h1 className="mt-5 translate-y-4 text-4xl font-bold leading-[1.08] tracking-tight opacity-0 transition-all delay-150 duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[active=true]:translate-y-0 group-data-[active=true]:opacity-100 sm:text-5xl lg:text-[3.4rem]">
                      {slide.title}
                      {slide.titleAccent && (
                        <>
                          {" "}
                          <span className="bg-gradient-to-r from-sky-300 to-white bg-clip-text text-transparent">
                            {slide.titleAccent}
                          </span>
                        </>
                      )}
                    </h1>
                  ) : (
                    <p className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight opacity-0 sm:text-5xl lg:text-[3.4rem]">
                      {slide.title}
                      {slide.titleAccent ? ` ${slide.titleAccent}` : ""}
                    </p>
                  )}

                  <p className="mt-5 max-w-xl translate-y-4 text-base leading-relaxed text-white/75 opacity-0 transition-all delay-300 duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[active=true]:translate-y-0 group-data-[active=true]:opacity-100">
                    {slide.text}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Botones y números: fijos, no rotan. */}
          {children}
        </div>

        {/* ---- Controles ----
            En pantallas grandes van abajo a la derecha, aprovechando el hueco
            que deja el texto (que está limitado a max-w-3xl). En mobile van en
            el flujo normal, debajo de todo. */}
        <div className="mt-10 flex items-end justify-between gap-6 lg:absolute lg:bottom-6 lg:right-4 lg:mt-0 lg:justify-end">
          <ul className="flex gap-2">
            {slides.map((slide, i) => {
              const activa = i === actual;
              return (
                <li key={slide.image}>
                  <button
                    type="button"
                    onClick={() => ir(i)}
                    aria-label={`${t.goTo} ${i + 1}: ${slide.eyebrow}`}
                    aria-current={activa ? "true" : undefined}
                    className={`group relative block h-11 w-16 overflow-hidden rounded-md border transition duration-300 lg:h-12 lg:w-[4.5rem] ${
                      activa
                        ? "border-white/70 opacity-100"
                        : "border-white/20 opacity-50 hover:opacity-90"
                    }`}
                  >
                    <Image
                      src={slide.image}
                      alt=""
                      fill
                      sizes="72px"
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <span className="absolute inset-0 bg-brand-darker/40" />

                    {/* Barra de progreso: solo en la placa activa. La `key`
                        la remonta en cada cambio para que arranque de cero. */}
                    {activa && (
                      <span
                        key={actual}
                        aria-hidden
                        className="absolute inset-x-0 bottom-0 h-1 origin-left bg-sky-300"
                        style={{
                          animation: reduceMotion
                            ? "none"
                            : `wiedmer-progress ${DURACION_MS}ms linear forwards`,
                          animationPlayState: pausado ? "paused" : "running",
                          transform: reduceMotion ? "scaleX(1)" : undefined,
                        }}
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => ir(actual - 1)}
              aria-label={t.prev}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 backdrop-blur-sm transition hover:border-white/60 hover:bg-white/10"
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => ir(actual + 1)}
              aria-label={t.next}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 backdrop-blur-sm transition hover:border-white/60 hover:bg-white/10"
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
