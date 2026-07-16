import { useState } from 'react';
import { Link } from 'react-router-dom';
import { m } from 'framer-motion';
import { Plus, Pencil, Trash2, Star, Eye, EyeOff } from 'lucide-react';
import { useAdminProperties } from '../../hooks/useAdminProperties';
import { supabase, deleteProperty } from '../../lib/supabase';
import LoadingSpinner from '../ui/LoadingSpinner';
import { getCoverPhotoUrl } from '../../lib/mediaOrder';
import type { Property } from '../../types';

interface PropertiesListProps {
  canDelete?: boolean;
}

export default function PropertiesList({ canDelete = false }: PropertiesListProps) {
  const { properties, loading, error, refetch } = useAdminProperties();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filter, setFilter] = useState<'all' | 'venta' | 'alquiler' | 'draft'>('all');

  const filtered = properties.filter(p => {
    if (filter === 'draft') return !p.published;
    if (filter === 'venta') return p.operation === 'venta';
    if (filter === 'alquiler') return p.operation === 'alquiler';
    return true;
  });

  const handleDelete = async (id: string) => {
    if (deleteConfirm !== id) { setDeleteConfirm(id); return; }
    setDeleting(true);
    try {
      const property = properties.find(p => p.id === id);
      await deleteProperty(id, {
        photos: property?.photos,
        videos: property?.videos,
      });
      setDeleteConfirm(null);
      refetch();
    } catch (err) {
      console.error(err);
      alert('Error al eliminar la propiedad');
    } finally {
      setDeleting(false);
    }
  };

  const toggleField = async (property: Property, field: 'featured' | 'published') => {
    try {
      const nextValue =
        field === 'featured'
          ? property.featured !== true
          : property.published === false;
      const { error: updErr } = await supabase
        .from('properties')
        .update({ [field]: nextValue, updated_at: new Date().toISOString() })
        .eq('id', property.id);
      if (updErr) {
        if (updErr.code === 'PGRST204' && field === 'published') {
          alert('La columna "publicada" aún no está en la base de datos. Ejecutá la migración pendiente en Supabase.');
          return;
        }
        throw updErr;
      }
      refetch();
    } catch (err) {
      console.error(err);
      alert('No se pudo actualizar la propiedad');
    }
  };

  const formatPrice = (price: number, currency: string, operation: string) => {
    const formatted = new Intl.NumberFormat('es-AR').format(price);
    return operation === 'alquiler' ? `${currency} ${formatted}/mes` : `${currency} ${formatted}`;
  };

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      disponible: 'bg-emerald-500/20 text-emerald-300',
      reservada: 'bg-amber-500/20 text-amber-300',
      vendida: 'bg-sky-500/20 text-sky-300',
      alquilada: 'bg-violet-500/20 text-violet-300',
    };
    return map[status] ?? 'bg-metallic/40 text-white/80';
  };

  return (
    <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-3xl text-white font-bold">Propiedades</h1>
          <p className="text-text-light mt-1">{properties.length} propiedades en total</p>
        </div>
        <Link to="/admin/propiedades/nueva" className="btn-primary flex items-center gap-2 self-start">
          <Plus size={18} />
          <span className="hidden sm:inline">Agregar propiedad</span>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {(['all', 'venta', 'alquiler', 'draft'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f ? 'bg-accent text-white' : 'bg-graphite text-text-light border border-border hover:border-accent'
            }`}
          >
            {f === 'all' ? 'Todas' : f === 'draft' ? 'Borradores' : f === 'venta' ? 'Venta' : 'Alquiler'}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : error ? (
        <div className="text-center text-red-500 py-8">{error}</div>
      ) : (
        <div className="card-premium overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-warm/50 border-b border-border/50">
                  <th className="text-left px-5 py-4 font-semibold text-white/70 text-xs uppercase">Imagen</th>
                  <th className="text-left px-5 py-4 font-semibold text-white/70 text-xs uppercase">Título</th>
                  <th className="text-left px-5 py-4 font-semibold text-white/70 text-xs uppercase hidden lg:table-cell">Operación</th>
                  <th className="text-left px-5 py-4 font-semibold text-white/70 text-xs uppercase">Precio</th>
                  <th className="text-left px-5 py-4 font-semibold text-white/70 text-xs uppercase hidden md:table-cell">Estado</th>
                  <th className="text-center px-5 py-4 font-semibold text-white/70 text-xs uppercase">Pub.</th>
                  <th className="text-center px-5 py-4 font-semibold text-white/70 text-xs uppercase">Dest.</th>
                  <th className="text-right px-5 py-4 font-semibold text-white/70 text-xs uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(property => (
                  <tr key={property.id} className="border-b border-border/30 hover:bg-warm/20 transition-colors">
                    <td className="px-5 py-4">
                      <img src={getCoverPhotoUrl(property)} alt="" className="w-14 h-10 rounded-lg object-cover" />
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-medium text-white">{property.title}</span>
                      <span className="block text-xs text-text-light">{property.neighborhood}, {property.city}</span>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell capitalize">{property.operation}</td>
                    <td className="px-5 py-4">{formatPrice(property.price, property.currency, property.operation)}</td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${statusColor(property.status)}`}>{property.status}</span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button onClick={() => toggleField(property, 'published')} className={`p-1.5 rounded-lg transition-colors ${property.published ? 'text-green-600' : 'text-text-light'}`}>
                        {property.published ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button onClick={() => toggleField(property, 'featured')} className={`p-1.5 rounded-lg ${property.featured ? 'text-accent' : 'text-text-light'}`}>
                        <Star size={16} fill={property.featured ? 'currentColor' : 'none'} />
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/propiedad/${property.id}`} target="_blank" className="p-1.5 rounded-lg text-text-light hover:text-white"><Eye size={16} /></Link>
                        <Link to={`/admin/propiedades/editar/${property.id}`} className="p-1.5 rounded-lg text-text-light hover:text-accent"><Pencil size={16} /></Link>
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(property.id)}
                            disabled={deleting}
                            className={`p-1.5 rounded-lg ${deleteConfirm === property.id ? 'text-red-600 bg-red-500/10' : 'text-text-light hover:text-red-600'}`}
                            title={deleteConfirm === property.id ? 'Clic de nuevo para confirmar' : 'Eliminar'}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && <p className="text-center py-12 text-text-light">No hay propiedades</p>}
        </div>
      )}
    </m.div>
  );
}
