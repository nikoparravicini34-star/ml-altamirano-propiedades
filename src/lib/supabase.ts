import type { Property, UserProfile, UserFavorite, UserViewedProperty, UserInquiry } from '../types';
import { DEFAULT_SITE_SETTINGS, type SiteSettings } from '../data/siteSettingsDefaults';
import {
  fileExtension,
  isSupabaseStorageUrl,
  parseStorageUrl,
  validateAvatarFile,
  validateImageFile,
  validateSiteAssetFile,
  validateVideoFile,
} from './storage';
import { mapWithConcurrency, uploadToStorage, type UploadProgressCallback } from './mediaUpload';

export { supabase } from './supabaseClient';
export type { UploadProgressCallback } from './mediaUpload';

import { supabase } from './supabaseClient';
import { parseCoordinate } from './location';

/**
 * Normalize property rows for the UI.
 * `published` may be absent until the DB migration is applied — treat missing as published.
 */
function normalizeProperty(row: Property): Property {
  const legacyVideo = row.video_url?.trim() || null;
  const storedVideos = row.videos ?? [];
  const videos =
    storedVideos.length > 0
      ? storedVideos
      : legacyVideo && isSupabaseStorageUrl(legacyVideo)
        ? [legacyVideo]
        : [];

  return {
    ...row,
    featured: row.featured === true,
    published: row.published !== false,
    country: row.country ?? 'Argentina',
    amenities: row.amenities ?? [],
    features: row.features ?? [],
    age_years: row.age_years ?? null,
    latitude: parseCoordinate(row.latitude),
    longitude: parseCoordinate(row.longitude),
    videos,
  };
}

function isPublished(row: { published?: boolean | null }) {
  // Missing column / null → visible on the public site
  return row.published !== false;
}

/** Core columns — never strip on PGRST204 retry (featured must persist for Home). */
const CORE_PROPERTY_COLUMNS = new Set([
  'title',
  'price',
  'currency',
  'operation',
  'property_type',
  'city',
  'neighborhood',
  'province',
  'status',
  'featured',
  'updated_at',
]);

/**
 * Build a write payload and strip columns the live schema doesn't have yet.
 * Retries on PostgREST PGRST204 ("column not in schema cache").
 */
export async function saveProperty(
  input: Partial<Property>,
  id?: string
): Promise<void> {
  const payload: Record<string, unknown> = {
    ...input,
    updated_at: new Date().toISOString(),
  };
  if ('featured' in input) {
    payload.featured = input.featured === true;
  }
  delete payload.id;
  delete payload.created_at;

  for (let attempt = 0; attempt < 10; attempt++) {
    const result = id
      ? await supabase.from('properties').update(payload).eq('id', id)
      : await supabase.from('properties').insert(payload);

    if (!result.error) return;

    if (result.error.code === 'PGRST204') {
      const match = result.error.message.match(/'([^']+)' column/);
      const column = match?.[1];
      if (column && column in payload && !CORE_PROPERTY_COLUMNS.has(column)) {
        console.warn(`[saveProperty] Column "${column}" missing in DB — omitting and retrying`);
        delete payload[column];
        continue;
      }
    }

    console.error('[saveProperty]', result.error);
    throw result.error;
  }

  throw new Error('No se pudo guardar la propiedad: columnas incompatibles con la base de datos');
}

export async function getProperties(filters?: Record<string, unknown>, options?: { includeUnpublished?: boolean }) {
  let query = supabase.from('properties').select('*');

  if (filters) {
    if (filters.operation) {
      query = query.eq('operation', filters.operation);
    }
    if (filters.property_type) {
      query = query.eq('property_type', filters.property_type);
    }
    if (filters.city) {
      query = query.eq('city', filters.city);
    }
    if (filters.neighborhood) {
      query = query.ilike('neighborhood', `%${filters.neighborhood}%`);
    }
    if (filters.minPrice) {
      query = query.gte('price', filters.minPrice);
    }
    if (filters.maxPrice) {
      query = query.lte('price', filters.maxPrice);
    }
    if (filters.bedrooms) {
      query = query.gte('bedrooms', filters.bedrooms);
    }
    if (filters.bathrooms) {
      query = query.gte('bathrooms', filters.bathrooms);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.featured === true) {
      query = query.eq('featured', true);
    }
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) {
    console.error('[getProperties]', error);
    throw error;
  }

  let rows = (data || []).map(normalizeProperty);
  // Filter drafts client-side so we don't break when `published` is missing in DB
  if (!options?.includeUnpublished) {
    rows = rows.filter(isPublished);
  }
  return rows;
}

