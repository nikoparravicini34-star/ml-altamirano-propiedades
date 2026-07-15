/*
# Seed sample properties

Insert sample real estate properties for demonstration purposes.
These represent premium properties in Nordelta, Puertos, San Sebastian, and other premium Argentine neighborhoods.
*/

INSERT INTO properties (
  title, price, currency, operation, property_type, city, neighborhood, province,
  bedrooms, bathrooms, garages, covered_area, total_area, short_description, full_description,
  photos, latitude, longitude, status, featured
) VALUES
(
  'Casa en San Sebastián', 450000, 'USD', 'venta', 'Casa', 'Escobar', 'San Sebastián', 'Buenos Aires',
  4, 3, 2, 250, 875,
  'Hermosa casa desarrollada en dos plantas sobre lote interno.',
  'Hermosa casa desarrollada en dos plantas sobre lote interno. Planta baja: amplio living comedor, cocina integrada, toilette, lavadero y dependencia de servicio. Planta alta: suite principal con vestidor, dos dormitorios con baño completo y terraza. Exterior: jardín perimetral, parrilla, pileta y quincho.',
  ARRAY[
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80'
  ],
  -34.3489, -58.8006, 'disponible', true
),
(
  'Departamento en Nordelta', 1250, 'USD', 'alquiler', 'Departamento', 'Tigre', 'Nordelta', 'Buenos Aires',
  2, 2, 1, 90, 90,
  'Moderno departamento en el corazón de Nordelta con vista al lago.',
  'Departamento de categoría en complejo residencial de Nordelta. Living comedor con salida a balcón, cocina equipada, dos dormitorios en suite, toilette. Amenities: pileta, gimnasio, sum, seguridad 24hs. Cochera cubierta incluida.',
  ARRAY[
    'https://images.unsplash.com/photo-1545324418-cc1a3a10d0b8?w=800&q=80',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80'
  ],
  -34.4036, -58.6404, 'disponible', true
),
(
  'Casa en Puertos del Lago', 380000, 'USD', 'venta', 'Casa', 'Escobar', 'Puertos del Lago', 'Buenos Aires',
  3, 2, 2, 200, 650,
  'Casa moderna en barrio cerrado Puertos del Lago con acceso directo al lago.',
  'Casa de diseño contemporáneo en dos plantas. Living doble altura, cocina gourmet, tres dormitorios, playroom. Jardín con pileta climatizada, muelle privado. Seguridad 24hs, club house con golf, tenis y polo.',
  ARRAY[
    'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&q=80',
    'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80'
  ],
  -34.3356, -58.7923, 'disponible', true
),
(
  'Casa en Santa Guadalupe', 1800, 'USD', 'alquiler', 'Casa', 'Pilar', 'Santa Guadalupe', 'Buenos Aires',
  3, 3, 2, 220, 500,
  'Casa de estilo clásico en barrio Santa Guadalupe, ideal para familia.',
  'Casa en una planta sobre lote de 800m2. Living comedor con hogar, cocina separada, tres dormitorios, dos baños, toilette. Quincho con parrilla, pileta, jardín con riego automático. Cochera para dos autos.',
  ARRAY[
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80',
    'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=800&q=80'
  ],
  -34.4567, -58.8765, 'disponible', false
),
(
  'Lote en San Matías', 120000, 'USD', 'venta', 'Lote', 'Escobar', 'San Matías', 'Buenos Aires',
  NULL, NULL, NULL, NULL, 800,
  'Lote de 800m2 en barrio San Matías, ideal para construir la casa de tus sueños.',
  'Excelente lote interno de 800m2 en barrio San Matías. Orientación norte, nivelado, listo para construir. Barrio con seguridad 24hs, club house, canchas de tenis y polo.',
  ARRAY[
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80'
  ],
  -34.3123, -58.8234, 'disponible', false
),
(
  'Departamento en Tigre Centro', 900, 'USD', 'alquiler', 'Departamento', 'Tigre', 'Tigre Centro', 'Buenos Aires',
  1, 1, 0, 60, 60,
  'Departamento luminoso en Tigre Centro, a metros del río.',
  'Monoambiente divisible en edificio moderno. Cocina equipada, baño completo, balcón con vista al río. Cochera opcional. Cercano a estación de tren, shopping y restaurantes.',
  ARRAY[
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80'
  ],
  -34.4259, -58.5795, 'disponible', false
);
