export interface AddressSearchResult {
  latitude: number;
  longitude: number;
  displayName: string;
  address: string;
  city: string;
  neighborhood: string;
  province: string;
  country: string;
}

export interface ReverseGeocodeResult {
  latitude: number;
  longitude: number;
  displayName: string;
  address: string;
  city: string;
  neighborhood: string;
  province: string;
  country: string;
}

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const GOOGLE_GEOCODE_BASE = 'https://maps.googleapis.com/maps/api/geocode/json';

const NOMINATIM_HEADERS = {
  'Accept-Language': 'es',
  'User-Agent': 'PropiedadesApp/1.0 (property-form-location-picker)',
};

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

function hasGoogleMapsKey(): boolean {
  return Boolean(GOOGLE_MAPS_API_KEY?.trim());
}

function buildStreetAddress(address: Record<string, string>): string {
  const street =
    address.road ||
    address.pedestrian ||
    address.footway ||
    address.path ||
    address.cycleway ||
    '';

  if (!street) return '';

  return address.house_number ? `${street} ${address.house_number}` : street;
}

function parseNominatimAddress(address: Record<string, string>) {
  const streetAddress = buildStreetAddress(address);

  return {
    address: streetAddress,
    city:
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.county ||
      '',
    neighborhood:
      address.suburb ||
      address.neighbourhood ||
      address.quarter ||
      address.residential ||
      address.city_district ||
      address.hamlet ||
      '',
    province: (address.state || address.region || '').replace(/^Provincia de\s+/i, ''),
    country: address.country || '',
  };
}

interface GoogleAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

function googleComponent(
  components: GoogleAddressComponent[],
  ...types: string[]
): string {
  for (const type of types) {
    const match = components.find((c) => c.types.includes(type));
    if (match) return match.long_name;
  }
  return '';
}

function parseGoogleAddressComponents(components: GoogleAddressComponent[]) {
  const route = googleComponent(components, 'route');
  const streetNumber = googleComponent(components, 'street_number');
  const streetAddress = route
    ? streetNumber
      ? `${route} ${streetNumber}`
      : route
    : '';

  return {
    address: streetAddress,
    city: googleComponent(
      components,
      'locality',
      'administrative_area_level_2',
      'postal_town',
    ),
    neighborhood: googleComponent(
      components,
      'sublocality',
      'sublocality_level_1',
      'neighborhood',
      'administrative_area_level_3',
    ),
    province: googleComponent(components, 'administrative_area_level_1').replace(
      /^Provincia de\s+/i,
      '',
    ),
    country: googleComponent(components, 'country'),
  };
}

function mapGoogleResult(result: {
  formatted_address: string;
  geometry: { location: { lat: number; lng: number } };
  address_components: GoogleAddressComponent[];
}): AddressSearchResult {
  const parsed = parseGoogleAddressComponents(result.address_components);
  return {
    latitude: result.geometry.location.lat,
    longitude: result.geometry.location.lng,
    displayName: result.formatted_address,
    address: parsed.address || result.formatted_address.split(',')[0]?.trim() || '',
    city: parsed.city,
    neighborhood: parsed.neighborhood,
    province: parsed.province,
    country: parsed.country,
  };
}

async function searchAddressesWithGoogle(query: string): Promise<AddressSearchResult[]> {
  const params = new URLSearchParams({
    address: query,
    key: GOOGLE_MAPS_API_KEY!,
    language: 'es',
    region: 'ar',
    components: 'country:AR',
  });

  const response = await fetch(`${GOOGLE_GEOCODE_BASE}?${params}`);
  if (!response.ok) {
    throw new Error('Error al buscar direcciones en Google Maps');
  }

  const data = await response.json();
  if (data.status === 'ZERO_RESULTS') return [];
  if (data.status !== 'OK') {
    throw new Error(data.error_message || 'Error al buscar direcciones en Google Maps');
  }

  return (data.results as {
    formatted_address: string;
    geometry: { location: { lat: number; lng: number } };
    address_components: GoogleAddressComponent[];
  }[])
    .slice(0, 5)
    .map(mapGoogleResult);
}

async function reverseGeocodeWithGoogle(
  lat: number,
  lng: number,
): Promise<ReverseGeocodeResult> {
  const params = new URLSearchParams({
    latlng: `${lat},${lng}`,
    key: GOOGLE_MAPS_API_KEY!,
    language: 'es',
  });

  const response = await fetch(`${GOOGLE_GEOCODE_BASE}?${params}`);
  if (!response.ok) {
    throw new Error('Error al obtener la dirección desde Google Maps');
  }

  const data = await response.json();
  if (data.status !== 'OK' || !data.results?.[0]) {
    throw new Error(data.error_message || 'Error al obtener la dirección desde Google Maps');
  }

  const mapped = mapGoogleResult(data.results[0]);
  return {
    latitude: lat,
    longitude: lng,
    displayName: mapped.displayName,
    address: mapped.address,
    city: mapped.city,
    neighborhood: mapped.neighborhood,
    province: mapped.province,
    country: mapped.country,
  };
}

async function searchAddressesWithNominatim(query: string): Promise<AddressSearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    addressdetails: '1',
    limit: '5',
    countrycodes: 'ar',
  });

  const response = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
    headers: NOMINATIM_HEADERS,
  });

  if (!response.ok) {
    throw new Error('Error al buscar direcciones');
  }

  const data = await response.json();

  return data.map(
    (item: {
      lat: string;
      lon: string;
      display_name: string;
      address?: Record<string, string>;
    }) => {
      const parsed = parseNominatimAddress(item.address || {});
      return {
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        displayName: item.display_name,
        address: parsed.address || item.display_name.split(',')[0]?.trim() || '',
        city: parsed.city,
        neighborhood: parsed.neighborhood,
        province: parsed.province,
        country: parsed.country,
      };
    },
  );
}

async function reverseGeocodeWithNominatim(
  lat: number,
  lng: number,
): Promise<ReverseGeocodeResult> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'json',
    addressdetails: '1',
  });

  const response = await fetch(`${NOMINATIM_BASE}/reverse?${params}`, {
    headers: NOMINATIM_HEADERS,
  });

  if (!response.ok) {
    throw new Error('Error al obtener la dirección');
  }

  const item = await response.json();
  const parsed = parseNominatimAddress(item.address || {});

  return {
    latitude: lat,
    longitude: lng,
    displayName: item.display_name || '',
    address: parsed.address || item.display_name?.split(',')[0]?.trim() || '',
    city: parsed.city,
    neighborhood: parsed.neighborhood,
    province: parsed.province,
    country: parsed.country,
  };
}

/** Forward-geocode a single address string; returns the best match or null. */
export async function geocodeAddress(query: string): Promise<AddressSearchResult | null> {
  const results = await searchAddresses(query);
  return results[0] ?? null;
}

export async function searchAddresses(query: string): Promise<AddressSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  if (hasGoogleMapsKey()) {
    try {
      return await searchAddressesWithGoogle(trimmed);
    } catch (err) {
      console.warn('[geocoding] Google Maps search failed, falling back to Nominatim:', err);
    }
  }

  return searchAddressesWithNominatim(trimmed);
}

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<ReverseGeocodeResult> {
  if (hasGoogleMapsKey()) {
    try {
      return await reverseGeocodeWithGoogle(lat, lng);
    } catch (err) {
      console.warn('[geocoding] Google Maps reverse geocode failed, falling back to Nominatim:', err);
    }
  }

  return reverseGeocodeWithNominatim(lat, lng);
}
