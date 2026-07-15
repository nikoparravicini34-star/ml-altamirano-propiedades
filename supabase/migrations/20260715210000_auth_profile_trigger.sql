/*
  Auth hardening: auto-create profiles on signup and sync super-admin role server-side.
  Ensures roles persist across devices without relying on client-only overrides.
*/

-- ── 1. Auto-create user_profiles when a new auth.users row is inserted ─────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigned_role text;
BEGIN
  assigned_role := CASE
    WHEN lower(NEW.email) = 'nikoparravicini34@gmail.com' THEN 'super_admin'
    ELSE 'user'
  END;

  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    first_name,
    last_name,
    avatar_url,
    role,
    is_blocked,
    profile_completed
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'given_name',
    NEW.raw_user_meta_data->>'family_name',
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    assigned_role,
    false,
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.user_profiles.email),
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ── 2. Server-side super-admin sync (callable by authenticated users) ──────────

CREATE OR REPLACE FUNCTION public.sync_super_admin_role()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.user_profiles
  SET
    role = 'super_admin',
    updated_at = now()
  WHERE id = auth.uid()
    AND lower(email) = 'nikoparravicini34@gmail.com'
    AND role IS DISTINCT FROM 'super_admin';
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_super_admin_role() TO authenticated;

-- ── 3. Ensure existing super-admin account has correct role ────────────────────

UPDATE public.user_profiles up
SET role = 'super_admin', updated_at = now()
FROM auth.users u
WHERE up.id = u.id
  AND lower(u.email) = 'nikoparravicini34@gmail.com'
  AND up.role IS DISTINCT FROM 'super_admin';

-- Backfill profiles for auth users missing a row (e.g. created before trigger)
INSERT INTO public.user_profiles (
  id,
  email,
  full_name,
  first_name,
  last_name,
  avatar_url,
  role,
  is_blocked,
  profile_completed
)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
  u.raw_user_meta_data->>'given_name',
  u.raw_user_meta_data->>'family_name',
  COALESCE(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture'),
  CASE
    WHEN lower(u.email) = 'nikoparravicini34@gmail.com' THEN 'super_admin'
    ELSE 'user'
  END,
  false,
  false
FROM auth.users u
LEFT JOIN public.user_profiles up ON up.id = u.id
WHERE up.id IS NULL
ON CONFLICT (id) DO NOTHING;
