import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { m } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import PropertyCard from '../../components/ui/PropertyCard';
import PropertyFiltersPanel from '../../components/ui/PropertyFilters';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useProperties, usePropertyFilters } from '../../hooks/useProperties';
import type { PropertyFilters } from '../../types';

export default function Properties() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const [filters, setFilters] = useState<PropertyFilters>({
    operation: (searchParams.get('operacion') as 'venta' | 'alquiler') || undefined,
    property_type: searchParams.get('tipo') || undefined,
    city: searchParams.get('ciudad') || undefined,
    minPrice: searchParams.get('precioMin') ? parseInt(searchParams.get('precioMin')!) : undefined,
    maxPrice: searchParams.get('precioMax') ? parseInt(searchParams.get('precioMax')!) : undefined,
    bedrooms: searchParams.get('dormitorios') ? parseInt(searchParams.get('dormitorios')!) : undefined,
  });

  const { properties, loading, error } = useProperties(filters);
  const { cities, propertyTypes } = usePropertyFilters();

  useEffect(() => {
    const newParams = new URLSearchParams();
    if (filters.operation) newParams.set('operacion', filters.operation);
    if (filters.property_type) newParams.set('tipo', filters.property_type);
    if (filters.city) newParams.set('ciudad', filters.city);
    if (filters.minPrice) newParams.set('precioMin', filters.minPrice.toString());
    if (filters.maxPrice) newParams.set('precioMax', filters.maxPrice.toString());
    if (filters.bedrooms) newParams.set('dormitorios', filters.bedrooms.toString());
    setSearchParams(newParams);
    setCurrentPage(1);
  }, [filters]);

  const totalPages = Math.ceil(properties.length / itemsPerPage);
  const paginatedProperties = properties.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getPageTitle = () => {
    if (filters.operation === 'venta') return 'Propiedades en Venta';
    if (filters.operation === 'alquiler') return 'Propiedades en Alquiler';
    return 'Todas las Propiedades';
  };

  return (
    <div className="pt-24 pb-20 bg-surface min-h-screen">
      <div className="section-padding">
        {/* Header */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 text-sm text-text-light mb-3">
            <span>Inicio</span>
            <span>/</span>
            <span className="text-accent">Propiedades</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-white font-bold">
            {getPageTitle()}
          </h1>
          <p className="text-text-light mt-2">
            {properties.length} propiedades encontradas
          </p>
        </m.div>

        {/* Filters */}
        <PropertyFiltersPanel
          filters={filters}
          onFilterChange={setFilters}
          cities={cities}
          propertyTypes={propertyTypes}
        />

        {/* Properties Grid */}
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="text-center text-red-500 py-12">{error}</div>
        ) : properties.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-light text-lg">No se encontraron propiedades con los filtros seleccionados.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-6 [perspective:1200px] grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {paginatedProperties.map((property, index) => (
                <PropertyCard key={property.id} property={property} index={index} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-12">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  <ChevronLeft size={20} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`pagination-page ${
                      currentPage === page ? 'pagination-page--active' : 'pagination-page--inactive'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
