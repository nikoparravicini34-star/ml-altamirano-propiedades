/*
  Roles, helper functions, RLS hardening, and Storage policies.

  Run manually in Supabase Dashboard → SQL Editor, or via your migration workflow.
  Does NOT modify OAuth or frontend code.
*/

-- ── 1. user_profiles: missing columns ─────────────────────────────────────────

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user'
    CHECK (role IN ('super_admin', 'admin', 'editor', 'agent', 'user')),
  ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_activity timestamptz;

CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles (role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles (email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_blocked ON public.user_profiles (is_blocked);

-- Backfill email from auth.users for existing rows
UPDATE public.user_profiles up
SET email = u.email
FROM auth.users u
WHERE up.id = u.id
  AND (up.email IS NULL OR up.email = '');

-- Promote known super-admin account (matches src/lib/roles.ts)
UPDATE public.user_profiles up
SET role = 'super_admin'
FROM auth.users u
WHERE up.id = u.id
  AND lower(u.email) = 'nikoparravicini34@gmail.com';

-- ── 2. Role helper functions (SECURITY DEFINER to avoid RLS recursion) ───────

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_profiles
  WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid()
      AND NOT is_blocked
      AND role IN ('super_admin', 'admin', 'editor', 'agent')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_above()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid()
      AND NOT is_blocked
      AND role IN ('super_admin', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid()
      AND NOT is_blocked
      AND role = 'super_admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_or_above() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, anon;

-- ── 3. properties RLS ────────────────────────────────────────────────────────
-- Public read; staff write; admin+ delete (matches src/lib/roles.ts)

DROP POLICY IF EXISTS "public_select_properties" ON public.properties;
CREATE POLICY "public_select_properties" ON public.properties
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "authenticated_insert_properties" ON public.properties;
CREATE POLICY "staff_insert_properties" ON public.properties
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "authenticated_update_properties" ON public.properties;
CREATE POLICY "staff_update_properties" ON public.properties
  FOR UPDATE TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "authenticated_delete_properties" ON public.properties;
CREATE POLICY "admin_delete_properties" ON public.properties
  FOR DELETE TO authenticated
  USING (public.is_admin_or_above());

-- ── 4. user_profiles RLS ─────────────────────────────────────────────────────
-- Own profile; admin+ read all; super_admin manages users (role/is_blocked)

DROP POLICY IF EXISTS "select_own_profile" ON public.user_profiles;
CREATE POLICY "select_own_profile" ON public.user_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "admin_select_all_profiles" ON public.user_profiles;
CREATE POLICY "admin_select_all_profiles" ON public.user_profiles
  FOR SELECT TO authenticated
  USING (public.is_admin_or_above());

DROP POLICY IF EXISTS "insert_own_profile" ON public.user_profiles;
CREATE POLICY "insert_own_profile" ON public.user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = id
    AND role = 'user'
    AND is_blocked = false
  );

DROP POLICY IF EXISTS "update_own_profile" ON public.user_profiles;
CREATE POLICY "update_own_profile" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id AND NOT is_blocked)
  WITH CHECK (
    auth.uid() = id
    AND role = public.current_user_role()
    AND is_blocked = (
      SELECT p.is_blocked
      FROM public.user_profiles p
      WHERE p.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "super_admin_update_profiles" ON public.user_profiles;
CREATE POLICY "super_admin_update_profiles" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "delete_own_profile" ON public.user_profiles;
CREATE POLICY "delete_own_profile" ON public.user_profiles
  FOR DELETE TO authenticated
  USING (auth.uid() = id);

-- ── 5. site_settings RLS ─────────────────────────────────────────────────────
-- Public read; admin+ write (matches canManageSiteSettings)

DROP POLICY IF EXISTS "public_select_site_settings" ON public.site_settings;
CREATE POLICY "public_select_site_settings" ON public.site_settings
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "authenticated_upsert_site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "admin_insert_site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "admin_update_site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "admin_delete_site_settings" ON public.site_settings;

CREATE POLICY "admin_insert_site_settings" ON public.site_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_above());

CREATE POLICY "admin_update_site_settings" ON public.site_settings
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_above())
  WITH CHECK (public.is_admin_or_above());

CREATE POLICY "admin_delete_site_settings" ON public.site_settings
  FOR DELETE TO authenticated
  USING (public.is_admin_or_above());

-- ── 6. user_inquiries RLS ────────────────────────────────────────────────────
-- Own read; anon contact form; admin/agent manage all (matches canManageInquiries)

DROP POLICY IF EXISTS "select_own_inquiries" ON public.user_inquiries;
CREATE POLICY "select_own_inquiries" ON public.user_inquiries
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_select_all_inquiries" ON public.user_inquiries;
DROP POLICY IF EXISTS "staff_select_all_inquiries" ON public.user_inquiries;
CREATE POLICY "staff_select_all_inquiries" ON public.user_inquiries
  FOR SELECT TO authenticated
  USING (
    public.is_admin_or_above()
    OR public.current_user_role() = 'agent'
  );

DROP POLICY IF EXISTS "insert_own_inquiries" ON public.user_inquiries;
CREATE POLICY "insert_own_inquiries" ON public.user_inquiries
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "anon_insert_inquiries" ON public.user_inquiries;
CREATE POLICY "anon_insert_inquiries" ON public.user_inquiries
  FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

DROP POLICY IF EXISTS "update_own_inquiries" ON public.user_inquiries;
CREATE POLICY "update_own_inquiries" ON public.user_inquiries
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "staff_update_inquiries" ON public.user_inquiries;
CREATE POLICY "staff_update_inquiries" ON public.user_inquiries
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_or_above()
    OR public.current_user_role() = 'agent'
  )
  WITH CHECK (
    public.is_admin_or_above()
    OR public.current_user_role() = 'agent'
  );

