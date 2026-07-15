-- Street address for property location (geocoded from map picker)
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS address text;
