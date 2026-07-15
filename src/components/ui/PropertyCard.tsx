import { memo, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { m } from 'framer-motion';
import { Bed, Bath, Car, Maximize, MapPin, Heart } from 'lucide-react';
import type { Property } from '../../types';
import OptimizedImage from './OptimizedImage';
import { ease, viewportOnce } from '../../lib/motion';
import { useFavorites } from '../../context/FavoritesContext';

interface PropertyCardProps {
  property: Property;
  index?: number;
}

function PropertyCard({ property, index = 0 }: PropertyCardProps) {
  const { isFavorited, toggleFavorite } = useFavorites();
  const [favLoading, setFavLoading] = useState(false);
  const favorited = isFavorited(property.id);

  const priceLabel = useMemo(() => {
    const formatted = new Intl.NumberFormat('es-AR').format(property.price);
    if (property.operation === 'alquiler') {
      return `${property.currency} ${formatted} / mes`;
    }
    return `${property.currency} ${formatted}`;
  }, [property.price, property.currency, property.operation]);

  const delay = index < 6 ? index * 0.04 : 0;

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (favLoading) return;
    setFavLoading(true);
    try {
      await toggleFavorite(property.id);
    } finally {
      setFavLoading(false);
    }
  };

  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewportOnce}
      transition={{ duration: 0.35, delay, ease: ease.out }}
      className="h-full content-visibility-auto"
    >
      <Link
        to={`/propiedad/${property.id}`}
        className={`property-card group block h-full rounded-2xl ${
          property.featured ? 'property-card--featured' : ''
        }`}
      >
        <div className="property-card__inner bg-graphite rounded-2xl overflow-hidden border border-white/5 h-full flex flex-col">
          <div className="property-card__media relative aspect-[4/3] shrink-0 overflow-hidden">
            <div className="property-card__media-zoom">
              <OptimizedImage
                src={property.photos[0]}
                alt={property.title}
                width={640}
                quality={70}
                className="property-card__img"
              />
            </div>

            <div className="absolute top-4 left-4 flex gap-2 z-[1]">
              <span className="property-badge property-badge--operation">
                {property.operation === 'venta' ? 'Venta' : 'Alquiler'}
              </span>
              {property.featured && (
                <span className="property-badge property-badge--featured">
                  Destacada
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleFavoriteClick}
              disabled={favLoading}
              aria-label={favorited ? 'Quitar de favoritos' : 'Guardar en favoritos'}
              aria-pressed={favorited}
              className={`absolute top-4 right-4 z-[1] w-9 h-9 rounded-full border flex items-center justify-center text-white transition-colors duration-200 hover:bg-accent hover:border-accent disabled:opacity-60 ${
                favorited
                  ? 'bg-accent/90 border-accent text-ink'
                  : 'bg-primary/70 border-white/10'
              }`}
            >
              <Heart
                size={16}
                fill={favorited ? 'currentColor' : 'none'}
                className={favorited ? 'text-ink' : undefined}
              />
            </button>

            <div className="absolute bottom-0 left-0 right-0 p-5 z-[1]">
              <p className="text-accent-light font-bold text-xl tracking-wide drop-shadow-lg">
                {priceLabel}
              </p>
            </div>
          </div>

          <div className="p-5 flex-1 flex flex-col">
            <h3 className="font-serif font-semibold text-xl text-white transition-colors duration-300 group-hover:text-accent-light line-clamp-1">
              {property.title}
            </h3>
            <div className="flex items-center gap-1.5 mt-2 text-text-light text-sm">
              <MapPin size={14} className="text-accent shrink-0" />
              <span className="truncate">
                {property.neighborhood}, {property.city}
              </span>
            </div>

            <div className="flex items-center gap-4 mt-auto pt-4 border-t border-white/8">
              {property.bedrooms != null && property.bedrooms > 0 && (
                <div className="flex items-center gap-1.5 text-text-light text-sm">
                  <Bed size={16} className="text-accent" />
                  <span>{property.bedrooms}</span>
                </div>
              )}
              {property.bathrooms != null && property.bathrooms > 0 && (
                <div className="flex items-center gap-1.5 text-text-light text-sm">
                  <Bath size={16} className="text-accent" />
                  <span>{property.bathrooms}</span>
                </div>
              )}
              {property.garages != null && property.garages > 0 && (
                <div className="flex items-center gap-1.5 text-text-light text-sm">
                  <Car size={16} className="text-accent" />
                  <span>{property.garages}</span>
                </div>
              )}
              {property.covered_area != null && property.covered_area > 0 && (
                <div className="flex items-center gap-1.5 text-text-light text-sm">
                  <Maximize size={16} className="text-accent" />
                  <span>{property.covered_area} m²</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    </m.div>
  );
}

export default memo(PropertyCard);
