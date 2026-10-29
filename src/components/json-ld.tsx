/**
 * Datos estructurados (JSON-LD) para buscadores.
 *
 * Es un bloque de datos dentro del HTML que le dice a Google, en su propio
 * idioma, "esto es un comercio, se llama así, está acá, atiende en estos
 * horarios". Con eso puede armar el panel de información de la empresa y mostrar
 * el nombre del sitio correctamente en los resultados. El visitante no lo ve.
 *
 * Es un Server Component: no manda JavaScript al navegador, solo el texto.
 *
 * El `replace` de `<` es una medida de seguridad estándar: si algún dato
 * (un nombre de producto, por ejemplo) contuviera `</script>`, cerraría la
 * etiqueta antes de tiempo y lo que viniera después se ejecutaría como HTML.
 * Escapar el `<` lo evita sin cambiar el significado del JSON.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
