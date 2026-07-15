import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Users, Ban, Trash2, Shield } from 'lucide-react';
import { getAllUsers, updateUserRole, toggleUserBlocked, deleteUserProfile } from '../../lib/supabase';
import { ROLE_LABELS, ASSIGNABLE_ROLES, canChangeRoles } from '../../lib/roles';
import { useAuth } from '../../context/AuthContext';
import type { UserProfile, UserRole } from '../../types';
import LoadingSpinner from '../ui/LoadingSpinner';

export default function UsersList() {
  const { role: myRole, user: myUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      setUsers(await getAllUsers());
      setError(null);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return users;
    return users.filter(u =>
      u.first_name?.toLowerCase().includes(q) ||
      u.last_name?.toLowerCase().includes(q) ||
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  }, [users, search]);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (!canChangeRoles(myRole)) return;
    setUpdating(userId);
    try {
      await updateUserRole(userId, newRole);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error(err);
      alert('Error al actualizar el rol');
    } finally {
      setUpdating(null);
    }
  };

  const handleBlock = async (userId: string, blocked: boolean) => {
    setUpdating(userId);
    try {
      await toggleUserBlocked(userId, blocked);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_blocked: blocked } : u));
    } catch (err) {
      console.error(err);
      alert('Error al actualizar el usuario');
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!canChangeRoles(myRole)) return;
    if (userId === myUser?.id) return;
    if (deleteConfirm !== userId) { setDeleteConfirm(userId); return; }
    setUpdating(userId);
    try {
      await deleteUserProfile(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      setDeleteConfirm(null);
    } catch (err) {
      console.error(err);
      alert('Error al eliminar el usuario');
    } finally {
      setUpdating(null);
    }
  };

  const formatDate = (date: string | null) =>
    date ? new Date(date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  if (loading) return <LoadingSpinner />;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl text-white font-bold flex items-center gap-3">
            <Users size={28} className="text-accent" />
            Usuarios
          </h1>
          <p className="text-text-light mt-1">{users.length} usuarios registrados</p>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o email..." className="input-premium pl-9 w-full sm:w-72" />
        </div>
      </div>

      {error && <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-600">{error}</div>}

      <div className="card-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-warm/50 border-b border-border/50">
                <th className="text-left px-5 py-4 text-xs font-semibold uppercase text-white/70">Usuario</th>
                <th className="text-left px-5 py-4 text-xs font-semibold uppercase text-white/70">Email</th>
                <th className="text-left px-5 py-4 text-xs font-semibold uppercase text-white/70">Registro</th>
                <th className="text-left px-5 py-4 text-xs font-semibold uppercase text-white/70">Rol</th>
                <th className="text-left px-5 py-4 text-xs font-semibold uppercase text-white/70">Estado</th>
                {canChangeRoles(myRole) && <th className="text-right px-5 py-4 text-xs font-semibold uppercase text-white/70">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => (
                <tr key={user.id} className={`border-b border-border/30 hover:bg-warm/20 transition-colors ${user.is_blocked ? 'opacity-60' : ''}`}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center">
                          <span className="text-accent font-serif font-bold text-xs">{(user.first_name?.[0] ?? 'U').toUpperCase()}</span>
                        </div>
                      )}
                      <span className="font-medium text-white">{user.full_name || `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || 'Sin nombre'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-text-light">{user.email ?? '—'}</td>
                  <td className="px-5 py-4 text-text-light">{formatDate(user.created_at)}</td>
                  <td className="px-5 py-4">
                    {canChangeRoles(myRole) && user.id !== myUser?.id ? (
                      <select
                        value={user.role}
                        onChange={e => handleRoleChange(user.id, e.target.value as UserRole)}
                        disabled={updating === user.id}
                        className="input-premium py-1.5 px-2 text-xs min-w-[150px]"
                      >
                        {ASSIGNABLE_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-medium text-white">
                        <Shield size={12} className="text-accent" />
                        {ROLE_LABELS[user.role]}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {user.is_blocked ? (
                      <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full">Bloqueado</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full">Activo</span>
                    )}
                  </td>
                  {canChangeRoles(myRole) && (
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {user.id !== myUser?.id && (
                          <>
                            <button
                              onClick={() => handleBlock(user.id, !user.is_blocked)}
                              disabled={updating === user.id}
                              className="p-1.5 rounded-lg text-text-light hover:text-orange-600"
                              title={user.is_blocked ? 'Desbloquear' : 'Bloquear'}
                            >
                              <Ban size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(user.id)}
                              disabled={updating === user.id}
                              className={`p-1.5 rounded-lg ${deleteConfirm === user.id ? 'text-red-600 bg-red-500/10' : 'text-text-light hover:text-red-600'}`}
                              title={deleteConfirm === user.id ? 'Confirmar eliminación' : 'Eliminar'}
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-text-light">No se encontraron usuarios</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