export async function getPropertyById(id: string) {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('[getPropertyById]', error);
    throw error;
  }
  return data ? normalizeProperty(data as Property) : null;
}

export async function getFeaturedProperties() {
  // Same visibility as /propiedades: latest published listings (no featured flag required).
  const rows = await getProperties();
  return rows.slice(0, 4);
}

export async function getPropertyCities() {
  const { data, error } = await supabase
    .from('properties')
    .select('city')
    .eq('status', 'disponible');
  if (error) throw error;
  const cities = [...new Set((data || []).map((d: { city: string }) => d.city))];
  return cities as string[];
}

export async function getPropertyTypes() {
  const { data, error } = await supabase
    .from('properties')
    .select('property_type')
    .eq('status', 'disponible');
  if (error) throw error;
  const types = [...new Set((data || []).map((d: { property_type: string }) => d.property_type))];
  return types as string[];
}

// ── User profile ─────────────────────────────────────────────────────────────

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as UserProfile | null;
}

function toProfileError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const e = error as { message?: string; details?: string; hint?: string; code?: string };
    const parts = [e.message, e.details, e.hint].filter(Boolean);
    return new Error(parts.join(' — ') || 'Error de base de datos');
  }
  return new Error('Error desconocido al guardar el perfil');
}

/** Only writable profile fields — never send role/is_blocked from the client form. */
export type ProfileWritableFields = Pick<
  UserProfile,
  | 'email'
  | 'first_name'
  | 'last_name'
  | 'full_name'
  | 'phone'
  | 'avatar_url'
  | 'profile_completed'
>;

