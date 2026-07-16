/*
  Unified display order for property media (photos + videos).
  Index 0 = order 1, index 1 = order 2, etc.
*/

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS media_order text[] DEFAULT '{}';
