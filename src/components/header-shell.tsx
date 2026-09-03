"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Cáscara del header: solo se ocupa de saber si la página está scrolleada.
 *
 * Cuando el visitante baja unos píxeles le pone `data-scrolled="true"` al
 * <header>. Con eso el CSS compacta la barra: se esconde la franja de contacto
 * y aparece una sombra, para que el header ocupe menos y se despegue del
 * contenido. Los estilos viven en `site-header.tsx` con el prefijo
 * `group-data-[scrolled=true]:`.
 *
 * Está separado del header a propósito: el header es un Server Component que
 * lee la base de datos, y solo esta cascarita necesita correr en el navegador.
 * Así no mandamos el resto del header como JavaScript al cliente.
 *
 * `passive: true` en el listener le avisa al navegador que no vamos a llamar a
 * `preventDefault()`. Sin esa promesa el navegador tiene que esperar a que
 * nuestro código termine antes de scrollear, y el scroll se siente trabado.
 */
export function HeaderShell({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12);
    }

    onScroll(); // por si la página cargó ya scrolleada (al volver con "atrás")
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      data-scrolled={scrolled}
      className="group sticky top-0 z-40 border-b border-line bg-page/90 backdrop-blur-md transition-shadow duration-300 data-[scrolled=true]:shadow-md data-[scrolled=true]:shadow-ink/5"
    >
      {children}
    </header>
  );
}
