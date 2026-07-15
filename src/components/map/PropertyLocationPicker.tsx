import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { Search, MapPin, Loader2, Maximize2, X, Save, CheckCircle2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { LatLngExpression } from 'leaflet';
import L from 'leaflet';
import { fixLeafletIcons } from './fixLeafletIcons';
import {
  searchAddresses,
  reverseGeocode,
  type AddressSearchResult,
} from '../../lib/geocoding';

fixLeafletIcons();

const DEFAULT_CENTER: [number, number] = [-34.3489, -58.8006];
const DEFAULT_ZOOM = 13;
const COMPACT_WIDTH = 320;
const COMPACT_HEIGHT = 240;

export interface LocationChangePayload {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  neighborhood?: string;
  province?: string;
  country?: string;
}

interface PropertyLocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  address?: string;
  onLocationPreview: (location: LocationChangePayload) => void;
  onLocationSave: (location: LocationChangePayload) => void;
  savedLocation?: LocationChangePayload | null;
  label?: string;
  disabled?: boolean;
  /** Hide the explicit save button — location updates apply immediately via callbacks. */
  hideSaveButton?: boolean;
  /** Use full container width for the compact map (default: fixed 320px). */
  compactFullWidth?: boolean;
}

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapFlyTo({ target, zoom }: { target: [number, number]; zoom: number }) {
  const map = useMap();
  const prevTarget = useRef<string>('');

  useEffect(() => {
    const key = `${target[0]},${target[1]}`;
    if (prevTarget.current === key) return;
    prevTarget.current = key;
    map.flyTo(target, zoom, { duration: 0.8 });
  }, [target, zoom, map]);

  return null;
}

function MapResizeHandler({ expanded }: { expanded: boolean }) {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 100);
    const timer2 = setTimeout(() => map.invalidateSize(), 350);
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, [map, expanded]);

  return null;
}

function MapViewSync({
  center,
  zoom,
  onViewChange,
}: {
  center: [number, number];
  zoom: number;
  onViewChange: (center: [number, number], zoom: number) => void;
}) {
  const map = useMap();
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      map.setView(center, zoom, { animate: false });
      initialized.current = true;
    }
  }, [center, zoom, map]);

  useMapEvents({
    moveend() {
      const c = map.getCenter();
      onViewChange([c.lat, c.lng], map.getZoom());
    },
    zoomend() {
      const c = map.getCenter();
      onViewChange([c.lat, c.lng], map.getZoom());
    },
  });

  return null;
}

function DraggableMarker({
  position,
  onDragEnd,
}: {
  position: LatLngExpression;
  onDragEnd: (lat: number, lng: number) => void;
}) {
  const markerRef = useRef<L.Marker>(null);

  return (
    <Marker
      draggable
      position={position}
      ref={markerRef}
      eventHandlers={{
        dragend() {
          const marker = markerRef.current;
          if (!marker) return;
          const { lat, lng } = marker.getLatLng();
          onDragEnd(lat, lng);
        },
      }}
    />
  );
}

interface LocationMapProps {
  mapCenter: [number, number];
  mapZoom: number;
  markerPos: [number, number] | null;
  flyTarget: [number, number] | null;
  flyZoom: number;
  expanded: boolean;
  onMapClick: (lat: number, lng: number) => void;
  onMarkerDrag: (lat: number, lng: number) => void;
  onViewChange: (center: [number, number], zoom: number) => void;
}

function LocationMap({
  mapCenter,
  mapZoom,
  markerPos,
  flyTarget,
  flyZoom,
  expanded,
  onMapClick,
  onMarkerDrag,
  onViewChange,
}: LocationMapProps) {
  return (
    <MapContainer
      center={mapCenter}
      zoom={mapZoom}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapResizeHandler expanded={expanded} />
      <MapViewSync center={mapCenter} zoom={mapZoom} onViewChange={onViewChange} />
      <MapClickHandler onClick={onMapClick} />
      {flyTarget && <MapFlyTo target={flyTarget} zoom={flyZoom} />}
      {markerPos && <DraggableMarker position={markerPos} onDragEnd={onMarkerDrag} />}
    </MapContainer>
  );
}

function buildPayload(
  lat: number,
  lng: number,
  data?: Partial<AddressSearchResult>,
): LocationChangePayload {
  return {
    latitude: lat,
    longitude: lng,
    ...(data?.address && { address: data.address }),
    ...(data?.city && { city: data.city }),
    ...(data?.neighborhood && { neighborhood: data.neighborhood }),
    ...(data?.province && { province: data.province }),
    ...(data?.country && { country: data.country }),
  };
}

function locationsMatch(a: LocationChangePayload | null, b: LocationChangePayload | null): boolean {
  if (!a || !b) return false;
  return (
    Math.abs(a.latitude - b.latitude) < 0.000001 &&
    Math.abs(a.longitude - b.longitude) < 0.000001
  );
}

