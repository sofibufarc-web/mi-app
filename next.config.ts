import type { NextConfig } from "next";

/**
 * De dónde se permiten cargar imágenes remotas.
 *
 * `next/image` optimiza las fotos: las achica al tamaño en que se van a ver y
 * las convierte a formatos modernos. Para eso el servidor tiene que bajarlas,
 * y por seguridad Next solo baja de dominios declarados acá. Sin esta lista,
 * cualquiera podría pedirle a nuestro servidor que procese fotos ajenas y
 * usarlo de gancho para su propio tráfico.
 *
 * El único dominio remoto que usa la app es el de Supabase Storage, donde
 * viven las fotos de producto que se suben desde el panel. Se saca de la misma
 * variable de entorno que ya configura el login, así no hay un dominio escrito
 * a mano que quede apuntando a otro proyecto después de una migración.
 */
function supabaseHostname(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    // Variable mal escrita. No rompemos el build por esto: sin el patrón, las
    // fotos remotas fallan y se ve enseguida; con un throw acá no compila nada.
    return null;
  }
}

const host = supabaseHostname();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: host
      ? [{ protocol: "https", hostname: host, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
};

export default nextConfig;
