import { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';
import type { PropertyFilters as Filters } from '../../types';

interface PropertyFiltersProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  cities: string[];
  propertyTypes: string[];
}

export default function PropertyFiltersPanel({ filters, onFilterChange, cities, propertyTypes }: PropertyFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<Filters>(filters);

  const handleApply = () => {
    onFilterChange(localFilters);
    setIsOpen(false);
  };

  const handleReset = () => {
    const empty: Filters = {};
    setLocalFilters(empty);
    onFilterChange(empty);
  };

  const updateFilter = (key: keyof Filters, value: unknown) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  const activeFiltersCount = Object.values(filters).filter(v => v !== undefined && v !== '' && v !== null).length;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2.5 bg-graphite border border-border rounded-lg hover:border-accent transition-colors"
        >
          <SlidersHorizontal size={18} className="text-accent" />
          <span className="text-sm font-medium">Filtros avanzados</span>
          {activeFiltersCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-accent text-white text-xs flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </button>
        {activeFiltersCount > 0 && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-sm text-text-light hover:text-accent transition-colors"
          >
            <X size={14} />
            Limpiar filtros
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="bg-graphite rounded-xl border border-border p-6 mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Operation */}
                <div>
                  <label className="block text-xs font-medium text-text-light mb-2">Operación</label>
                  <select
                    value={localFilters.operation || ''}
                    onChange={(e) => updateFilter('operation', e.target.value as 'venta' | 'alquiler' | '')}
                    className="input-premium"
                  >
                    <option value="">Todas</option>
                    <option value="venta">Venta</option>
                    <option value="alquiler">Alquiler</option>
                  </select>
                </div>

                {/* Property Type */}
                <div>
                  <label className="block text-xs font-medium text-text-light mb-2">Tipo de propiedad</label>
                  <select
                    value={localFilters.property_type || ''}
                    onChange={(e) => updateFilter('property_type', e.target.value)}
                    className="input-premium"
                  >
                    <option value="">Todos</option>
                    {propertyTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* City */}
                <div>
                  <label className="block text-xs font-medium text-text-light mb-2">Ciudad</label>
                  <select
                    value={localFilters.city || ''}
                    onChange={(e) => updateFilter('city', e.target.value)}
                    className="input-premium"
                  >
                    <option value="">Todas</option>
                    {cities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                {/* Bedrooms */}
                <div>
                  <label className="block text-xs font-medium text-text-light mb-2">Dormitorios</label>
                  <select
                    value={localFilters.bedrooms || ''}
                    onChange={(e) => updateFilter('bedrooms', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="input-premium"
                  >
                    <option value="">Cualquiera</option>
                    <option value="1">1+</option>
                    <option value="2">2+</option>
                    <option value="3">3+</option>
                    <option value="4">4+</option>
                    <option value="5">5+</option>
                  </select>
                </div>

                {/* Min Price */}
                <div>
                  <label className="block text-xs font-medium text-text-light mb-2">Precio mínimo</label>
                  <input
                    type="number"
                    value={localFilters.minPrice || ''}
                    onChange={(e) => updateFilter('minPrice', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="USD"
                    className="input-premium"
                  />
                </div>

                {/* Max Price */}
                <div>
                  <label className="block text-xs font-medium text-text-light mb-2">Precio máximo</label>
                  <input
                    type="number"
                    value={localFilters.maxPrice || ''}
                    onChange={(e) => updateFilter('maxPrice', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="USD"
                    className="input-premium"
                  />
                </div>

                {/* Bathrooms */}
                <div>
                  <label className="block text-xs font-medium text-text-light mb-2">Baños</label>
                  <select
                    value={localFilters.bathrooms || ''}
                    onChange={(e) => updateFilter('bathrooms', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="input-premium"
                  >
                    <option value="">Cualquiera</option>
                    <option value="1">1+</option>
                    <option value="2">2+</option>
                    <option value="3">3+</option>
                    <option value="4">4+</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-medium text-text-light mb-2">Estado</label>
                  <select
                    value={localFilters.status || ''}
                    onChange={(e) => updateFilter('status', e.target.value)}
                    className="input-premium"
                  >
                    <option value="">Todos</option>
                    <option value="disponible">Disponible</option>
                    <option value="reservada">Reservada</option>
                    <option value="vendida">Vendida</option>
                    <option value="alquilada">Alquilada</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm text-text-light hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleApply}
                  className="btn-primary text-sm py-2.5 flex items-center gap-2"
                >
                  <Search size={16} />
                  Aplicar filtros
                </button>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
