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
