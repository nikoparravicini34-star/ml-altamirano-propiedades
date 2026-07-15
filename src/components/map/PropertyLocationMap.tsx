import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { Maximize2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { fixLeafletIcons } from './fixLeafletIcons';

fixLeafletIcons();

interface PropertyLocationMapProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  height?: number;
}

const COMPACT_HEIGHT = 200;

function MapResizeOnMount() {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 100);
    const timer2 = setTimeout(() => map.invalidateSize(), 400);
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, [map]);

  return null;
}

function PropertyMapView({
  latitude,
  longitude,
  zoom,
  scrollWheelZoom,
}: {
  latitude: number;
  longitude: number;
  zoom: number;
  scrollWheelZoom: boolean;
}) {
  const position: [number, number] = [latitude, longitude];

  return (
    <MapContainer
      center={position}
      zoom={zoom}
      className="h-full w-full"
      scrollWheelZoom={scrollWheelZoom}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapResizeOnMount />
      <Marker position={position} />
    </MapContainer>
  );
}

export default function PropertyLocationMap({
  latitude,
  longitude,
  zoom = 15,
  height = COMPACT_HEIGHT,
}: PropertyLocationMapProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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

  const expandButton = (expanded: boolean) =>
    expanded ? (
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
        className="absolute top-2 right-2 z-[1000] flex items-center justify-center w-8 h-8 rounded-lg bg-graphite/95 border border-border text-white hover:bg-primary/80 hover:border-accent/40 transition-colors shadow-lg"
        aria-label="Ampliar mapa"
        title="Ampliar mapa"
      >
        <Maximize2 size={16} />
      </button>
    );

  const mapSection = (expanded: boolean) => (
    <div
      className={`relative rounded-lg overflow-hidden bg-metallic/40 border border-border ${
        expanded ? 'flex-1 min-h-0 w-full' : 'w-full'
      }`}
      style={expanded ? undefined : { height }}
    >
      <PropertyMapView
        key={expanded ? 'expanded' : 'compact'}
        latitude={latitude}
        longitude={longitude}
        zoom={zoom}
        scrollWheelZoom={expanded}
      />
      {expandButton(expanded)}
    </div>
  );

  const expandedModal = createPortal(
    <AnimatePresence>
      {isExpanded && (
        <div
          key="property-map-overlay"
          className="fixed inset-0 z-[9990] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md"
        >
          <motion.div
            key="property-map-panel"
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
            <div className="flex flex-col flex-1 min-h-0 p-4 sm:p-5">
              {mapSection(true)}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );

  return (
    <>
      {mapSection(false)}
      {expandedModal}
    </>
  );
}
