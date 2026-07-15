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
