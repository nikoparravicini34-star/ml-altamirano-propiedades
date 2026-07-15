import { useState, useEffect, useCallback } from 'react';
import { getProperties } from '../lib/supabase';
import type { Property } from '../types';

/** Admin hook — loads ALL properties including unpublished drafts */
export function useAdminProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getProperties(undefined, { includeUnpublished: true });
      setProperties(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar propiedades');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  return { properties, loading, error, refetch: fetchProperties };
}
