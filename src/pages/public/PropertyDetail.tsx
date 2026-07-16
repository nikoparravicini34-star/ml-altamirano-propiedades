import { useParams, Link } from 'react-router-dom';
import { m } from 'framer-motion';
import { Bed, Bath, Car, Maximize, MapPin, ChevronLeft, ChevronRight, Phone, MessageCircle, Heart, ExternalLink, Video } from 'lucide-react';
import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useProperty } from '../../hooks/useProperties';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { useFavorites } from '../../context/FavoritesContext';
import { recordViewedProperty } from '../../lib/supabase';
import { optimizeImageUrl } from '../../lib/images';
import { buildGoogleMapsUrl, formatPropertyLocation, getPropertyCoordinates } from '../../lib/location';
import { getPropertyMediaItems } from '../../lib/mediaOrder';

const PropertyAIChat = lazy(() => import('../../components/property/PropertyAIChat'));
const PropertyLocationMap = lazy(() => import('../../components/map/PropertyLocationMap'));

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const { settings } = useSiteSettings();
  const { property, loading, error } = useProperty(id);
  const { user, profileCompleted } = useAuth();
  const { isFavorited, toggleFavorite } = useFavorites();
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [favLoading, setFavLoading] = useState(false);
  const favorited = id ? isFavorited(id) : false;

  const mediaItems = useMemo(
    () => (property ? getPropertyMediaItems(property) : []),
    [property],
  );

  const currentMedia = mediaItems[currentMediaIndex];

  useEffect(() => {
    setCurrentMediaIndex(0);
  }, [property?.id]);

  useEffect(() => {
    if (currentMediaIndex >= mediaItems.length && mediaItems.length > 0) {
      setCurrentMediaIndex(0);
    }
  }, [currentMediaIndex, mediaItems.length]);

  useEffect(() => {
    if (!user || !id) return;
    if (profileCompleted) {
      recordViewedProperty(user.id, id).catch(console.error);
    }
  }, [user, id, profileCompleted]);

  const mainPhoto = useMemo(
    () =>
      currentMedia?.type === 'photo'
        ? optimizeImageUrl(currentMedia.url, { width: 1400, quality: 75 })
        : undefined,
    [currentMedia],
  );

  const handleFavorite = async () => {
    if (!id) return;
    setFavLoading(true);
    try {
      await toggleFavorite(id);
    } finally {
      setFavLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-center text-red-500 py-20">{error}</div>;
  if (!property) return <div className="text-center py-20">Propiedad no encontrada</div>;

  const formatPrice = (price: number, currency: string, operation: string) => {
    const formatted = new Intl.NumberFormat('es-AR').format(price);
    if (operation === 'alquiler') {
      return `${currency} ${formatted} / mes`;
    }
    return `${currency} ${formatted}`;
  };

  const nextMedia = () => {
    setCurrentMediaIndex((prev) => (prev + 1) % mediaItems.length);
  };

  const prevMedia = () => {
    setCurrentMediaIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length);
  };

  const whatsappMessage = encodeURIComponent(`Hola, me interesa la propiedad: ${property.title}`);
  const coordinates = getPropertyCoordinates(property);
  const locationLabel = formatPropertyLocation(property);

  return (
    <div className="pt-20 pb-20 bg-surface min-h-screen">
      <div className="section-padding">
        {/* Breadcrumb */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-text-light mb-6"
        >
          <Link to="/" className="hover:text-accent transition-colors">Inicio</Link>
          <span>/</span>
          <Link to="/propiedades" className="hover:text-accent transition-colors">Propiedades</Link>
          <span>/</span>
          <span className="text-accent truncate max-w-[200px]">{property.title}</span>
        </m.div>

        {/* Media Gallery */}
        <m.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative aspect-[16/9] lg:aspect-[21/9] rounded-2xl overflow-hidden mb-8 border border-border shadow-lg "
        >
          {currentMedia?.type === 'video' ? (
            <video
              key={currentMedia.url}
              src={currentMedia.url}
              controls
              className="absolute inset-0 w-full h-full object-cover bg-black"
              preload="metadata"
              playsInline
            >
              Tu navegador no soporta la reproducción de video.
            </video>
          ) : (
            <img
              key={currentMediaIndex}
              src={mainPhoto}
              alt={property.title}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
              fetchPriority="high"
              decoding="async"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-primary/50 via-transparent to-transparent pointer-events-none" />
          {mediaItems.length > 1 && (
            <>
              <button
                type="button"
                onClick={prevMedia}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-primary/70 backdrop-blur-md border border-border flex items-center justify-center hover:border-accent/50 hover:scale-105 active:scale-95 transition-all"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                type="button"
                onClick={nextMedia}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-primary/70 backdrop-blur-md border border-border flex items-center justify-center hover:border-accent/50 hover:scale-105 active:scale-95 transition-all"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}
          <div className="absolute top-4 left-4 flex gap-2">
            <span className="property-badge property-badge--operation property-badge--lg">
              {property.operation === 'venta' ? 'Venta' : 'Alquiler'}
            </span>
            <span className={`px-4 py-2 rounded-full text-sm font-semibold uppercase ${
              property.status === 'disponible' ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'
            }`}>
              {property.status}
            </span>
            {property.featured && (
              <span className="property-badge property-badge--featured property-badge--lg">
                Destacada
              </span>
            )}
          </div>
          {mediaItems.length > 0 && (
            <div className="absolute bottom-4 right-4 bg-primary/70 backdrop-blur-md border border-border px-4 py-2 rounded-full text-sm font-medium">
              {currentMediaIndex + 1} / {mediaItems.length}
            </div>
          )}
        </m.div>

        {/* Thumbnails */}
        {mediaItems.length > 1 && (
          <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
            {mediaItems.map((item, index) => (
              <button
                key={item.url}
                type="button"
                onClick={() => setCurrentMediaIndex(index)}
                className={`w-24 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all relative ${
                  index === currentMediaIndex ? 'border-accent' : 'border-transparent'
                }`}
              >
                {item.type === 'photo' ? (
                  <img
                    src={optimizeImageUrl(item.url, { width: 160, quality: 60 })}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="w-full h-full bg-black flex items-center justify-center">
                    <Video size={20} className="text-accent" />
                  </div>
                )}
                <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-primary/80 text-[10px] font-bold text-accent flex items-center justify-center">
                  {index + 1}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Title & Price */}
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <h1 className="font-serif text-3xl sm:text-4xl text-white font-bold mb-3">
                {property.title}
              </h1>
              <div className="flex items-center gap-2 text-text-light mb-4">
                <MapPin size={18} className="text-accent" />
                <span>{property.neighborhood}, {property.city}, {property.province}</span>
              </div>
              <p className="text-3xl font-bold text-accent">
                {formatPrice(property.price, property.currency, property.operation)}
              </p>
              <button
                type="button"
                onClick={handleFavorite}
                disabled={favLoading}
                className={`mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-300 hover:border-accent hover:shadow-gold disabled:opacity-60 ${
                  favorited
                    ? 'border-accent/50 bg-accent/10 text-accent'
                    : 'border-border bg-graphite text-ink hover:bg-graphite-light'
                }`}
              >
                <Heart size={16} fill={favorited ? '#C9A24D' : 'none'} />
                {favorited ? 'En favoritos' : 'Guardar en favoritos'}
              </button>
            </m.div>

            {/* Features */}
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="card-premium p-6"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                {property.bedrooms !== null && property.bedrooms > 0 && (
                  <div className="text-center">
                    <Bed size={24} className="text-accent mx-auto mb-2" />
                    <span className="block text-2xl font-bold text-white">{property.bedrooms}</span>
                    <span className="text-sm text-text-light">Dormitorios</span>
                  </div>
                )}
                {property.bathrooms !== null && property.bathrooms > 0 && (
                  <div className="text-center">
                    <Bath size={24} className="text-accent mx-auto mb-2" />
                    <span className="block text-2xl font-bold text-white">{property.bathrooms}</span>
                    <span className="text-sm text-text-light">Baños</span>
                  </div>
                )}
                {property.garages !== null && property.garages > 0 && (
                  <div className="text-center">
                    <Car size={24} className="text-accent mx-auto mb-2" />
                    <span className="block text-2xl font-bold text-white">{property.garages}</span>
                    <span className="text-sm text-text-light">Cocheras</span>
                  </div>
                )}
                {property.covered_area !== null && property.covered_area > 0 && (
                  <div className="text-center">
                    <Maximize size={24} className="text-accent mx-auto mb-2" />
                    <span className="block text-2xl font-bold text-white">{property.covered_area}</span>
                    <span className="text-sm text-text-light">m² cubiertos</span>
                  </div>
                )}
              </div>
            </m.div>

            {/* Description */}
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="card-premium p-6"
            >
              <h2 className="font-serif text-xl font-bold text-white mb-4">Descripción</h2>
              <p className="text-text-light leading-relaxed whitespace-pre-line">
                {property.full_description || property.short_description || 'Sin descripción disponible.'}
              </p>
            </m.div>

            {/* AI Assistant — property-specific context */}
            <Suspense fallback={null}>
              <PropertyAIChat property={property} />
            </Suspense>

            {/* Characteristics */}
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="card-premium p-6"
            >
              <h2 className="font-serif text-xl font-bold text-white mb-4">Características</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-text-light">Tipo de propiedad</span>
                  <span className="font-medium">{property.property_type}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-text-light">Operación</span>
                  <span className="font-medium capitalize">{property.operation}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-text-light">Ciudad</span>
                  <span className="font-medium">{property.city}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-text-light">Barrio</span>
                  <span className="font-medium">{property.neighborhood}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-text-light">Provincia</span>
                  <span className="font-medium">{property.province}</span>
                </div>
                {property.total_area !== null && property.total_area > 0 && (
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-text-light">Superficie total</span>
                    <span className="font-medium">{property.total_area} m²</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-text-light">Estado</span>
                  <span className="font-medium capitalize">{property.status}</span>
                </div>
              </div>
            </m.div>

            {/* Location */}
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="card-premium p-6"
            >
              <h2 className="font-serif text-xl font-bold text-white mb-4">Ubicación</h2>
              <div className="flex items-center gap-2 text-text-light mb-4">
                <MapPin size={18} className="text-accent shrink-0" />
                <span>{locationLabel}</span>
              </div>
              {coordinates ? (
                <>
                  <Suspense
                    fallback={
                      <div className="flex h-[200px] items-center justify-center rounded-lg border border-border bg-metallic/40 text-sm text-text-light">
                        Cargando mapa...
                      </div>
                    }
                  >
                    <PropertyLocationMap
                      latitude={coordinates.latitude}
                      longitude={coordinates.longitude}
                    />
                  </Suspense>
                  <a
                    href={buildGoogleMapsUrl(coordinates.latitude, coordinates.longitude)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary inline-flex items-center gap-2 mt-4 py-2.5 px-4 text-sm"
                  >
                    <ExternalLink size={16} />
                    Abrir mapa
                  </a>
                </>
              ) : (
                <p className="text-sm text-text-light">
                  Mapa no disponible para esta propiedad.
                </p>
              )}
            </m.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Card */}
            <m.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="card-premium p-6 sticky top-28"
            >
              <h3 className="font-serif text-lg font-bold text-white mb-4">
                ¿Te interesa esta propiedad?
              </h3>
              <div className="space-y-3">
                <a
                  href={`https://wa.me/${settings.whatsapp}?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white py-3 rounded-xl font-medium hover:bg-[#128C7E] transition-colors shadow-soft"
                >
                  <MessageCircle size={20} />
                  Consultar por WhatsApp
                </a>
                <a
                  href={`tel:${settings.phone}`}
                  className="btn-secondary w-full py-3"
                >
                  <Phone size={20} />
                  Llamar ahora
                </a>
              </div>
              <div className="mt-6 pt-6 border-t border-border">
                <h4 className="font-medium text-ink mb-3">Información de contacto</h4>
                <div className="space-y-2 text-sm">
                  <p className="text-text-light">{settings.phone}</p>
                  <p className="text-text-light">{settings.email}</p>
                  <p className="text-text-light">{settings.address}</p>
                </div>
              </div>
            </m.div>
          </div>
        </div>
      </div>
    </div>
  );
}
