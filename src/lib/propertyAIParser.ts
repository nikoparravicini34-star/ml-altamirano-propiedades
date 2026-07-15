import { supabase } from './supabaseClient';
import type { ParsedPropertyFields, ParsePropertyDescriptionResponse, Property } from '../types';

const PARSED_SCALAR_KEYS = [
  'title',
  'price',
  'currency',
  'operation',
  'property_type',
  'city',
  'neighborhood',
  'province',
  'country',
  'bedrooms',
  'bathrooms',
  'garages',
  'covered_area',
  'total_area',
  'age_years',
  'short_description',
  'full_description',
  'status',
] as const satisfies readonly (keyof ParsedPropertyFields)[];

function isBlankString(value: unknown): boolean {
  return value == null || (typeof value === 'string' && value.trim() === '');
}

function isEmptyNumber(value: unknown, treatZeroAsEmpty = false): boolean {
  if (value == null) return true;
  if (typeof value !== 'number' || Number.isNaN(value)) return true;
  return treatZeroAsEmpty && value === 0;
}

function mergeStringField(
  existing: string | null | undefined,
  incoming: string | null | undefined,
): string | null | undefined {
  if (isBlankString(incoming)) return existing;
  if (isBlankString(existing)) return typeof incoming === 'string' ? incoming.trim() : incoming;
  return existing;
}

function mergeNumberField(
  existing: number | null | undefined,
  incoming: number | null | undefined,
  treatZeroAsEmpty = false,
): number | null | undefined {
  if (isEmptyNumber(incoming, treatZeroAsEmpty)) return existing;
  if (isEmptyNumber(existing, treatZeroAsEmpty)) return incoming ?? existing;
  return existing;
}

function mergeUniqueArray(
  existing: string[] | undefined,
  incoming: string[] | undefined,
): string[] {
  const base = existing ?? [];
  const added = (incoming ?? [])
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => !base.some((b) => b.toLowerCase() === item.toLowerCase()));
  return [...base, ...added];
}

/**
 * Merge AI-parsed fields into existing form data without overwriting filled values
 * or removing photos, videos, or media.
 */
export function mergeParsedIntoForm(
  existing: Partial<Property>,
  parsed: ParsedPropertyFields,
): Partial<Property> {
  const merged: Partial<Property> = { ...existing };

  for (const key of PARSED_SCALAR_KEYS) {
    const incoming = parsed[key];
    if (incoming === undefined) continue;

    if (key === 'price') {
      merged.price = mergeNumberField(existing.price, incoming as number | null, true) ?? existing.price;
      continue;
    }

    if (
      key === 'bedrooms' ||
      key === 'bathrooms' ||
      key === 'garages' ||
      key === 'covered_area' ||
      key === 'total_area' ||
      key === 'age_years'
    ) {
      merged[key] = mergeNumberField(
        existing[key] as number | null | undefined,
        incoming as number | null,
      ) as never;
      continue;
    }

    merged[key] = mergeStringField(
      existing[key] as string | null | undefined,
      incoming as string | null | undefined,
    ) as never;
  }

  if (parsed.amenities !== undefined) {
    merged.amenities = mergeUniqueArray(existing.amenities, parsed.amenities);
  }
  if (parsed.features !== undefined) {
    merged.features = mergeUniqueArray(existing.features, parsed.features);
  }

  return merged;
}

async function getFunctionErrorMessage(error: unknown): Promise<string> {
  const fallback = 'No se pudo conectar con el asistente IA.';

  if (error && typeof error === 'object' && 'name' in error && error.name === 'FunctionsHttpError') {
    const context = (error as { context?: Response }).context;
    if (context) {
      try {
        const body = (await context.clone().json()) as { error?: string };
        if (typeof body?.error === 'string' && body.error.trim()) {
          return body.error;
        }
      } catch {
        // Response body is not JSON — use generic message below.
      }
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export async function parsePropertyDescription(description: string): Promise<ParsedPropertyFields> {
  const trimmed = description.trim();
  if (!trimmed) {
    throw new Error('Escribí una descripción antes de generar los datos.');
  }

  const { data, error } = await supabase.functions.invoke<
    ParsePropertyDescriptionResponse | { error?: string }
  >('parse-property-description', { body: { description: trimmed } });

  if (error) {
    throw new Error(await getFunctionErrorMessage(error));
  }

  if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
    throw new Error(data.error);
  }

  if (!data || typeof data !== 'object' || !('data' in data) || typeof data.data !== 'object') {
    throw new Error('La respuesta del asistente no tiene el formato esperado.');
  }

  return data.data;
}

/** Human-readable labels for preview rows. */
export const PARSED_FIELD_LABELS: Record<keyof ParsedPropertyFields, string> = {
  title: 'Título',
  price: 'Precio',
  currency: 'Moneda',
  operation: 'Operación',
  property_type: 'Tipo de propiedad',
  city: 'Ciudad',
  neighborhood: 'Barrio',
  province: 'Provincia',
  country: 'País',
  bedrooms: 'Dormitorios',
  bathrooms: 'Baños',
  garages: 'Cocheras',
  covered_area: 'Superficie cubierta (m²)',
  total_area: 'Superficie total (m²)',
  age_years: 'Antigüedad (años)',
  amenities: 'Servicios',
  features: 'Características',
  short_description: 'Descripción corta',
  full_description: 'Descripción completa',
  status: 'Estado',
};

export function formatParsedValue(key: keyof ParsedPropertyFields, value: unknown): string {
  if (value == null) return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (key === 'operation') return value === 'alquiler' ? 'Alquiler' : 'Venta';
  if (key === 'price' && typeof value === 'number') {
    return value.toLocaleString('es-AR');
  }
  return String(value);
}

export function getPreviewEntries(parsed: ParsedPropertyFields): { key: keyof ParsedPropertyFields; label: string; value: string }[] {
  return (Object.keys(parsed) as (keyof ParsedPropertyFields)[])
    .filter((key) => {
      const value = parsed[key];
      if (value == null) return false;
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'string') return value.trim() !== '';
      if (typeof value === 'number') return !Number.isNaN(value);
      return true;
    })
    .map((key) => ({
      key,
      label: PARSED_FIELD_LABELS[key],
      value: formatParsedValue(key, parsed[key]),
    }));
}
