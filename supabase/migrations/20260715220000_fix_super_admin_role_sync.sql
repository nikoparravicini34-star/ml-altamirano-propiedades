/*
  Fix super-admin role sync to use auth.users.email (source of truth),
  not user_profiles.email which may be NULL or stale on other devices.
*/

CREATE OR REPLACE FUNCTION public.sync_super_admin_role()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  auth_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  SELECT lower(u.email)
  INTO auth_email
  FROM auth.users u
  WHERE u.id = auth.uid();

  IF auth_email IS NULL OR auth_email <> 'nikoparravicini34@gmail.com' THEN
    RETURN;
  END IF;

  UPDATE public.user_profiles up
  SET
    role = 'super_admin',
    email = COALESCE(up.email, (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())),
    updated_at = now()
  WHERE up.id = auth.uid()
    AND up.role IS DISTINCT FROM 'super_admin';

  -- Profile row missing (e.g. legacy account) — create with super_admin
  IF NOT FOUND THEN
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
      'super_admin',
      false,
      false
    FROM auth.users u
    WHERE u.id = auth.uid()
    ON CONFLICT (id) DO UPDATE SET
      role = 'super_admin',
      email = COALESCE(public.user_profiles.email, EXCLUDED.email),
      updated_at = now()
    WHERE public.user_profiles.role IS DISTINCT FROM 'super_admin';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_super_admin_role() TO authenticated;

-- Ensure super-admin account has correct role regardless of profile email state
UPDATE public.user_profiles up
SET
  role = 'super_admin',
  email = COALESCE(up.email, u.email),
  updated_at = now()
FROM auth.users u
WHERE up.id = u.id
  AND lower(u.email) = 'nikoparravicini34@gmail.com'
  AND up.role IS DISTINCT FROM 'super_admin';