DROP POLICY IF EXISTS "delete_own_inquiries" ON public.user_inquiries;
CREATE POLICY "delete_own_inquiries" ON public.user_inquiries
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ── 7. Storage buckets (idempotent) ──────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-images',
  'property-images',
  true,
  NULL,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'image/heic', 'image/heif', 'image/avif', 'image/tiff'
  ]
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
  NULL,
  ARRAY[
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
    'video/x-m4v', 'video/x-matroska', 'video/ogg', 'application/octet-stream'
  ]
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
  NULL,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
    'image/x-icon', 'image/vnd.microsoft.icon',
    'image/heic', 'image/heif', 'image/avif', 'image/tiff',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  NULL,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'image/heic', 'image/heif', 'image/avif'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── 8. Storage policies ──────────────────────────────────────────────────────
-- Public read all buckets; staff → property media; admin+ → site-assets;
-- users → own avatars; super_admin → any avatar

-- property-images
DROP POLICY IF EXISTS "property_images_public_select" ON storage.objects;
DROP POLICY IF EXISTS "property_images_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "property_images_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "property_images_auth_delete" ON storage.objects;
DROP POLICY IF EXISTS "property_images_staff_insert" ON storage.objects;
DROP POLICY IF EXISTS "property_images_staff_update" ON storage.objects;
DROP POLICY IF EXISTS "property_images_staff_delete" ON storage.objects;

CREATE POLICY "property_images_public_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'property-images');

CREATE POLICY "property_images_staff_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'property-images' AND public.is_staff());

CREATE POLICY "property_images_staff_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'property-images' AND public.is_staff())
  WITH CHECK (bucket_id = 'property-images' AND public.is_staff());

CREATE POLICY "property_images_staff_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'property-images' AND public.is_staff());

-- property-videos
DROP POLICY IF EXISTS "property_videos_public_select" ON storage.objects;
DROP POLICY IF EXISTS "property_videos_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "property_videos_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "property_videos_auth_delete" ON storage.objects;
DROP POLICY IF EXISTS "property_videos_staff_insert" ON storage.objects;
DROP POLICY IF EXISTS "property_videos_staff_update" ON storage.objects;
DROP POLICY IF EXISTS "property_videos_staff_delete" ON storage.objects;

CREATE POLICY "property_videos_public_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'property-videos');

CREATE POLICY "property_videos_staff_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'property-videos' AND public.is_staff());

CREATE POLICY "property_videos_staff_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'property-videos' AND public.is_staff())
  WITH CHECK (bucket_id = 'property-videos' AND public.is_staff());

CREATE POLICY "property_videos_staff_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'property-videos' AND public.is_staff());

-- site-assets
DROP POLICY IF EXISTS "site_assets_public_select" ON storage.objects;
DROP POLICY IF EXISTS "site_assets_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "site_assets_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "site_assets_auth_delete" ON storage.objects;
DROP POLICY IF EXISTS "site_assets_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "site_assets_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "site_assets_admin_delete" ON storage.objects;

CREATE POLICY "site_assets_public_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'site-assets');

CREATE POLICY "site_assets_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'site-assets' AND public.is_admin_or_above());

CREATE POLICY "site_assets_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'site-assets' AND public.is_admin_or_above())
  WITH CHECK (bucket_id = 'site-assets' AND public.is_admin_or_above());

CREATE POLICY "site_assets_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'site-assets' AND public.is_admin_or_above());

-- avatars
DROP POLICY IF EXISTS "avatars_public_select" ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_delete" ON storage.objects;
DROP POLICY IF EXISTS "avatars_own_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars_own_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_own_delete" ON storage.objects;
DROP POLICY IF EXISTS "avatars_super_admin_all" ON storage.objects;

CREATE POLICY "avatars_public_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_own_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_own_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_own_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_super_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'avatars' AND public.is_super_admin())
  WITH CHECK (bucket_id = 'avatars' AND public.is_super_admin());
