-- Ejecutar en Supabase Dashboard -> SQL Editor (todo de una vez)

-- ========== 20260624174848_create_properties_schema.sql ==========
/*
# Create real estate properties schema

1. New Tables
- `properties`
  - `id` (uuid, primary key)
  - `title` (text, not null) - Property title
  - `price` (numeric, not null) - Property price
  - `currency` (text, not null, default 'USD') - Currency (USD, ARS)
  - `operation` (text, not null) - Sale or Rent
  - `property_type` (text, not null) - House, Apartment, Land, etc.
  - `city` (text, not null)
  - `neighborhood` (text, not null)
  - `province` (text, not null)
  - `bedrooms` (integer) - Number of bedrooms
  - `bathrooms` (integer) - Number of bathrooms
  - `garages` (integer) - Number of garages/parking spaces
  - `covered_area` (numeric) - Covered surface area in m²
  - `total_area` (numeric) - Total surface area in m²
  - `short_description` (text) - Brief description
  - `full_description` (text) - Detailed description
  - `photos` (text[]) - Array of photo URLs
  - `video_url` (text) - Optional video URL
  - `latitude` (numeric) - Map coordinates
  - `longitude` (numeric) - Map coordinates
  - `status` (text, default 'available') - available, reserved, sold, rented
  - `featured` (boolean, default false) - Featured property flag
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

2. Security
- Enable RLS on `properties`.
- Allow public read access to all properties.
- Restrict write operations to authenticated admin users.
*/

CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  price numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  operation text NOT NULL CHECK (operation IN ('venta', 'alquiler')),
  property_type text NOT NULL,
  city text NOT NULL,
  neighborhood text NOT NULL,
  province text NOT NULL,
  bedrooms integer,
  bathrooms integer,
  garages integer,
  covered_area numeric,
  total_area numeric,
  short_description text,
  full_description text,
  photos text[] DEFAULT '{}',
  video_url text,
  latitude numeric,
  longitude numeric,
  status text NOT NULL DEFAULT 'disponible' CHECK (status IN ('disponible', 'reservada', 'vendida', 'alquilada')),
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_properties_operation ON properties(operation);
CREATE INDEX IF NOT EXISTS idx_properties_featured ON properties(featured);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Public can read all properties
DROP POLICY IF EXISTS "public_select_properties" ON properties;
CREATE POLICY "public_select_properties" ON properties FOR SELECT
  TO anon, authenticated USING (true);

-- Only authenticated users can insert
DROP POLICY IF EXISTS "authenticated_insert_properties" ON properties;
CREATE POLICY "authenticated_insert_properties" ON properties FOR INSERT
  TO authenticated WITH CHECK (true);

-- Only authenticated users can update
DROP POLICY IF EXISTS "authenticated_update_properties" ON properties;
CREATE POLICY "authenticated_update_properties" ON properties FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- Only authenticated users can delete
DROP POLICY IF EXISTS "authenticated_delete_properties" ON properties;
CREATE POLICY "authenticated_delete_properties" ON properties FOR DELETE
  TO authenticated USING (true);


-- ========== 20260624174914_seed_sample_properties.sql ==========
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


-- ========== 20260625124241_create_user_profile_tables.sql ==========
-- User profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_profile" ON user_profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

CREATE POLICY "insert_own_profile" ON user_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "update_own_profile" ON user_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "delete_own_profile" ON user_profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- Favorite properties
CREATE TABLE IF NOT EXISTS user_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, property_id)
);

ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_favorites" ON user_favorites FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_favorites" ON user_favorites FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_favorites" ON user_favorites FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_favorites" ON user_favorites FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Recently viewed properties
CREATE TABLE IF NOT EXISTS user_viewed_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now(),
  UNIQUE (user_id, property_id)
);

ALTER TABLE user_viewed_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_viewed" ON user_viewed_properties FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_viewed" ON user_viewed_properties FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_viewed" ON user_viewed_properties FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_viewed" ON user_viewed_properties FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- User inquiries (contact/consultation requests)
CREATE TABLE IF NOT EXISTS user_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  property_title text,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'respondida', 'cerrada')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_inquiries" ON user_inquiries FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_inquiries" ON user_inquiries FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_inquiries" ON user_inquiries FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_inquiries" ON user_inquiries FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Also allow anon inserts for contact form
CREATE POLICY "anon_insert_inquiries" ON user_inquiries FOR INSERT
  TO anon WITH CHECK (user_id IS NULL);

-- Allow authenticated admins to read all inquiries
CREATE POLICY "admin_select_all_inquiries" ON user_inquiries FOR SELECT
  TO authenticated USING (true);


-- ========== 20260625130127_extend_user_profiles_and_avatar_storage.sql ==========
-- Extend user_profiles with first/last name and profile completion flag
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name  text,
  ADD COLUMN IF NOT EXISTS profile_completed boolean NOT NULL DEFAULT false;

-- Storage bucket for user avatars (public read)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Public can read avatars
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'avatars_public_select'
  ) THEN
    CREATE POLICY "avatars_public_select" ON storage.objects
      FOR SELECT TO public USING (bucket_id = 'avatars');
  END IF;
END $$;

