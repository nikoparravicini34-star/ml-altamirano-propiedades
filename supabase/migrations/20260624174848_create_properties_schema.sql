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
