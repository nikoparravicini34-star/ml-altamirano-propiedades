export function parseCoordinate(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getPropertyCoordinates(property: {
  latitude: unknown;
  longitude: unknown;
}): { latitude: number; longitude: number } | null {
  const latitude = parseCoordinate(property.latitude);
  const longitude = parseCoordinate(property.longitude);

  if (latitude == null || longitude == null) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;

  return { latitude, longitude };
}

export function buildGoogleMapsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

export function formatPropertyLocation(property: {
  address?: string | null;
  neighborhood: string;
  city: string;
  province: string;
  country?: string | null;
}): string {
  if (property.address?.trim()) {
    return property.address.trim();
  }
  const parts = [property.neighborhood, property.city, property.province].filter(Boolean);
  if (property.country && property.country !== 'Argentina') {
    parts.push(property.country);
  }
  return parts.join(', ');
}
