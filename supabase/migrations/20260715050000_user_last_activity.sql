/*
  Rename last_access_at → last_activity and index for admin active-user queries.
*/

ALTER TABLE public.user_profiles
  RENAME COLUMN last_access_at TO last_activity;

UPDATE public.user_profiles
SET last_activity = COALESCE(last_activity, created_at, now())
WHERE last_activity IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_last_activity
  ON public.user_profiles (last_activity DESC);
