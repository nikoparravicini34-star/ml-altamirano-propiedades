import { useState, useEffect, useMemo } from 'react';
import { m } from 'framer-motion';
import { MessageSquare, Search } from 'lucide-react';
import { getAllInquiries, updateInquiryStatus } from '../../lib/supabase';
import type { UserInquiry } from '../../types';
import LoadingSpinner from '../ui/LoadingSpinner';

const STATUS_LABELS: Record<UserInquiry['status'], string> = {
  pendiente: 'Pendiente',
  respondida: 'Respondida',
  cerrada: 'Cerrada',
};

const STATUS_COLORS: Record<UserInquiry['status'], string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  respondida: 'bg-emerald-500/20 text-emerald-300',
  cerrada: 'bg-metallic/40 text-text-light',
};

export default function InquiriesList() {
  const [inquiries, setInquiries] = useState<UserInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const loadInquiries = async () => {
    setLoading(true);
    try {
      const data = await getAllInquiries();
      setInquiries(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar las consultas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadInquiries(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return inquiries;
    return inquiries.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.email.toLowerCase().includes(q) ||
      (i.phone?.toLowerCase().includes(q)) ||
      (i.property_title?.toLowerCase().includes(q)) ||
      i.message.toLowerCase().includes(q)
    );
  }, [inquiries, search]);

  const handleStatusChange = async (id: string, status: UserInquiry['status']) => {
    setUpdating(id);
    try {
      await updateInquiryStatus(id, status);
      setInquiries(prev => prev.map(i => i.id === id ? { ...i, status } : i));
    } catch (err) {
      console.error(err);
      alert('Error al actualizar el estado');
    } finally {
      setUpdating(null);
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('es-AR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

  if (loading) return <LoadingSpinner />;

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl text-white font-bold flex items-center gap-3">
            <MessageSquare size={28} className="text-accent" />
            Consultas
          </h1>
          <p className="text-text-light mt-1">{inquiries.length} consultas en total</p>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email o propiedad..."
            className="input-premium pl-9 w-full sm:w-80"
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="bg-graphite rounded-2xl shadow-soft border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-warm/50 border-b border-border/50">
                <th className="text-left px-5 py-4 font-semibold text-white/70 text-xs uppercase tracking-wider">Contacto</th>
                <th className="text-left px-5 py-4 font-semibold text-white/70 text-xs uppercase tracking-wider">Propiedad</th>
                <th className="text-left px-5 py-4 font-semibold text-white/70 text-xs uppercase tracking-wider">Mensaje</th>
                <th className="text-left px-5 py-4 font-semibold text-white/70 text-xs uppercase tracking-wider">Fecha</th>
                <th className="text-left px-5 py-4 font-semibold text-white/70 text-xs uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inquiry => (
                <tr key={inquiry.id} className="border-b border-border/30 hover:bg-warm/30 transition-colors align-top">
                  <td className="px-5 py-4">
                    <p className="font-medium text-white">{inquiry.name}</p>
                    <p className="text-text-light text-xs mt-0.5">{inquiry.email}</p>
                    {inquiry.phone && (
                      <p className="text-text-light text-xs">{inquiry.phone}</p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-text-light max-w-[160px]">
                    {inquiry.property_title ?? '—'}
                  </td>
                  <td className="px-5 py-4 text-text-light max-w-xs">
                    <p className="line-clamp-3">{inquiry.message}</p>
                  </td>
                  <td className="px-5 py-4 text-text-light whitespace-nowrap">
                    {formatDate(inquiry.created_at)}
                  </td>
                  <td className="px-5 py-4">
                    <select
                      value={inquiry.status}
                      onChange={e => handleStatusChange(inquiry.id, e.target.value as UserInquiry['status'])}
                      disabled={updating === inquiry.id}
                      className={`input-premium py-1.5 px-2 text-xs min-w-[120px] disabled:opacity-50 ${STATUS_COLORS[inquiry.status]}`}
                    >
                      {(Object.keys(STATUS_LABELS) as UserInquiry['status'][]).map(s => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-text-light">
                    No se encontraron consultas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </m.div>
  );
}
