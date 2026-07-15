export interface Property {
  id: string;
  title: string;
  price: number;
  currency: string;
  operation: 'venta' | 'alquiler';
  property_type: string;
  city: string;
  neighborhood: string;
  province: string;
  country: string | null;
  address: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  garages: number | null;
  covered_area: number | null;
  total_area: number | null;
  age_years: number | null;
  amenities: string[];
  features: string[];
  short_description: string | null;
  full_description: string | null;
  photos: string[];
  /** Uploaded video files (Supabase Storage URLs). */
  videos: string[];
  /** @deprecated Legacy single video URL — use `videos` for new uploads. */
  video_url: string | null;
  latitude: number | null;
  longitude: number | null;
  status: 'disponible' | 'reservada' | 'vendida' | 'alquilada';
  featured: boolean;
  published?: boolean;
  created_at: string;
  updated_at: string;
}

export interface PropertyFilters {
  operation?: 'venta' | 'alquiler' | '';
  property_type?: string;
  city?: string;
  neighborhood?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  status?: string;
  featured?: boolean;
}

export type UserRole = 'super_admin' | 'admin' | 'editor' | 'agent' | 'user';

export interface UserProfile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_blocked: boolean;
  profile_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserFavorite {
  id: string;
  user_id: string;
  property_id: string;
  created_at: string;
}

export interface UserViewedProperty {
  id: string;
  user_id: string;
  property_id: string;
  viewed_at: string;
}

export interface UserInquiry {
  id: string;
  user_id: string | null;
  property_id: string | null;
  property_title: string | null;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: 'pendiente' | 'respondida' | 'cerrada';
  created_at: string;
}

/** Fields the AI parser may return — subset of Property writable via description. */
export type ParsedPropertyFields = Partial<
  Pick<
    Property,
    | 'title'
    | 'price'
    | 'currency'
    | 'operation'
    | 'property_type'
    | 'city'
    | 'neighborhood'
    | 'province'
    | 'country'
    | 'bedrooms'
    | 'bathrooms'
    | 'garages'
    | 'covered_area'
    | 'total_area'
    | 'age_years'
    | 'amenities'
    | 'features'
    | 'short_description'
    | 'full_description'
    | 'status'
  >
>;

export interface ParsePropertyDescriptionRequest {
  description: string;
}

export interface ParsePropertyDescriptionResponse {
  data: ParsedPropertyFields;
}
