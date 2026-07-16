import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { m, AnimatePresence } from 'framer-motion';
import {
  User, Heart, MessageSquare, Eye, Settings, LogOut,
  MapPin, Bed, Bath, Maximize, ChevronRight, Edit3,
  Phone, Mail, Calendar, CheckCircle, Clock, XCircle,
  ArrowRight, Building2, Camera, Check, X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProfileModal } from '../../context/ProfileModalContext';
import { useFavorites } from '../../context/FavoritesContext';
import { useFormDraft } from '../../hooks/useFormDraft';
import { buildFormDraftKey } from '../../lib/formDraftStorage';
import {
  getUserFavorites, getUserViewed, getUserInquiries,
  upsertUserProfile, uploadAvatar,
} from '../../lib/supabase';
import { validateName, validatePhone } from '../../lib/validation';
import type { Property, UserInquiry } from '../../types';
import { getCoverPhotoUrl } from '../../lib/mediaOrder';

type Section = 'overview' | 'favorites' | 'viewed' | 'inquiries' | 'settings';
interface FavoriteEntry { property: Property; favId: string }
interface ViewedEntry { property: Property; viewed_at: string }

export default function UserProfile() {
  const { user, profile, logout, refreshProfile, isLoading: authLoading, profileCompleted } = useAuth();
  const { openProfileModal } = useProfileModal();
  const { removeFromFavorites } = useFavorites();
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>('overview');
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [viewed, setViewed] = useState<ViewedEntry[]>([]);
  const [inquiries, setInquiries] = useState<UserInquiry[]>([]);
  const [loading, setLoading] = useState(true);

  // Settings / edit state
  const [editMode, setEditMode] = useState(false);
  const [editFirst, setEditFirst] = useState('');
  const [editLast, setEditLast] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const profileDraftKey = buildFormDraftKey(['user-profile-settings', user?.id ?? 'anonymous']);

  const { clearDraft: clearProfileDraft, draftRestored: profileDraftRestored } = useFormDraft(
    profileDraftKey,
    { editFirst, editLast, editPhone, editMode },
    {
      enabled: !saving,
      isEmpty: (draft) => !draft.editMode && !draft.editFirst.trim() && !draft.editLast.trim() && !draft.editPhone.trim(),
      onRestore: (draft) => {
        setEditFirst(draft.editFirst);
        setEditLast(draft.editLast);
        setEditPhone(draft.editPhone);
        setEditMode(draft.editMode);
      },
    },
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/'); return; }
    if (!profileCompleted) {
      navigate('/', { replace: true });
      openProfileModal();
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const [favs, vwd, inqs] = await Promise.all([
          getUserFavorites(user.id),
          getUserViewed(user.id),
          getUserInquiries(user.id),
        ]);
        setFavorites(favs.map(f => ({ property: f.properties, favId: f.id })));
        setViewed(vwd.map(v => ({ property: v.properties, viewed_at: v.viewed_at })));
        setInquiries(inqs);
      } catch { /* silent */ }
      setLoading(false);
    };
    load();
  }, [user, authLoading, profileCompleted, navigate, openProfileModal]);

  // Sync edit fields from profile
  useEffect(() => {
    if (profile && !profileDraftRestored) {
      setEditFirst(profile.first_name ?? profile.full_name?.split(' ')[0] ?? '');
      setEditLast(profile.last_name ?? profile.full_name?.split(' ').slice(1).join(' ') ?? '');
      setEditPhone(profile.phone ?? '');
      setAvatarPreview(profile.avatar_url ?? null);
    }
  }, [profile, profileDraftRestored]);

  const handleRemoveFavorite = async (propertyId: string) => {
    try {
      await removeFromFavorites(propertyId);
      setFavorites((prev) => prev.filter((f) => f.property.id !== propertyId));
    } catch {
      /* silent */
    }
  };

  const handleLogout = async () => { await logout(); navigate('/'); };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setSaveError('Seleccioná una imagen válida (JPG, PNG o WebP).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setSaveError('La imagen no puede superar los 2 MB.');
      return;
    }
    setSaveError(null);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaveError(null);
    const errs: Record<string, string> = {};
    const firstErr = validateName(editFirst, 'nombre');
    const lastErr = validateName(editLast, 'apellido');
    const phoneErr = validatePhone(editPhone);
    if (firstErr) errs.firstName = firstErr;
    if (lastErr) errs.lastName = lastErr;
    if (phoneErr) errs.phone = phoneErr;
    if (Object.keys(errs).length > 0) {
      setEditErrors(errs);
      return;
    }

    setSaving(true);
    try {
      let avatarUrl = profile?.avatar_url ?? null;
      if (avatarFile) avatarUrl = await uploadAvatar(user.id, avatarFile);
      await upsertUserProfile({
        id: user.id,
        email: user.email ?? profile?.email ?? null,
        first_name: editFirst.trim(),
        last_name: editLast.trim(),
        full_name: `${editFirst.trim()} ${editLast.trim()}`.trim(),
        phone: editPhone.trim(),
        avatar_url: avatarUrl,
        profile_completed: true,
      });
      await refreshProfile();
      clearProfileDraft();
      setAvatarFile(null);
      setEditMode(false);
      setEditErrors({});
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message || 'No se pudo guardar el perfil.';
      setSaveError(message);
    }
    setSaving(false);
  };

  const handleCancelEdit = () => {
    if (profile) {
      setEditFirst(profile.first_name ?? '');
      setEditLast(profile.last_name ?? '');
      setEditPhone(profile.phone ?? '');
      setAvatarPreview(profile.avatar_url ?? null);
      setAvatarFile(null);
    }
    setEditMode(false);
  };

  const displayName = profile?.full_name || `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || user?.email?.split('@')[0] || 'Usuario';
  const initials = displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  // Show a centered spinner while the auth context is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#1B1B1B] flex items-center justify-center shadow-lg">
            <span className="text-[#C9A24D] font-serif font-bold text-xl leading-none">A</span>
          </div>
          <svg className="animate-spin w-5 h-5 text-[#C9A24D]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      </div>
    );
  }

  const navItems: { id: Section; label: string; icon: typeof User }[] = [
    { id: 'overview', label: 'Mi perfil', icon: User },
    { id: 'favorites', label: 'Mis Favoritos', icon: Heart },
    { id: 'viewed', label: 'Vistas recientemente', icon: Eye },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ];

  const currentAvatar = avatarPreview ?? profile?.avatar_url ?? null;
  const editInitials = `${editFirst[0] ?? ''}${editLast[0] ?? ''}`.toUpperCase() || initials;

  return (
    <div className="min-h-screen bg-surface pt-24 pb-16">
      <div className="section-padding max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── Sidebar ── */}
          <aside className="lg:w-64 shrink-0">
            <m.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="panel-premium overflow-hidden shadow-sm border border-border"
            >
              <div className="bg-[#1B1B1B] px-6 py-8 flex flex-col items-center text-center">
                <div className="relative mb-4">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt={displayName} className="w-20 h-20 rounded-full object-cover ring-2 ring-[#C9A24D]/40" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-[#C9A24D]/15 border border-[#C9A24D]/30 flex items-center justify-center">
                      <span className="text-[#C9A24D] font-serif font-bold text-2xl">{initials}</span>
                    </div>
                  )}
                  <button
                    onClick={() => { setSection('settings'); setEditMode(true); }}
                    className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#C9A24D] rounded-full flex items-center justify-center hover:bg-[#A8873A] transition-colors border-2 border-[#1B1B1B]"
                    title="Editar foto"
                  >
                    <Camera size={11} className="text-ink" />
                  </button>
                </div>
                <p className="text-ink font-serif font-semibold text-base leading-tight">{displayName}</p>
                <p className="text-text-light text-xs mt-1 tracking-wide truncate max-w-full">{user?.email}</p>
              </div>

              <nav className="p-3">
                {navItems.map(item => {
                  const Icon = item.icon;
                  const active = section === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSection(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm transition-all duration-200 mb-0.5 ${
                        active ? 'bg-[#C9A24D]/10 text-[#C9A24D] font-semibold' : 'text-text-light hover:bg-white/5 hover:text-ink'
                      }`}
                    >
                      <Icon size={16} strokeWidth={active ? 2 : 1.5} />
                      <span className="tracking-wide">{item.label}</span>
                      {active && <ChevronRight size={14} className="ml-auto" />}
                    </button>
                  );
                })}
              </nav>

              <div className="p-3 border-t border-border">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-text-light hover:bg-red-500/10 hover:text-red-500 transition-all duration-200"
                >
                  <LogOut size={16} strokeWidth={1.5} />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            </m.div>
          </aside>

          {/* ── Main content ── */}
          <main className="flex-1 min-w-0">
            <AnimatePresence mode="wait">

              {/* OVERVIEW */}
              {section === 'overview' && (
                <m.div key="overview" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="space-y-6">
                  <div className="panel-premium p-6 border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h1 className="font-serif text-2xl text-ink font-semibold">Hola, {displayName.split(' ')[0]}</h1>
                      <p className="text-text-light text-sm mt-1">Bienvenido a tu oficina personal en Altamirano Propiedades.</p>
                    </div>
                    <div className="flex gap-3 shrink-0">
                      <button
                        onClick={() => { setSection('settings'); setEditMode(true); }}
                        className="flex items-center gap-2 px-4 py-2.5 border border-border text-text-light text-xs font-semibold tracking-wide uppercase hover:border-[#C9A24D] hover:text-[#C9A24D] rounded-lg transition-all duration-200"
                      >
                        <Edit3 size={13} /> Editar perfil
                      </button>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[#C9A24D] text-ink text-xs font-semibold tracking-wide uppercase hover:bg-[#A8873A] rounded-lg transition-all duration-200"
                      >
                        <LogOut size={13} /> Salir
                      </button>
                    </div>
                  </div>

                  <div className="panel-premium border border-border shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-[#252525]">
                      <h2 className="font-serif font-semibold text-ink text-base">Mis Favoritos</h2>
                      <button onClick={() => setSection('favorites')} className="text-[#C9A24D] text-xs font-semibold hover:text-[#A8873A] flex items-center gap-1 transition-colors">Ver todas <ArrowRight size={12} /></button>
                    </div>
                    {loading ? <LoadingRows /> : favorites.length === 0 ? <EmptyState icon={Heart} text="Todavía no guardaste propiedades" /> : (
                      <div className="divide-y divide-[#252525]">{favorites.slice(0, 3).map(({ property }) => <PropertyRow key={property.id} property={property} onRemove={() => handleRemoveFavorite(property.id)} />)}</div>
                    )}
                  </div>

                  <div className="panel-premium border border-border shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-[#252525]">
                      <h2 className="font-serif font-semibold text-ink text-base">Vistas recientemente</h2>
                      <button onClick={() => setSection('viewed')} className="text-[#C9A24D] text-xs font-semibold hover:text-[#A8873A] flex items-center gap-1 transition-colors">Ver todas <ArrowRight size={12} /></button>
                    </div>
                    {loading ? <div className="p-6 grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <div key={i} className="aspect-[4/3] bg-[#252525] rounded-xl animate-pulse" />)}</div> : viewed.length === 0 ? <EmptyState icon={Eye} text="No visitaste ninguna propiedad aún" /> : (
                      <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-4">{viewed.slice(0, 3).map(({ property }) => <PropertyThumb key={property.id} property={property} />)}</div>
                    )}
                  </div>
                </m.div>
              )}

              {/* FAVORITES */}
              {section === 'favorites' && (
                <m.div key="favorites" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="space-y-6">
                  <SectionHeader title="Mis Favoritos" subtitle={`${favorites.length} guardada${favorites.length !== 1 ? 's' : ''}`} />
                  <div className="panel-premium border border-border shadow-sm overflow-hidden">
                    {loading ? <LoadingRows /> : favorites.length === 0 ? <EmptyState icon={Heart} text="Todavía no guardaste propiedades" cta={{ label: 'Explorar propiedades', to: '/propiedades' }} /> : (
                      <div className="divide-y divide-[#252525]">{favorites.map(({ property }) => <PropertyRow key={property.id} property={property} detailed onRemove={() => handleRemoveFavorite(property.id)} />)}</div>
                    )}
                  </div>
                </m.div>
              )}

              {/* VIEWED */}
              {section === 'viewed' && (
                <m.div key="viewed" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="space-y-6">
                  <SectionHeader title="Vistas recientemente" subtitle={`${viewed.length} visitada${viewed.length !== 1 ? 's' : ''}`} />
                  <div className="panel-premium border border-border shadow-sm overflow-hidden">
                    {loading ? <LoadingRows /> : viewed.length === 0 ? <EmptyState icon={Eye} text="No visitaste ninguna propiedad aún" cta={{ label: 'Explorar propiedades', to: '/propiedades' }} /> : (
                      <div className="p-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{viewed.map(({ property }) => <PropertyThumb key={property.id} property={property} large />)}</div>
                    )}
                  </div>
                </m.div>
              )}

              {/* INQUIRIES */}
              {section === 'inquiries' && (
                <m.div key="inquiries" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="space-y-6">
                  <SectionHeader title="Mis consultas" subtitle={`${inquiries.length} enviada${inquiries.length !== 1 ? 's' : ''}`} />
                  <div className="panel-premium border border-border shadow-sm overflow-hidden">
                    {loading ? <LoadingRows /> : inquiries.length === 0 ? <EmptyState icon={MessageSquare} text="No enviaste consultas aún" cta={{ label: 'Ver propiedades', to: '/propiedades' }} /> : (
                      <div className="divide-y divide-[#252525]">{inquiries.map(inq => <InquiryRow key={inq.id} inquiry={inq} detailed />)}</div>
                    )}
                  </div>
                </m.div>
              )}

              {/* SETTINGS */}
              {section === 'settings' && (
                <m.div key="settings" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="space-y-6">
                  <SectionHeader title="Configuración" subtitle="Gestioná tu información personal" />

                  <div className="panel-premium border border-border shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-[#252525]">
                      <h2 className="font-serif font-semibold text-ink">Datos personales</h2>
                      {!editMode && (
                        <button
                          onClick={() => setEditMode(true)}
                          className="flex items-center gap-1.5 text-xs text-[#C9A24D] font-semibold hover:text-[#A8873A] transition-colors"
                        >
                          <Edit3 size={13} /> Editar
                        </button>
                      )}
                    </div>

                    <div className="p-6">
                      {editMode ? (
                        <div className="space-y-6">
                          {/* Avatar picker */}
                          <div className="flex items-center gap-5">
                            <button type="button" onClick={() => fileRef.current?.click()} className="relative group shrink-0">
                              <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-[#C9A24D]/30 ring-offset-2">
                                {currentAvatar ? (
                                  <img src={currentAvatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-[#252525] flex items-center justify-center">
                                    <span className="text-[#C9A24D] font-serif font-bold text-2xl">{editInitials}</span>
                                  </div>
                                )}
                              </div>
                              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#C9A24D] rounded-full flex items-center justify-center shadow-md group-hover:bg-[#A8873A] transition-colors">
                                <Camera size={13} className="text-ink" strokeWidth={2} />
                              </div>
                            </button>
                            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                            <div>
                              <p className="text-sm font-semibold text-ink">Foto de perfil</p>
                              <p className="text-xs text-text-light mt-0.5">JPG, PNG o WebP. Máx. 2 MB.</p>
                              <button type="button" onClick={() => fileRef.current?.click()} className="mt-2 text-xs text-[#C9A24D] font-semibold hover:text-[#A8873A] transition-colors">
                                Cambiar foto
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10.5px] font-semibold tracking-widest uppercase text-text-light mb-1.5">Nombre</label>
                              <input
                                type="text"
                                value={editFirst}
                                onChange={e => {
                                  setEditFirst(e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, ''));
                                  setEditErrors(prev => ({ ...prev, firstName: '' }));
                                }}
                                className={`w-full bg-graphite border border-border rounded-xl px-4 py-3 text-sm text-ink focus:outline-none focus:border-accent transition-colors ${
                                  editErrors.firstName ? 'border-red-300 bg-red-500/10/40' : 'border-border'
                                }`}
                              />
                              {editErrors.firstName && <p className="text-[10px] text-red-500 mt-1">{editErrors.firstName}</p>}
                            </div>
                            <div>
                              <label className="block text-[10.5px] font-semibold tracking-widest uppercase text-text-light mb-1.5">Apellido</label>
                              <input
                                type="text"
                                value={editLast}
                                onChange={e => {
                                  setEditLast(e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, ''));
                                  setEditErrors(prev => ({ ...prev, lastName: '' }));
                                }}
                                className={`w-full bg-graphite border border-border rounded-xl px-4 py-3 text-sm text-ink focus:outline-none focus:border-accent transition-colors ${
                                  editErrors.lastName ? 'border-red-300 bg-red-500/10/40' : 'border-border'
                                }`}
                              />
                              {editErrors.lastName && <p className="text-[10px] text-red-500 mt-1">{editErrors.lastName}</p>}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10.5px] font-semibold tracking-widest uppercase text-text-light mb-1.5">Teléfono</label>
                            <input
                              type="tel"
                              value={editPhone}
                              onChange={e => {
                                const val = e.target.value;
                                if (val === '' || /^\+?\d*$/.test(val)) {
                                  setEditPhone(val);
                                  setEditErrors(prev => ({ ...prev, phone: '' }));
                                }
                              }}
                              className={`w-full bg-graphite border border-border rounded-xl px-4 py-3 text-sm text-ink focus:outline-none focus:border-accent transition-colors ${
                                editErrors.phone ? 'border-red-300 bg-red-500/10/40' : 'border-border'
                              }`}
                            />
                            {editErrors.phone && <p className="text-[10px] text-red-500 mt-1">{editErrors.phone}</p>}
                          </div>

                          <div>
                            <label className="block text-[10.5px] font-semibold tracking-widest uppercase text-text-light mb-1.5">Email</label>
                            <input
                              type="email"
                              value={user?.email ?? ''}
                              disabled
                              className="w-full border border-border rounded-xl px-4 py-3 text-sm text-text-light bg-graphite-dark cursor-not-allowed"
                            />
                            <p className="text-[10.5px] text-text-light/70 mt-1">El email de Google no puede modificarse.</p>
                          </div>

                          {saveError && (
                            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
                              <p className="text-xs text-red-400">{saveError}</p>
                            </div>
                          )}

                          <div className="flex gap-3 pt-1">
                            <button
                              onClick={handleSaveProfile}
                              disabled={saving}
                              className="flex items-center gap-2 px-6 py-2.5 bg-[#C9A24D] text-ink text-xs font-semibold tracking-wide uppercase rounded-xl hover:bg-[#A8873A] transition-colors disabled:opacity-60"
                            >
                              {saving ? (
                                <>
                                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                  </svg>
                                  Guardando...
                                </>
                              ) : (
                                <><Check size={13} /> Guardar cambios</>
                              )}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="flex items-center gap-2 px-6 py-2.5 border border-border text-text-light text-xs font-semibold tracking-wide uppercase rounded-xl hover:border-[#1B1B1B]/30 transition-colors"
                            >
                              <X size={13} /> Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="divide-y divide-[#252525]">
                          {[
                            { icon: User, label: 'Nombre', value: profile?.first_name || profile?.full_name?.split(' ')[0] || '—' },
                            { icon: User, label: 'Apellido', value: profile?.last_name || profile?.full_name?.split(' ').slice(1).join(' ') || '—' },
                            { icon: Mail, label: 'Email', value: user?.email || '—' },
                            { icon: Phone, label: 'Teléfono', value: profile?.phone || '—' },
                            { icon: Calendar, label: 'Miembro desde', value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('es-AR', { year: 'numeric', month: 'long' }) : '—' },
                          ].map(({ icon: Icon, label, value }) => (
                            <div key={label} className="flex items-center justify-between py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[#252525] flex items-center justify-center">
                                  <Icon size={14} className="text-[#C9A24D]" strokeWidth={1.75} />
                                </div>
                                <span className="text-xs font-semibold tracking-wider uppercase text-text-light">{label}</span>
                              </div>
                              <span className="text-sm text-ink font-medium">{value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="panel-premium border border-border shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#252525]">
                      <h2 className="font-serif font-semibold text-ink">Sesión</h2>
                    </div>
                    <div className="p-6">
                      <p className="text-sm text-text-light mb-4">Cerrá tu sesión en este dispositivo de forma segura.</p>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-5 py-2.5 border border-red-500/30 text-red-500 text-xs font-semibold tracking-wide uppercase rounded-xl hover:bg-red-500/10 transition-colors"
                      >
                        <LogOut size={14} /> Cerrar sesión
                      </button>
                    </div>
                  </div>
                </m.div>
              )}

            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="font-serif text-xl font-semibold text-ink">{title}</h1>
      <p className="text-sm text-text-light mt-0.5">{subtitle}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, text, cta }: { icon: typeof Heart; text: string; cta?: { label: string; to: string } }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-[#252525] flex items-center justify-center mb-3">
        <Icon size={20} className="text-[#C9A24D]" strokeWidth={1.5} />
      </div>
      <p className="text-sm text-text-light">{text}</p>
      {cta && (
        <Link to={cta.to} className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#C9A24D] hover:text-[#A8873A] tracking-wide uppercase transition-colors">
          {cta.label} <ArrowRight size={12} />
        </Link>
      )}
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="p-6 space-y-3">
      {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-[#252525] rounded-xl animate-pulse" />)}
    </div>
  );
}

function PropertyRow({
  property,
  detailed,
  onRemove,
}: {
  property: Property;
  detailed?: boolean;
  onRemove?: () => void;
}) {
  const img = getCoverPhotoUrl(property);
  return (
    <div className="flex items-center gap-4 px-6 py-4 hover:bg-white/5 transition-colors group">
      <Link to={`/propiedad/${property.id}`} className="flex items-center gap-4 flex-1 min-w-0">
        <div className="w-16 h-12 rounded-xl overflow-hidden shrink-0">
          <img src={img} alt={property.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink truncate group-hover:text-[#C9A24D] transition-colors">{property.title}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin size={11} className="text-[#C9A24D] shrink-0" />
            <span className="text-xs text-text-light truncate">{property.neighborhood}, {property.city}</span>
          </div>
          {detailed && (
            <div className="flex items-center gap-3 mt-1">
              {property.bedrooms ? <span className="flex items-center gap-0.5 text-xs text-text-light"><Bed size={11} /> {property.bedrooms}</span> : null}
              {property.bathrooms ? <span className="flex items-center gap-0.5 text-xs text-text-light"><Bath size={11} /> {property.bathrooms}</span> : null}
              {property.covered_area ? <span className="flex items-center gap-0.5 text-xs text-text-light"><Maximize size={11} /> {property.covered_area}m²</span> : null}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-ink">{property.currency} {new Intl.NumberFormat('es-AR').format(property.price)}</p>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${property.operation === 'venta' ? 'bg-[#C9A24D]/12 text-[#C9A24D]' : 'bg-[#1B1B1B]/8 text-text-light'}`}>
            {property.operation === 'venta' ? 'Venta' : 'Alquiler'}
          </span>
        </div>
      </Link>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Quitar de favoritos"
          className="shrink-0 w-9 h-9 rounded-full border border-border flex items-center justify-center text-[#C9A24D] hover:bg-[#C9A24D]/10 hover:border-[#C9A24D]/40 transition-colors"
        >
          <Heart size={15} fill="#C9A24D" />
        </button>
      )}
    </div>
  );
}

function PropertyThumb({ property, large }: { property: Property; large?: boolean }) {
  const img = getCoverPhotoUrl(property);
  return (
    <Link to={`/propiedad/${property.id}`} className="group block rounded-xl overflow-hidden border border-border hover:border-[#C9A24D]/30 transition-colors shadow-sm">
      <div className="aspect-[4/3] overflow-hidden">
        <img src={img} alt={property.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      </div>
      <div className="p-3">
        <p className="text-xs font-semibold text-ink truncate group-hover:text-[#C9A24D] transition-colors">{property.title}</p>
        <p className="text-[11px] text-text-light mt-0.5 truncate">{property.city}</p>
        {large && <p className="text-xs font-bold text-[#C9A24D] mt-1">{property.currency} {new Intl.NumberFormat('es-AR').format(property.price)}</p>}
      </div>
    </Link>
  );
}

function InquiryRow({ inquiry, detailed }: { inquiry: UserInquiry; detailed?: boolean }) {
  const cfg = {
    pendiente: { icon: Clock, label: 'Pendiente', cls: 'bg-amber-500/15 text-amber-400' },
    respondida: { icon: CheckCircle, label: 'Respondida', cls: 'bg-emerald-500/15 text-emerald-400' },
    cerrada: { icon: XCircle, label: 'Cerrada', cls: 'bg-[#252525] text-text-light' },
  }[inquiry.status];
  const Icon = cfg.icon;
  return (
    <div className="flex items-start gap-4 px-6 py-4 hover:bg-white/5 transition-colors">
      <div className="w-9 h-9 rounded-xl bg-[#252525] flex items-center justify-center shrink-0 mt-0.5">
        <Building2 size={15} className="text-[#C9A24D]" strokeWidth={1.75} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink truncate">{inquiry.property_title || 'Consulta general'}</p>
        {detailed && <p className="text-xs text-text-light mt-0.5 line-clamp-1">{inquiry.message}</p>}
        <p className="text-[11px] text-text-light mt-0.5">{new Date(inquiry.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
      </div>
      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${cfg.cls}`}>
        <Icon size={10} /> {cfg.label}
      </span>
    </div>
  );
}
