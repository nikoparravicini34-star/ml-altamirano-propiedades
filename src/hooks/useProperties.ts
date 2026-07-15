import { useState, useEffect, useCallback } from 'react';
import { getProperties, getPropertyById, getFeaturedProperties, getPropertyCities, getPropertyTypes } from '../lib/supabase';
import type { Property, PropertyFilters } from '../types';

export function useProperties(filters?: PropertyFilters) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getProperties(filters as Record<string, unknown>);
      setProperties(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar propiedades');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  return { properties, loading, error, refetch: fetchProperties };
}

export function useProperty(id: string | undefined) {
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    const fetchProperty = async () => {
      try {
        setLoading(true);
        const data = await getPropertyById(id);
        setProperty(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar propiedad');
      } finally {
        setLoading(false);
      }
    };
    fetchProperty();
  }, [id]);

  return { property, loading, error };
}

export function useFeaturedProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        setLoading(true);
        const data = await getFeaturedProperties();
        setProperties(data);
        setError(null);
      } catch (err) {
        console.error('[useFeaturedProperties]', err);
        const message =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: string }).message)
            : err instanceof Error
              ? err.message
              : 'Error al cargar propiedades destacadas';
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  return { properties, loading, error };
}

export function usePropertyFilters() {
  const [cities, setCities] = useState<string[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        setLoading(true);
        const [citiesData, typesData] = await Promise.all([
          getPropertyCities(),
          getPropertyTypes()
        ]);
        setCities(citiesData);
        setPropertyTypes(typesData);
      } catch (err) {
        console.error('Error loading filters:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFilters();
  }, []);

  return { cities, propertyTypes, loading };
}