export async function upsertUserProfile(profile: Partial<UserProfile> & { id: string }) {
  const { id, ...rest } = profile;
  // Strip fields that must not be changed by normal users via the client
  const {
    role: _role,
    is_blocked: _blocked,
    created_at: _created,
    updated_at: _updated,
    ...safe
  } = rest as Partial<UserProfile>;

  const { data, error } = await supabase
    .from('user_profiles')
    .upsert(
      { id, ...safe, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    )
    .select()
    .maybeSingle();
  if (error) throw toProfileError(error);
  return data as UserProfile | null;
}

/** Partial update — only changes the fields provided (safe for returning logins). */
export async function updateUserProfile(userId: string, updates: Partial<UserProfile>) {
  const {
    id: _id,
    role: _role,
    is_blocked: _blocked,
    created_at: _created,
    updated_at: _updated,
    ...safe
  } = updates as Partial<UserProfile> & { id?: string };

  const { data, error } = await supabase
    .from('user_profiles')
    .update({ ...safe, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .maybeSingle();
  if (error) throw toProfileError(error);
  return data as UserProfile | null;
}

/**
 * Completes a first-time profile: prefers UPDATE (row already created on login),
 * falls back to UPSERT if the row is missing.
 * Retries with a minimal column set if optional columns are missing in the DB.
 */
export async function completeUserProfile(
  userId: string,
  fields: ProfileWritableFields
): Promise<UserProfile> {
  const fullPayload = {
    email: fields.email,
    first_name: fields.first_name,
    last_name: fields.last_name,
    full_name: fields.full_name,
    phone: fields.phone,
    avatar_url: fields.avatar_url,
    profile_completed: true as const,
    updated_at: new Date().toISOString(),
  };

  const minimalPayload = {
    first_name: fields.first_name,
    last_name: fields.last_name,
    full_name: fields.full_name,
    phone: fields.phone,
    avatar_url: fields.avatar_url,
    profile_completed: true as const,
    updated_at: new Date().toISOString(),
  };

  async function tryUpdate(payload: Record<string, unknown>) {
    return supabase
      .from('user_profiles')
      .update(payload)
      .eq('id', userId)
      .select()
      .maybeSingle();
  }

  async function tryUpsert(payload: Record<string, unknown>) {
    return supabase
      .from('user_profiles')
      .upsert({ id: userId, ...payload }, { onConflict: 'id' })
      .select()
      .maybeSingle();
  }

  // 1) Update with full payload
  let result = await tryUpdate(fullPayload);
  if (result.error) {
    console.warn('Profile update (full) failed, trying minimal fields:', result.error);
    result = await tryUpdate(minimalPayload);
  }

  if (!result.error && result.data) {
    return result.data as UserProfile;
  }

  // 2) Row missing or update blocked — upsert
  if (!result.error && !result.data) {
    result = await tryUpsert(fullPayload);
    if (result.error) {
      console.warn('Profile upsert (full) failed, trying minimal fields:', result.error);
      result = await tryUpsert(minimalPayload);
    }
  } else if (result.error) {
    result = await tryUpsert(fullPayload);
    if (result.error) {
      console.warn('Profile upsert (full) failed, trying minimal fields:', result.error);
      result = await tryUpsert(minimalPayload);
    }
  }

  if (result.error) throw toProfileError(result.error);
  if (!result.data) throw new Error('No se pudo guardar el perfil en la base de datos');
  return result.data as UserProfile;
}

// ── Favorites ────────────────────────────────────────────────────────────────

export async function getUserFavorites(userId: string) {
  const { data, error } = await supabase
    .from('user_favorites')
    .select('*, properties(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as (UserFavorite & { properties: Property })[];
}

export async function addFavorite(userId: string, propertyId: string) {
  const { error } = await supabase
    .from('user_favorites')
    .insert({ user_id: userId, property_id: propertyId });
  if (error) throw error;
}

export async function removeFavorite(userId: string, propertyId: string) {
  const { error } = await supabase
    .from('user_favorites')
    .delete()
    .eq('user_id', userId)
    .eq('property_id', propertyId);
  if (error) throw error;
}

// ── Viewed ───────────────────────────────────────────────────────────────────

export async function getUserViewed(userId: string) {
  const { data, error } = await supabase
    .from('user_viewed_properties')
    .select('*, properties(*)')
    .eq('user_id', userId)
    .order('viewed_at', { ascending: false })
    .limit(6);
  if (error) throw error;
  return (data || []) as (UserViewedProperty & { properties: Property })[];
}

export async function recordViewedProperty(userId: string, propertyId: string) {
  const { error } = await supabase
    .from('user_viewed_properties')
    .upsert(
      { user_id: userId, property_id: propertyId, viewed_at: new Date().toISOString() },
      { onConflict: 'user_id,property_id' }
    );
  if (error) throw error;
}

// ── Avatar storage ───────────────────────────────────────────────────────────

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const validationError = validateAvatarFile(file);
  if (validationError) throw new Error(validationError);

  const path = uniqueStoragePath(userId, file.name, 'jpg');
  return uploadToStorage('avatars', path, file);
}

// ── Inquiries ────────────────────────────────────────────────────────────────

export async function getUserInquiries(userId: string) {
  const { data, error } = await supabase
    .from('user_inquiries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as UserInquiry[];
}

export async function createInquiry(inquiry: {
  user_id?: string | null;
  property_id?: string | null;
  property_title?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  message: string;
}) {
  const { data, error } = await supabase
    .from('user_inquiries')
    .insert(inquiry)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data as UserInquiry | null;
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as UserProfile[];
}

export async function updateUserRole(userId: string, role: UserProfile['role']) {
  const { data, error } = await supabase
    .from('user_profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data as UserProfile | null;
}

export async function getAllInquiries() {
  const { data, error } = await supabase
    .from('user_inquiries')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as UserInquiry[];
}

export async function updateInquiryStatus(id: string, status: UserInquiry['status']) {
  const { error } = await supabase
    .from('user_inquiries')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
}

export async function isFavorite(userId: string, propertyId: string) {
  const { data, error } = await supabase
    .from('user_favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('property_id', propertyId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function getUserFavoritePropertyIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_favorites')
    .select('property_id')
    .eq('user_id', userId);
  if (error) throw error;
  return (data || []).map((row) => row.property_id as string);
}

// ── Site settings (CMS) ──────────────────────────────────────────────────────

export async function getSiteSettings(): Promise<SiteSettings> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('data')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  if (!data?.data) return DEFAULT_SITE_SETTINGS;
  return { ...DEFAULT_SITE_SETTINGS, ...(data.data as Partial<SiteSettings>) };
}

export async function updateSiteSettings(settings: SiteSettings): Promise<SiteSettings> {
  const { data, error } = await supabase
    .from('site_settings')
    .upsert({ id: 1, data: settings, updated_at: new Date().toISOString() })
    .select('data')
    .maybeSingle();
  if (error) throw error;
  return { ...DEFAULT_SITE_SETTINGS, ...(data?.data as Partial<SiteSettings>) };
}

// ── User management ────────────────────────────────────────────────────────────

export async function toggleUserBlocked(userId: string, blocked: boolean) {
  const { data, error } = await supabase
    .from('user_profiles')
    .update({ is_blocked: blocked, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data as UserProfile | null;
}

export async function deleteUserProfile(userId: string) {
  const { error } = await supabase.from('user_profiles').delete().eq('id', userId);
  if (error) throw error;
}

export async function updatePropertyMedia(
  propertyId: string,
  media: { photos?: string[]; videos?: string[] },
): Promise<void> {
  await saveProperty(
    {
      ...(media.photos !== undefined ? { photos: media.photos } : {}),
      ...(media.videos !== undefined ? { videos: media.videos } : {}),
    },
    propertyId,
  );
}

// ── File uploads ─────────────────────────────────────────────────────────────

function uniqueStoragePath(prefix: string, fileName: string, fallbackExt: string): string {
  const ext = fileExtension(fileName, fallbackExt);
  return `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
}

export async function uploadPropertyImage(
  file: File,
  propertyId?: string,
  onProgress?: UploadProgressCallback,
): Promise<string> {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);

  const prefix = propertyId ?? 'draft';
  const path = uniqueStoragePath(prefix, file.name, 'jpg');
  return uploadToStorage('property-images', path, file, onProgress);
}

export async function uploadPropertyImages(
  files: File[],
  propertyId?: string,
  onProgress?: (index: number, percent: number) => void,
): Promise<string[]> {
  return mapWithConcurrency(files, 3, (file, index) =>
    uploadPropertyImage(file, propertyId, (percent) => onProgress?.(index, percent)),
  );
}

export async function uploadPropertyVideo(
  file: File,
  propertyId?: string,
  onProgress?: UploadProgressCallback,
): Promise<string> {
  const validationError = validateVideoFile(file);
  if (validationError) throw new Error(validationError);

  const prefix = propertyId ?? 'draft';
  const path = uniqueStoragePath(prefix, file.name, 'mp4');
  return uploadToStorage('property-videos', path, file, onProgress);
}

export async function uploadPropertyVideos(
  files: File[],
  propertyId?: string,
  onProgress?: (index: number, percent: number) => void,
): Promise<string[]> {
  // Upload videos one at a time to limit memory usage with large 4K files
  const urls: string[] = [];
  for (let i = 0; i < files.length; i++) {
    urls.push(
      await uploadPropertyVideo(files[i], propertyId, (percent) => onProgress?.(i, percent)),
    );
  }
  return urls;
}

export async function deleteStorageFile(url: string): Promise<void> {
  const ref = parseStorageUrl(url);
  if (!ref) return;
  const { error } = await supabase.storage.from(ref.bucket).remove([ref.path]);
  if (error) console.warn('[deleteStorageFile]', ref.bucket, ref.path, error.message);
}

export async function deletePropertyMedia(urls: string[]): Promise<void> {
  await Promise.all(urls.map(deleteStorageFile));
}

export async function deleteProperty(propertyId: string, media?: { photos?: string[]; videos?: string[] }) {
  if (media) {
    const urls = [...(media.photos ?? []), ...(media.videos ?? [])];
    await deletePropertyMedia(urls);
  }
  const { error } = await supabase.from('properties').delete().eq('id', propertyId);
  if (error) throw error;
}

export async function uploadSiteAsset(
  file: File,
  folder: string,
  previousUrl?: string | null,
): Promise<string> {
  const validationError = validateSiteAssetFile(file);
  if (validationError) throw new Error(validationError);

  const path = uniqueStoragePath(folder, file.name, 'jpg');
  const url = await uploadToStorage('site-assets', path, file);
  if (previousUrl && isSupabaseStorageUrl(previousUrl)) {
    await deleteStorageFile(previousUrl);
  }
  return url;
}
