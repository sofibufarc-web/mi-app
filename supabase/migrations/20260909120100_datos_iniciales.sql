-- ============================================================================
-- Datos iniciales: el catálogo que hasta ahora vivía en src/data/*.json.
--
-- 6 categorías · 33 productos · 1 fila de configuración.
--
-- Es idempotente ("on conflict do nothing"): correrla dos veces no duplica
-- nada ni pisa cambios hechos después desde el panel.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- Categorías
-- ---------------------------------------------------------------------------
insert into public.categories (id, name, slug, description, image, sort_order) values
  ('c-001', 'Pinturas', 'pinturas', 'Látex, esmaltes sintéticos, hidroesmaltes, enduidos y fijadores para interior y exterior.', '/img/categorias/pinturas.webp', 1),
  ('c-002', 'Aerosoles', 'aerosoles', 'Esmaltes, antióxidos e imprimaciones en aerosol para retoques y trabajos chicos.', '/img/categorias/aerosoles.webp', 2),
  ('c-003', 'Rodillos y Pinceles', 'rodillos-y-pinceles', 'Rodillos de lana y poliéster, mini rodillos, pinceles, pinceletas, bandejas y extensores.', '/img/categorias/rodillos-y-pinceles.webp', 3),
  ('c-004', 'Lijado y Espatulado', 'lijado-y-espatulado', 'Lijas al agua y para madera, espátulas, llanas, rasquetas y lijadoras manuales.', '/img/categorias/lijado-y-espatulado.webp', 4),
  ('c-005', 'Limpieza y Protección', 'limpieza-y-proteccion', 'Guantes, cobertores, cintas de enmascarar, trapos y paños para pulir.', '/img/categorias/limpieza-y-proteccion.webp', 5),
  ('c-006', 'Impermeabilizantes', 'impermeabilizantes', 'Membranas líquidas y en pasta, vendas de poliéster y mantas asfálticas.', '/img/categorias/impermeabilizantes.webp', 6)
on conflict (id) do nothing;


-- ---------------------------------------------------------------------------
-- Productos
-- ---------------------------------------------------------------------------
-- category_id: en los JSON la cadena vacía significaba "sin categoría";
-- en la base eso es NULL, que es lo que una clave foránea sabe manejar.
insert into public.products
  (id, sku, name, slug, description, price, category_id, brand, unit, stock,
   featured, active, images, created_at, updated_at) values
  ('p-001', 'SIN-1020', 'Látex Interior Recuplast 20 L', 'latex-interior-recuplast-20-l', E'Látex acrílico mate para interiores de alto poder cubritivo.\n\nRinde entre 10 y 12 m² por litro por mano sobre superficies selladas. Se aplica con pincel, rodillo o soplete, diluido hasta un 30 % con agua. Secado al tacto en 30 minutos y repintado a las 4 horas.\n\nBalde de 20 litros. Base blanca entintable.', 89900, 'c-001', 'Sinteplast', 'balde 20 L', 48, true, true, '{}', '2026-01-15T10:00:00.000Z', '2026-01-15T10:00:00.000Z'),
  ('p-002', 'SIN-1004', 'Látex Interior Recuplast 4 L', 'latex-interior-recuplast-4-l', E'La misma fórmula del balde de 20 litros en presentación chica, ideal para retoques o ambientes individuales.\n\nLavable, sin olor y de rápido secado.', 21400, 'c-001', 'Sinteplast', 'lata 4 L', 120, false, true, '{}', '2026-01-15T10:00:00.000Z', '2026-01-15T10:00:00.000Z'),
  ('p-003', 'SIN-2010', 'Látex Frentes Recuplast 10 L', 'latex-frentes-recuplast-10-l', E'Látex acrílico para exteriores con filtro UV y resistencia a la intemperie.\n\nHidrorrepelente: evita que el agua penetre en el revoque pero deja respirar la pared. Recomendado para frentes, medianeras y muros expuestos.', 68500, 'c-001', 'Sinteplast', 'balde 10 L', 35, true, true, '{}', '2026-01-15T10:00:00.000Z', '2026-01-15T10:00:00.000Z'),
  ('p-004', 'SIN-3001', 'Esmalte Sintético Converlux Blanco 1 L', 'esmalte-sintetico-converlux-blanco-1-l', E'Esmalte sintético brillante para madera y metal, interior y exterior.\n\nAlta resistencia al desgaste y al lavado. Se diluye con aguarrás mineral hasta un 10 %.', 14800, 'c-001', 'Sinteplast', 'lata 1 L', 200, false, true, '{}', '2026-01-15T10:00:00.000Z', '2026-01-15T10:00:00.000Z'),
  ('p-005', 'SIN-3004', 'Esmalte Sintético Converlux Negro 4 L', 'esmalte-sintetico-converlux-negro-4-l', E'Esmalte sintético negro brillante en presentación de 4 litros.\n\nIdeal para rejas, portones, herrería y carpintería exterior. Aplicar sobre fondo antióxido en superficies ferrosas.', 52300, 'c-001', 'Sinteplast', 'lata 4 L', 64, false, true, '{}', '2026-01-15T10:00:00.000Z', '2026-01-15T10:00:00.000Z'),
  ('p-006', 'SIN-4004', 'Hidroesmalte Satinado Blanco 4 L', 'hidroesmalte-satinado-blanco-4-l', E'Esmalte al agua de terminación satinada. Sin olor y de secado rápido.\n\nNo amarillea con el tiempo, a diferencia de los esmaltes sintéticos. Las herramientas se limpian con agua.', 46900, 'c-001', 'Sinteplast', 'lata 4 L', 52, true, true, '{}', '2026-01-15T10:00:00.000Z', '2026-01-15T10:00:00.000Z'),
  ('p-007', 'SIN-5020', 'Enduido Plástico Interior 20 kg', 'enduido-plastico-interior-20-kg', E'Masilla lista para usar para nivelar y alisar paredes de interior antes de pintar.\n\nSe aplica con espátula o llana en manos finas, dejando secar 4 horas entre mano y mano. Lijar con grano 220 antes de pintar.', 31200, 'c-001', 'Sinteplast', 'balde 20 kg', 40, false, true, '{}', '2026-01-15T10:00:00.000Z', '2026-01-15T10:00:00.000Z'),
  ('p-008', 'SIN-6004', 'Fijador al Agua Concentrado 4 L', 'fijador-al-agua-concentrado-4-l', E'Sellador penetrante que consolida revoques y yeso porosos y empareja la absorción antes de pintar.\n\nSe diluye 1:1 con agua. Un litro de concentrado rinde hasta 20 m² diluido.', 18700, 'c-001', 'Sinteplast', 'lata 4 L', 88, false, true, '{}', '2026-01-15T10:00:00.000Z', '2026-01-15T10:00:00.000Z'),
  ('p-009', 'SIN-7001', 'Barniz Marino Poliuretánico 1 L', 'barniz-marino-poliuretanico-1-l', E'Barniz de alta resistencia a la intemperie y a la radiación solar para maderas expuestas.\n\nPuertas de entrada, aberturas, mobiliario de exterior y embarcaciones. Aplicar tres manos con lijado suave intermedio.', 19600, 'c-001', 'Sinteplast', 'lata 1 L', 70, false, true, '{}', '2026-01-15T10:00:00.000Z', '2026-01-15T10:00:00.000Z'),
  ('p-010', 'AER-0400', 'Aerosol Esmalte Negro Mate 440 cc', 'aerosol-esmalte-negro-mate-440-cc', E'Esmalte sintético en aerosol de secado rápido, terminación mate.\n\nVálvula de 360° que permite pintar en cualquier posición. Rinde aproximadamente 1,5 m² por envase.', 6900, 'c-002', 'Colorin', 'aerosol 440 cc', 240, false, true, '{}', '2026-01-15T10:00:00.000Z', '2026-01-15T10:00:00.000Z'),
  ('p-011', 'AER-0401', 'Aerosol Esmalte Blanco Brillante 440 cc', 'aerosol-esmalte-blanco-brillante-440-cc', E'Aerosol de terminación brillante para retoques sobre metal, madera y plástico rígido.\n\nAgitar un minuto antes de usar y aplicar a 25 cm de la superficie en manos finas cruzadas.', 6900, 'c-002', 'Colorin', 'aerosol 440 cc', 210, false, true, '{}', '2026-01-15T10:00:00.000Z', '2026-01-15T10:00:00.000Z'),
  ('p-012', 'AER-0410', 'Aerosol Antióxido Gris 440 cc', 'aerosol-antioxido-gris-440-cc', E'Fondo antióxido en aerosol para hierro y acero.\n\nSe aplica sobre metal limpio y desengrasado, antes del esmalte de terminación. Secado al tacto en 15 minutos.', 7450, 'c-002', 'Colorin', 'aerosol 440 cc', 180, true, true, '{}', '2026-01-15T10:00:00.000Z', '2026-01-15T10:00:00.000Z'),
  ('p-013', 'AER-0420', 'Aerosol Imprimación Universal 440 cc', 'aerosol-imprimacion-universal-440-cc', E'Imprimación de anclaje para superficies difíciles: plástico, galvanizado, aluminio y azulejo.\n\nMejora la adherencia de la pintura de terminación y evita el descascarado.', 7100, 'c-002', 'Colorin', 'aerosol 440 cc', 150, false, true, '{}', '2026-01-15T10:00:00.000Z', '2026-01-15T10:00:00.000Z'),
  ('p-014', 'ACC-2201', 'Rodillo Lana Natural 22 cm', 'rodillo-lana-natural-22-cm', E'Rodillo de lana natural de pelo largo para látex sobre superficies rugosas.\n\nGran carga de pintura, ideal para revoques gruesos y paredes texturadas. Mango plástico con rosca para extensor.', 8450, 'c-003', 'El Galgo', 'unidad', 95, true, true, '{}', '2026-01-15T10:00:00.000Z', '2026-01-15T10:00:00.000Z'),
  ('p-015', 'ACC-2210', 'Rodillo Antigota Poliéster 22 cm', 'rodillo-antigota-poliester-22-cm', E'Rodillo de poliéster de pelo corto que minimiza el salpicado.\n\nRecomendado para látex sobre paredes lisas y cielorrasos, donde la gota es un problema.', 6300, 'c-003', 'El Galgo', 'unidad', 130, false, true, '{}', '2026-01-15T10:00:00.000Z', '2026-01-15T10:00:00.000Z'),
  ('p-016', 'ACC-2305', 'Mini Rodillo de Espuma 10 cm (x2)', 'mini-rodillo-de-espuma-10-cm-x2', E'Juego de dos mini rodillos de espuma de poro fino con mango metálico.\n\nPara esmaltes y barnices sobre puertas, marcos y muebles: deja una terminación lisa, sin marca de pelo.', 3200, 'c-003', 'El Galgo', 'juego x2', 160, false, true, '{}', '2026-01-15T10:00:00.000Z', '2026-01-15T10:00:00.000Z'),
  ('p-017', 'ACC-2410', 'Pincel Cerda Blanca N° 30', 'pincel-cerda-blanca-n-30', E'Pincel de cerda blanca natural con virola de acero inoxidable y mango de madera.\n\nApto para esmaltes sintéticos, barnices y látex. Cerda seleccionada que no se desprende.', 4800, 'c-003', 'El Galgo', 'unidad', 140, false, true, '{}', '2026-01-15T10:00:00.000Z', '2026-01-15T10:00:00.000Z'),
  ('p-018', 'ACC-2415', 'Pinceleta Angular 2"', 'pinceleta-angular-2', E'Pinceleta de filamento sintético con corte angular para cortes prolijos contra molduras, zócalos y aberturas.\n\nEl filamento sintético soporta pinturas al agua sin hincharse.', 3950, 'c-003', 'El Galgo', 'unidad', 175, false, true, '{}', '2026-01-15T10:00:00.000Z', '2026-01-15T10:00:00.000Z'),
  ('p-019', 'ACC-2500', 'Bandeja Plástica para Rodillo 22 cm', 'bandeja-plastica-para-rodillo-22-cm', E'Bandeja de plástico reforzado con rampa escurridora para rodillos de hasta 22 cm.\n\nCompatible con bolsas descartables de bandeja, que evitan tener que lavarla.', 2750, 'c-003', NULL, 'unidad', 220, false, true, '{}', '2026-01-15T10:00:00.000Z', '2026-01-15T10:00:00.000Z'),
  ('p-020', 'ACC-2600', 'Extensor Telescópico 1,5 a 3 m', 'extensor-telescopico-1-5-a-3-m', E'Extensor de aluminio telescópico con traba a rosca y puño antideslizante.\n\nRosca universal compatible con rodillos y fratachos. Permite pintar cielorrasos y frentes sin andamio.', 18900, 'c-003', NULL, 'unidad', 42, true, true, '{}', '2026-01-15T10:00:00.000Z', '2026-01-15T10:00:00.000Z'),
  ('p-021', 'LIJ-3100', 'Lija al Agua Grano 220 (x10)', 'lija-al-agua-grano-220-x10', E'Paquete de 10 hojas de lija al agua de 23 x 28 cm, grano 220.\n\nPara lijado fino de enduido, masilla y esmaltes entre manos. Se puede usar en seco o humedecida.', 5400, 'c-004', 'Norton', 'paquete x10', 190, false, true, '{}', '2026-01-15T10:00:00.000Z', '2026-01-15T10:00:00.000Z'),
  ('p-022', 'LIJ-3110', 'Lija para Madera Grano 80 (x10)', 'lija-para-madera-grano-80-x10', E'Paquete de 10 hojas de lija de óxido de aluminio grano 80 para desbaste de madera.\n\nPrimer paso antes de pasar a granos finos. Soporte de papel resistente al rasgado.', 4900, 'c-004', 'Norton', 'paquete x10', 175, false, true, '{}', '2026-01-15T10:00:00.000Z', '2026-01-15T10:00:00.000Z'),
  ('p-023', 'LIJ-3200', 'Espátula de Enduir Acero 10 cm', 'espatula-de-enduir-acero-10-cm', E'Espátula de hoja flexible de acero inoxidable de 10 cm con mango de madera remachado.\n\nPara aplicar enduido y masilla, y para quitar pintura floja.', 4200, 'c-004', NULL, 'unidad', 130, false, true, '{}', '2026-01-15T10:00:00.000Z', '2026-01-15T10:00:00.000Z'),
  ('p-024', 'LIJ-3210', 'Llana Metálica Dentada 28 cm', 'llana-metalica-dentada-28-cm', E'Llana de acero templado de 28 x 12 cm con dentado de 6 mm y mango ergonómico.\n\nPara aplicar revestimientos plásticos, microcemento y adhesivos en capa regulada.', 12600, 'c-004', NULL, 'unidad', 55, false, true, '{}', '2026-01-15T10:00:00.000Z', '2026-01-15T10:00:00.000Z'),
  ('p-025', 'LIJ-3300', 'Lijadora Manual con Mango', 'lijadora-manual-con-mango', E'Taco lijador manual con sistema de sujeción a presión para media hoja de lija.\n\nMantiene la lija tensa y plana, lo que evita marcas y ondulaciones en la pared.', 9800, 'c-004', NULL, 'unidad', 60, false, true, '{}', '2026-01-15T10:00:00.000Z', '2026-01-15T10:00:00.000Z'),
  ('p-026', 'LIM-4100', 'Guantes de Látex Talle L (par)', 'guantes-de-latex-talle-l-par', E'Par de guantes de látex natural con interior flocado y palma antideslizante.\n\nResistentes a solventes suaves y detergentes. Talle L.', 2350, 'c-005', NULL, 'par', 300, false, true, '{}', '2026-01-15T10:00:00.000Z', '2026-01-15T10:00:00.000Z'),
  ('p-027', 'LIM-4200', 'Cobertor Plástico 4 x 5 m', 'cobertor-plastico-4-x-5-m', E'Film de polietileno de 4 x 5 metros para cubrir muebles, pisos y aberturas.\n\nDescartable, liviano y de espesor suficiente para no rasgarse al desplegarlo.', 5600, 'c-005', NULL, 'unidad', 145, false, true, '{}', '2026-01-15T10:00:00.000Z', '2026-01-15T10:00:00.000Z'),
  ('p-028', 'LIM-4300', 'Cinta de Papel Enmascarar 24 mm x 40 m', 'cinta-de-papel-enmascarar-24-mm-x-40-m', E'Cinta de papel crepé con adhesivo de remoción limpia.\n\nSe retira sin dejar residuo dentro de las 24 horas. Para proteger cantos, zócalos y vidrios al pintar.', 3100, 'c-005', '3M', 'rollo', 260, true, true, '{}', '2026-01-15T10:00:00.000Z', '2026-01-15T10:00:00.000Z'),
  ('p-029', 'LIM-4400', 'Trapo Rejilla Multiuso (x3)', 'trapo-rejilla-multiuso-x3', E'Pack de tres rejillas de algodón de alta absorción para limpieza de obra y de herramientas.\n\nLavables y reutilizables.', 2900, 'c-005', NULL, 'pack x3', 280, false, true, '{}', '2026-01-15T10:00:00.000Z', '2026-01-15T10:00:00.000Z'),
  ('p-030', 'IMP-5120', 'Membrana Líquida Fibrada Blanca 20 kg', 'membrana-liquida-fibrada-blanca-20-kg', E'Membrana acrílica en pasta con fibras para impermeabilizar techos y losas.\n\nSe aplica en tres manos cruzadas con pincel o llana, sobre superficie limpia y seca. Blanca: refleja la radiación solar y baja la temperatura interior.\n\nRendimiento aproximado: 1,5 kg por m² en el sistema completo.', 88700, 'c-006', 'Sinteplast', 'balde 20 kg', 30, true, true, '{}', '2026-01-15T10:00:00.000Z', '2026-01-15T10:00:00.000Z'),
  ('p-031', 'IMP-5200', 'Venda de Poliéster 10 cm x 20 m', 'venda-de-poliester-10-cm-x-20-m', E'Malla de poliéster para refuerzo de encuentros, juntas y fisuras dentro del sistema de membrana líquida.\n\nSe embebe entre la primera y la segunda mano de membrana.', 8900, 'c-006', NULL, 'rollo 20 m', 85, false, true, '{}', '2026-01-15T10:00:00.000Z', '2026-01-15T10:00:00.000Z'),
  ('p-032', 'IMP-5300', 'Manta Asfáltica Aluminizada 10 m²', 'manta-asfaltica-aluminizada-10-m2', E'Rollo de membrana asfáltica de 4 mm con terminación de aluminio, 10 m² por rollo.\n\nSe aplica con soplete sobre superficie imprimada. El aluminio protege el asfalto de los rayos UV y alarga la vida útil.', 74500, 'c-006', NULL, 'rollo 10 m²', 24, false, true, '{}', '2026-01-15T10:00:00.000Z', '2026-01-15T10:00:00.000Z'),
  ('p-033', 'SIN-9004', 'Convertidor de Óxido 1 L', 'convertidor-de-oxido-1-l', E'Transforma el óxido en una capa estable de fosfato de hierro, lista para pintar.\n\nSe aplica directamente sobre el metal oxidado, sin necesidad de llegar al metal blanco. Producto discontinuado por el proveedor: se muestra como referencia.', 16400, 'c-001', 'Sinteplast', 'lata 1 L', 0, false, false, '{}', '2026-01-15T10:00:00.000Z', '2026-01-15T10:00:00.000Z')
on conflict (id) do nothing;


-- ---------------------------------------------------------------------------
-- Configuración de la tienda
-- ---------------------------------------------------------------------------
insert into public.store_config
  (id, store_name, logo_text, logo_image, whatsapp_number, welcome_title,
   welcome_text, contact, colors) values
  (1, 'Wiedmer', 'WIEDMER', NULL,
   '5493416756969', 'Distribuidor mayorista de pinturería y ferretería',
   'Importamos y distribuimos artículos para pinturerías y ferreterías desde Rosario. Entregamos en Gran Rosario, Santa Fe, norte de Buenos Aires, Entre Ríos, Córdoba y La Pampa.',
   '{"address":"Almafuerte 645, Rosario, Santa Fe","phone":"(0341) 430-5931","email":"ventas@wiedmer.com.ar","hours":"Lunes a viernes de 8 a 17 h"}'::jsonb,
   '{"brand":"#113bc2","brandDark":"#0d2d94","brandDarker":"#07184d"}'::jsonb)
on conflict (id) do nothing;


-- ---------------------------------------------------------------------------
-- Poner las secuencias al día
-- ---------------------------------------------------------------------------
-- Las filas de arriba traen su id escrito a mano, así que las secuencias que
-- generan "c-007" y "p-034" siguen en cero. Sin este setval, el primer alta
-- desde el panel intentaría usar "p-001" y chocaría con la clave primaria.
select setval('public.categories_id_seq', 6, true);
select setval('public.products_id_seq',   33, true);