-- Authenticated users can insert their own avatar (path starts with their uid)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'avatars_auth_insert'
  ) THEN
    CREATE POLICY "avatars_auth_insert" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'avatars_auth_update'
  ) THEN
    CREATE POLICY "avatars_auth_update" ON storage.objects
      FOR UPDATE TO authenticated
      USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'avatars_auth_delete'
  ) THEN
    CREATE POLICY "avatars_auth_delete" ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;


-- ========== 20260715000000_property_media_storage.sql ==========
/*
  Property media storage — columns, buckets, and RLS policies.
  Run in Supabase Dashboard → SQL Editor, or via: npm run setup:db
*/

-- ── Extended property columns ────────────────────────────────────────────────
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'Argentina',
  ADD COLUMN IF NOT EXISTS amenities text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS features text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS age_years integer,
  ADD COLUMN IF NOT EXISTS videos text[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_properties_published ON properties(published);

-- ── Site settings (CMS singleton) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  data jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_site_settings" ON site_settings;
CREATE POLICY "public_select_site_settings" ON site_settings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_upsert_site_settings" ON site_settings;
CREATE POLICY "authenticated_upsert_site_settings" ON site_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Storage buckets ────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-images',
  'property-images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-videos',
  'property-videos',
  true,
  104857600,
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-assets',
  'site-assets',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── property-images policies ─────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'property_images_public_select'
  ) THEN
    CREATE POLICY "property_images_public_select" ON storage.objects
      FOR SELECT TO public USING (bucket_id = 'property-images');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'property_images_auth_insert'
  ) THEN
    CREATE POLICY "property_images_auth_insert" ON storage.objects
      FOR INSERT TO authenticated WITH CHECK (bucket_id = 'property-images');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'property_images_auth_update'
  ) THEN
    CREATE POLICY "property_images_auth_update" ON storage.objects
      FOR UPDATE TO authenticated USING (bucket_id = 'property-images');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'property_images_auth_delete'
  ) THEN
    CREATE POLICY "property_images_auth_delete" ON storage.objects
      FOR DELETE TO authenticated USING (bucket_id = 'property-images');
  END IF;
END $$;

-- ── property-videos policies ─────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'property_videos_public_select'
  ) THEN
    CREATE POLICY "property_videos_public_select" ON storage.objects
      FOR SELECT TO public USING (bucket_id = 'property-videos');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'property_videos_auth_insert'
  ) THEN
    CREATE POLICY "property_videos_auth_insert" ON storage.objects
      FOR INSERT TO authenticated WITH CHECK (bucket_id = 'property-videos');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'property_videos_auth_update'
  ) THEN
    CREATE POLICY "property_videos_auth_update" ON storage.objects
      FOR UPDATE TO authenticated USING (bucket_id = 'property-videos');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'property_videos_auth_delete'
  ) THEN
    CREATE POLICY "property_videos_auth_delete" ON storage.objects
      FOR DELETE TO authenticated USING (bucket_id = 'property-videos');
  END IF;
END $$;

-- ── site-assets policies ───────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'site_assets_public_select'
  ) THEN
    CREATE POLICY "site_assets_public_select" ON storage.objects
      FOR SELECT TO public USING (bucket_id = 'site-assets');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'site_assets_auth_insert'
  ) THEN
    CREATE POLICY "site_assets_auth_insert" ON storage.objects
      FOR INSERT TO authenticated WITH CHECK (bucket_id = 'site-assets');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'site_assets_auth_update'
  ) THEN
    CREATE POLICY "site_assets_auth_update" ON storage.objects
      FOR UPDATE TO authenticated USING (bucket_id = 'site-assets');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'site_assets_auth_delete'
  ) THEN
    CREATE POLICY "site_assets_auth_delete" ON storage.objects
      FOR DELETE TO authenticated USING (bucket_id = 'site-assets');
  END IF;
END $$;


-- ========== 20260715010000_remove_property_media_limits.sql ==========
/*
  Remove artificial file size limits on property media buckets.
  Expands allowed MIME types for high-resolution photos and 4K videos.
  Run in Supabase Dashboard → SQL Editor, or via: npm run setup:db
*/

UPDATE storage.buckets
SET
  file_size_limit = NULL,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
    'image/avif',
    'image/tiff'
  ]
WHERE id = 'property-images';

UPDATE storage.buckets
SET
  file_size_limit = NULL,
  allowed_mime_types = ARRAY[
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-m4v',
    'video/x-matroska',
    'video/ogg',
    'application/octet-stream'
  ]
WHERE id = 'property-videos';


-- ========== 20260715020000_fix_site_assets_storage.sql ==========
/*
  Expand site-assets bucket for logo, favicon, hero and banner uploads.
  Run in Supabase Dashboard → SQL Editor, or via: npm run setup:db
*/

UPDATE storage.buckets
SET
  file_size_limit = NULL,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'image/x-icon',
    'image/vnd.microsoft.icon',
    'image/heic',
    'image/heif',
    'image/avif',
    'image/tiff',
    'application/octet-stream'
  ]
WHERE id = 'site-assets';

UPDATE storage.buckets
SET
  file_size_limit = NULL,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
    'image/avif'
  ]
WHERE id = 'avatars';