export default function PropertyLocationPicker({
  latitude,
  longitude,
  address: savedAddress,
  onLocationPreview,
  onLocationSave,
  savedLocation = null,
  label = 'Buscar dirección',
  disabled = false,
  hideSaveButton = false,
  compactFullWidth = false,
}: PropertyLocationPickerProps) {
  const [markerPos, setMarkerPos] = useState<[number, number] | null>(
    latitude != null && longitude != null ? [latitude, longitude] : null,
  );
  const [searchQuery, setSearchQuery] = useState(savedAddress ?? '');
  const [searchResults, setSearchResults] = useState<AddressSearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [draftLocation, setDraftLocation] = useState<LocationChangePayload | null>(
    latitude != null && longitude != null
      ? buildPayload(latitude, longitude, { address: savedAddress })
      : null,
  );
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [flyZoom, setFlyZoom] = useState(DEFAULT_ZOOM);
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewCenter, setViewCenter] = useState<[number, number]>(
    latitude != null && longitude != null ? [latitude, longitude] : DEFAULT_CENTER,
  );
  const [viewZoom, setViewZoom] = useState(
    latitude != null && longitude != null ? 15 : DEFAULT_ZOOM,
  );
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const isSaved = locationsMatch(draftLocation, savedLocation);

  useEffect(() => {
    if (latitude != null && longitude != null) {
      setMarkerPos([latitude, longitude]);
      setViewCenter([latitude, longitude]);
      setViewZoom(15);
      setDraftLocation((prev) =>
        buildPayload(latitude, longitude, {
          address: savedAddress ?? prev?.address,
          city: prev?.city,
          neighborhood: prev?.neighborhood,
          province: prev?.province,
          country: prev?.country,
        }),
      );
    }
  }, [latitude, longitude, savedAddress]);

  useEffect(() => {
    if (savedAddress) {
      setSearchQuery(savedAddress);
    }
  }, [savedAddress]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isExpanded) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsExpanded(false);
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isExpanded]);

  const handleViewChange = useCallback((center: [number, number], zoom: number) => {
    setViewCenter(center);
    setViewZoom(zoom);
  }, []);

  const applyLocation = useCallback(
    async (lat: number, lng: number, addressData?: Partial<AddressSearchResult>) => {
      setMarkerPos([lat, lng]);
      setFlyTarget([lat, lng]);
      setFlyZoom(16);
      setViewCenter([lat, lng]);
      setViewZoom(16);

      if (addressData) {
        const payload = buildPayload(lat, lng, addressData);
        setDraftLocation(payload);
        if (addressData.address) {
          setSearchQuery(addressData.address);
        } else if (addressData.displayName) {
          setSearchQuery(addressData.displayName.split(',')[0]);
        }
        onLocationPreview(payload);
        if (hideSaveButton) {
          onLocationSave(payload);
        }
        return;
      }

      setGeocoding(true);
      try {
        const result = await reverseGeocode(lat, lng);
        const payload = buildPayload(lat, lng, result);
        setDraftLocation(payload);
        if (result.address) {
          setSearchQuery(result.address);
        } else if (result.displayName) {
          setSearchQuery(result.displayName.split(',')[0]);
        }
        onLocationPreview(payload);
        if (hideSaveButton) {
          onLocationSave(payload);
        }
      } catch {
        const payload = buildPayload(lat, lng);
        setDraftLocation(payload);
        onLocationPreview(payload);
        if (hideSaveButton) {
          onLocationSave(payload);
        }
      } finally {
        setGeocoding(false);
      }
    },
    [hideSaveButton, onLocationPreview, onLocationSave],
  );

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (disabled) return;
      applyLocation(lat, lng);
    },
    [applyLocation, disabled],
  );

  const handleMarkerDrag = useCallback(
    (lat: number, lng: number) => {
      if (disabled) return;
      applyLocation(lat, lng);
    },
    [applyLocation, disabled],
  );

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    setSearchOpen(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 3) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchAddresses(value);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const handleSelectResult = (result: AddressSearchResult) => {
    setSearchQuery(result.address || result.displayName.split(',')[0]);
    setSearchOpen(false);
    setSearchResults([]);
    applyLocation(result.latitude, result.longitude, result);
  };

  const handleSaveLocation = () => {
    if (!draftLocation || disabled) return;
    onLocationSave(draftLocation);
  };

  const saveButton = (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <button
        type="button"
        onClick={handleSaveLocation}
        disabled={disabled || !draftLocation || geocoding}
        className="btn-primary flex items-center justify-center gap-2 text-sm py-2.5 px-5 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSaved ? <CheckCircle2 size={16} /> : <Save size={16} />}
        {isSaved ? 'Ubicación guardada' : 'Guardar ubicación'}
      </button>
      {draftLocation && !isSaved && (
        <p className="text-xs text-amber-300/90">
          Hay cambios sin guardar. Guardá la ubicación para aplicarlos.
        </p>
      )}
      {isSaved && savedLocation && (
        <p className="text-xs text-emerald-400/90 flex items-center gap-1.5">
          <CheckCircle2 size={14} />
          Ubicación confirmada y guardada
        </p>
      )}
    </div>
  );

  const searchSection = (
    <div ref={searchRef} className="relative">
      <label className="block text-sm font-medium text-white mb-2">{label}</label>
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light pointer-events-none"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchInput(e.target.value)}
          onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
          disabled={disabled}
          className="w-full bg-primary border border-border rounded-lg pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent disabled:opacity-60 disabled:cursor-not-allowed"
          placeholder="Ej: Av. del Libertador 1234, Escobar"
          autoComplete="off"
        />
        {searching && (
          <Loader2
            size={18}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light animate-spin"
          />
        )}
      </div>

      {searchOpen && searchResults.length > 0 && (
        <div className="absolute z-[2000] w-full mt-1 bg-graphite border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {searchResults.map((result, index) => (
            <button
              key={`${result.latitude}-${result.longitude}-${index}`}
              type="button"
              onClick={() => handleSelectResult(result)}
              className="w-full flex items-start gap-3 px-4 py-3 text-left text-sm hover:bg-primary/60 transition-colors border-b border-border last:border-b-0"
            >
              <MapPin size={16} className="text-accent mt-0.5 shrink-0" />
              <span className="text-white line-clamp-2">{result.displayName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const mapControls = (expanded: boolean) => (
    <>
      {geocoding && (
        <div
          className={`absolute z-[1000] flex items-center gap-2 bg-graphite/90 border border-border rounded-lg px-3 py-1.5 text-xs text-text-light ${
            expanded ? 'top-3 left-3' : 'top-2 left-2'
          }`}
        >
          <Loader2 size={14} className="animate-spin" />
          Obteniendo dirección...
        </div>
      )}

      {expanded ? (
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="absolute top-3 right-3 z-[1000] flex items-center justify-center w-9 h-9 rounded-lg bg-graphite/95 border border-border text-white hover:bg-primary/80 hover:border-accent/40 transition-colors shadow-lg"
          aria-label="Cerrar mapa ampliado"
          title="Cerrar"
        >
          <X size={18} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          disabled={disabled}
          className="absolute top-2 right-2 z-[1000] flex items-center justify-center w-8 h-8 rounded-lg bg-graphite/95 border border-border text-white hover:bg-primary/80 hover:border-accent/40 transition-colors shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label="Ampliar mapa"
          title="Ampliar mapa"
        >
          <Maximize2 size={16} />
        </button>
      )}

      {!markerPos && (
        <div
          className={`absolute z-[1000] pointer-events-none ${
            expanded ? 'bottom-4 left-4 right-4' : 'bottom-2 left-2 right-2'
          }`}
        >
          <p className="text-xs text-white bg-graphite/90 border border-border rounded-lg px-3 py-2 text-center">
            Hacé clic en el mapa o buscá una dirección para marcar la ubicación
          </p>
        </div>
      )}
    </>
  );

  const mapSection = (expanded: boolean) => (
    <div
      className={`relative rounded-lg overflow-hidden bg-metallic/40 border border-border ${
        expanded ? 'flex-1 min-h-0 w-full' : 'w-full max-w-full'
      }`}
      style={
        expanded
          ? undefined
          : compactFullWidth
            ? { width: '100%', height: COMPACT_HEIGHT }
            : { width: COMPACT_WIDTH, height: COMPACT_HEIGHT, maxWidth: '100%' }
      }
    >
      <LocationMap
        key={expanded ? 'expanded' : 'compact'}
        mapCenter={viewCenter}
        mapZoom={viewZoom}
        markerPos={markerPos}
        flyTarget={flyTarget}
        flyZoom={flyZoom}
        expanded={expanded}
        onMapClick={handleMapClick}
        onMarkerDrag={handleMarkerDrag}
        onViewChange={handleViewChange}
      />
      {mapControls(expanded)}
    </div>
  );

  const expandedModal = createPortal(
    <AnimatePresence>
      {isExpanded && (
        <div
          key="map-overlay"
          className="fixed inset-0 z-[9990] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md"
        >
          <motion.div
            key="map-panel"
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-6xl h-[min(92vh,900px)] flex flex-col bg-graphite border border-border rounded-2xl shadow-2xl overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Mapa ampliado"
          >
            <div className="h-1 bg-gold-gradient shrink-0" />
            <div className="flex flex-col flex-1 min-h-0 p-4 sm:p-5 gap-4">
              {searchSection}
              {mapSection(true)}
              {!hideSaveButton && saveButton}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );

  return (
    <>
      <div className="space-y-4">
        {!isExpanded ? (
          <>
            {searchSection}
            {mapSection(false)}
            {!hideSaveButton && saveButton}
          </>
        ) : (
          <div
            className="flex items-center gap-3 rounded-lg border border-border bg-metallic/30 px-4 py-3 text-sm text-text-light"
            style={compactFullWidth ? { width: '100%' } : { width: COMPACT_WIDTH, maxWidth: '100%' }}
          >
            <MapPin size={16} className="text-accent shrink-0" />
            <span className="flex-1 min-w-0 truncate">
              {markerPos
                ? 'Ubicación seleccionada — mapa ampliado'
                : 'Mapa ampliado abierto'}
            </span>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="shrink-0 text-xs text-accent hover:text-white transition-colors font-medium"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
      {expandedModal}
    </>
  );
}
