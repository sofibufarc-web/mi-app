-- ---------------------------------------------------------------------------
-- Fichas técnicas y hojas de seguridad en PDF
-- ---------------------------------------------------------------------------
-- La carpeta técnica de cada producto lleva PDF de los fabricantes. Van al
-- mismo bucket de las fotos (mismas políticas: leer cualquiera, escribir solo
-- un admin). Se amplía el tipo permitido y el tamaño máximo: un PDF de ficha
-- técnica pesa bastante más que una foto ya optimizada.
update storage.buckets
set file_size_limit    = 15728640, -- 15 MB
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/avif',
      'application/pdf'
    ]
where id = 'productos';
