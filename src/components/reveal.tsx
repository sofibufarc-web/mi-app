"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

/**
 * Aparición al hacer scroll.
 *
 * Envolvés una sección con <Reveal> y su contenido entra con un fundido suave
 * cuando llega a la pantalla, en vez de estar ahí desde el principio.
 *
 * Se hace con IntersectionObserver, que es la API del navegador para
 * preguntar "¿este elemento está visible?". La alternativa vieja era escuchar
 * el evento `scroll` y medir posiciones en cada píxel, lo que dispara cientos
 * de cálculos por segundo y traba el scroll. El observer avisa solo cuando
 * hace falta y no cuesta nada mientras tanto.
 *
 * El estilo (opacidad, desplazamiento, duración) vive en la clase `.reveal` de
 * `globals.css`, que además se anula sola si el usuario pidió "reducir
 * movimiento" en su sistema.
 */
export function Reveal({
  children,
  /**
   * Milisegundos de retraso. Sirve para escalonar: si a los ítems de una
   * grilla les das 0, 80, 160… entran en cascada en vez de todos de golpe.
   */
  delay = 0,
  /**
   * Qué etiqueta HTML genera. Por defecto un <div>, pero conviene pasarle
   * "section" o "li" para no romper la semántica del documento.
   */
  as: Tag = "div" as ElementType,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  as?: ElementType;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (element === null) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        // Una vez que entró, dejamos de observar: la animación es de entrada,
        // no queremos que se repita cada vez que sube y baja la página.
        observer.disconnect();
      },
      {
        // Dispara cuando asoma un 10% del elemento…
        threshold: 0.1,
        // …y con 80px de margen inferior, para que la animación arranque un
        // toque antes de que el elemento quede a la vista y no se vea tarde.
        rootMargin: "0px 0px -80px 0px",
      },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal ${className}`}
      data-visible={visible}
      style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}
