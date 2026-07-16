import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { m } from 'framer-motion';
import { Save, X, Upload, Trash2, Video } from 'lucide-react';
import {
  saveProperty,
  uploadPropertyImages,
  uploadPropertyVideos,
  deleteStorageFile,
  updatePropertyMedia,
} from '../../lib/supabase';
import { useProperty } from '../../hooks/useProperties';
import { useFormDraft } from '../../hooks/useFormDraft';
import { buildFormDraftKey } from '../../lib/formDraftStorage';
import { PROPERTY_TYPES, CURRENCIES, OPERATIONS, STATUS_OPTIONS } from '../../data/constants';
import LoadingSpinner from '../ui/LoadingSpinner';
import PropertyAIAssistant from './PropertyAIAssistant';
import PropertyLocationPicker, {
  type LocationChangePayload,
} from '../map/PropertyLocationPicker';
import SortableMediaList from './SortableMediaList';
import {
  buildMediaItems,
  splitMediaItems,
  syncMediaOrder,
  annotateDisplayOrder,
  type MediaItem,
} from '../../lib/mediaOrder';
import type { Property } from '../../types';

const emptyProperty: Partial<Property> = {
  title: '',
  price: 0,
  currency: 'USD',
  operation: 'venta',
  property_type: 'Casa',
  city: '',
  neighborhood: '',
  province: 'Buenos Aires',
  country: 'Argentina',
  address: null,
  bedrooms: null,
  bathrooms: null,
  garages: null,
  covered_area: null,
  total_area: null,
  age_years: null,
  amenities: [],
  features: [],
  short_description: '',
  full_description: '',
  photos: [],
  videos: [],
  media_order: [],
  video_url: null,
  latitude: null,
  longitude: null,
  status: 'disponible',
  featured: false,
  published: true,
};

type PropertyFormDraft = {
  formData: Partial<Property>;
  activeTab: 'general' | 'characteristics' | 'media' | 'location';
  newAmenity: string;
  newFeature: string;
  savedLocation: LocationChangePayload | null;
};

function isPropertyFormEmpty(draft: PropertyFormDraft): boolean {
  const { formData } = draft;
  return (
    !formData.title?.trim()
    && !formData.short_description?.trim()
    && !formData.full_description?.trim()
    && !formData.city?.trim()
    && !formData.neighborhood?.trim()
    && (formData.photos?.length ?? 0) === 0
    && (formData.videos?.length ?? 0) === 0
  );
}

export default function PropertyForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isEditing = !!id;
  const { property: existingProperty, loading: loadingProperty } = useProperty(id);
  const prefilled = (location.state as { prefilled?: Partial<Property> } | null)?.prefilled;

  const [formData, setFormData] = useState<Partial<Property>>(emptyProperty);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'characteristics' | 'media' | 'location'>('general');
  const [newAmenity, setNewAmenity] = useState('');
  const [newFeature, setNewFeature] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<
    { name: string; percent: number; type: 'photo' | 'video' }[]
  >([]);
  const [savedLocation, setSavedLocation] = useState<LocationChangePayload | null>(null);

  const draftKey = buildFormDraftKey(['property-form', isEditing ? id ?? 'edit' : 'new']);

  const { clearDraft, draftRestored } = useFormDraft<PropertyFormDraft>(
    draftKey,
    { formData, activeTab, newAmenity, newFeature, savedLocation },
    {
      enabled: !saving,
      isEmpty: isPropertyFormEmpty,
      onRestore: (draft) => {
        setFormData(draft.formData);
        setActiveTab(draft.activeTab);
        setNewAmenity(draft.newAmenity);
        setNewFeature(draft.newFeature);
        setSavedLocation(draft.savedLocation);
      },
    },
  );

  useEffect(() => {
    if (existingProperty && !draftRestored) {
      setFormData(existingProperty);
      if (existingProperty.latitude != null && existingProperty.longitude != null) {
        setSavedLocation({
          latitude: existingProperty.latitude,
          longitude: existingProperty.longitude,
          address: existingProperty.address ?? undefined,
          city: existingProperty.city,
          neighborhood: existingProperty.neighborhood,
          province: existingProperty.province,
          country: existingProperty.country ?? undefined,
        });
      }
    }
  }, [existingProperty, draftRestored]);

  useEffect(() => {
    if (!isEditing && prefilled && !draftRestored) {
      setFormData({ ...emptyProperty, ...prefilled });
      if (prefilled.latitude != null && prefilled.longitude != null) {
        setSavedLocation({
          latitude: prefilled.latitude,
          longitude: prefilled.longitude,
          address: prefilled.address ?? undefined,
          city: prefilled.city,
          neighborhood: prefilled.neighborhood,
          province: prefilled.province,
          country: prefilled.country ?? undefined,
        });
      }
    }
  }, [isEditing, prefilled, draftRestored]);

  const syncLocationToForm = useCallback((location: LocationChangePayload) => {
    setFormData((prev) => ({
      ...prev,
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address ?? prev.address ?? null,
      ...(location.city ? { city: location.city } : {}),
      ...(location.neighborhood ? { neighborhood: location.neighborhood } : {}),
      ...(location.province ? { province: location.province } : {}),
      ...(location.country ? { country: location.country } : {}),
    }));
    setSavedLocation(location);
  }, []);

  const handleChange = (field: keyof Property, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const applyMediaUpdate = async (
    nextPhotos: string[],
    nextVideos: string[],
    nextMediaOrder: string[],
  ) => {
    setFormData((prev) => ({
      ...prev,
      photos: nextPhotos,
      videos: nextVideos,
      media_order: nextMediaOrder,
    }));

    if (isEditing && id) {
      try {
        await updatePropertyMedia(id, {
          photos: nextPhotos,
          videos: nextVideos,
          media_order: nextMediaOrder,
        });
      } catch (err) {
        console.warn('No se pudo actualizar el orden de medios:', err);
      }
    }
  };

  const allMediaItems = annotateDisplayOrder(
    buildMediaItems(formData.photos || [], formData.videos || [], formData.media_order),
  );

  const photoItems = allMediaItems.filter((item) => item.type === 'photo');
  const videoItems = allMediaItems.filter((item) => item.type === 'video');
  const hasMedia = allMediaItems.length > 0;

  const handleMediaReorder = (items: MediaItem[]) => {
    const { photos, videos, mediaOrder } = splitMediaItems(items);
    void applyMediaUpdate(photos, videos, mediaOrder);
  };

  const removeMedia = async (index: number) => {
    const item = allMediaItems[index];
    if (!item) return;

    try {
      await deleteStorageFile(item.url);
    } catch (err) {
      console.warn('No se pudo eliminar el archivo del almacenamiento:', err);
    }

    const nextItems = allMediaItems.filter((media) => media.url !== item.url);
    const { photos, videos, mediaOrder } = splitMediaItems(nextItems);
    await applyMediaUpdate(photos, videos, mediaOrder);
  };

  const handleNumberChange = (field: keyof Property, value: string) => {
    const num = value === '' ? null : parseFloat(value);
    handleChange(field, num);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const fileList = Array.from(files);
    setUploadingPhoto(true);
    setUploadProgress(fileList.map((f) => ({ name: f.name, percent: 0, type: 'photo' as const })));
    try {
      const urls = await uploadPropertyImages(fileList, id, (index, percent) => {
        setUploadProgress((prev) =>
          prev.map((item, i) => (i === index ? { ...item, percent } : item)),
        );
      });
      const nextPhotos = [...(formData.photos || []), ...urls];
      const nextOrder = syncMediaOrder(nextPhotos, formData.videos || [], formData.media_order);
      await applyMediaUpdate(nextPhotos, formData.videos || [], nextOrder);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Error al subir las imágenes');
    } finally {
      setUploadingPhoto(false);
      setUploadProgress([]);
      e.target.value = '';
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const fileList = Array.from(files);
    setUploadingVideo(true);
    setUploadProgress(fileList.map((f) => ({ name: f.name, percent: 0, type: 'video' as const })));
    try {
      const newUrls = await uploadPropertyVideos(fileList, id, (index, percent) => {
        setUploadProgress((prev) =>
          prev.map((item, i) => (i === index ? { ...item, percent } : item)),
        );
      });
      const nextVideos = [...(formData.videos || []), ...newUrls];
      const nextOrder = syncMediaOrder(formData.photos || [], nextVideos, formData.media_order);
      await applyMediaUpdate(formData.photos || [], nextVideos, nextOrder);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Error al subir el video');
    } finally {
      setUploadingVideo(false);
      setUploadProgress([]);
      e.target.value = '';
    }
  };

  const addToArray = (field: 'amenities' | 'features', value: string, setter: (v: string) => void) => {
    if (!value.trim()) return;
    setFormData(prev => ({ ...prev, [field]: [...(prev[field] || []), value.trim()] }));
    setter('');
  };

  const removeFromArray = (field: 'amenities' | 'features', index: number) => {
    setFormData(prev => ({ ...prev, [field]: (prev[field] || []).filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data: Partial<Property> = {
        ...formData,
        photos: formData.photos || [],
        videos: formData.videos || [],
        media_order: syncMediaOrder(
          formData.photos || [],
          formData.videos || [],
          formData.media_order,
        ),
        video_url: null,
        amenities: formData.amenities || [],
        features: formData.features || [],
        published: formData.published !== false,
        featured: formData.featured === true,
      };

      await saveProperty(data, isEditing ? id : undefined);
      clearDraft();
      navigate('/admin/propiedades');
    } catch (err) {
      console.error('Error saving property:', err);
      alert('Error al guardar la propiedad');
    } finally {
      setSaving(false);
    }
  };

  if (isEditing && loadingProperty) return <LoadingSpinner />;

  const tabs = [
    { key: 'general', label: 'Información general' },
    { key: 'characteristics', label: 'Características' },
    { key: 'media', label: 'Fotos y videos' },
    { key: 'location', label: 'Ubicación' },
  ] as const;

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-3xl text-white font-bold">
          {isEditing ? 'Editar propiedad' : 'Agregar propiedad'}
        </h1>
        <button
          onClick={() => navigate('/admin/propiedades')}
          className="flex items-center gap-2 text-text-light hover:text-white transition-colors"
        >
          <X size={20} />
          Cancelar
        </button>
      </div>

      {!isEditing && (
        <PropertyAIAssistant
          formData={formData}
          onApply={(merged) => setFormData(merged)}
        />
      )}

      <form onSubmit={handleSubmit}>
        {/* Tabs */}
        <div className="bg-graphite rounded-t-xl border-b border-border">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === tab.key
                    ? 'border-accent text-accent'
                    : 'border-transparent text-text-light hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-graphite rounded-b-xl p-6 shadow-sm mb-6">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-white mb-2">Título *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  required
                  className="w-full bg-primary border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  placeholder="Ej: Casa en San Sebastián"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Tipo de operación *</label>
                <select
                  value={formData.operation}
                  onChange={(e) => handleChange('operation', e.target.value)}
                  required
                  className="w-full bg-primary border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                >
                  {OPERATIONS.map(op => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Tipo de propiedad *</label>
                <select
                  value={formData.property_type}
                  onChange={(e) => handleChange('property_type', e.target.value)}
                  required
                  className="w-full bg-primary border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                >
                  {PROPERTY_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Precio *</label>
                <input
                  type="number"
                  value={formData.price || ''}
                  onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
                  required
                  className="w-full bg-primary border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Moneda *</label>
                <select
                  value={formData.currency}
                  onChange={(e) => handleChange('currency', e.target.value)}
                  required
                  className="w-full bg-primary border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                >
                  {CURRENCIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Ciudad *</label>
                <input
                  type="text"
                  value={formData.city || ''}
                  onChange={(e) => handleChange('city', e.target.value)}
                  required
                  className="w-full bg-primary border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  placeholder="Ej: Escobar"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Barrio *</label>
                <input
                  type="text"
                  value={formData.neighborhood || ''}
                  onChange={(e) => handleChange('neighborhood', e.target.value)}
                  required
                  className="w-full bg-primary border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  placeholder="Ej: San Sebastián"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Provincia *</label>
                <input
                  type="text"
                  value={formData.province || ''}
                  onChange={(e) => handleChange('province', e.target.value)}
                  required
                  className="w-full bg-primary border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  placeholder="Ej: Buenos Aires"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Estado *</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  required
                  className="w-full bg-primary border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">País</label>
                <input type="text" value={formData.country || ''} onChange={(e) => handleChange('country', e.target.value)} className="input-premium" placeholder="Argentina" />
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="featured" checked={formData.featured || false} onChange={(e) => handleChange('featured', e.target.checked)} className="w-5 h-5 rounded border-border text-accent focus:ring-accent" />
                  <label htmlFor="featured" className="text-sm font-medium text-white">Destacada</label>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="published" checked={formData.published !== false} onChange={(e) => handleChange('published', e.target.checked)} className="w-5 h-5 rounded border-border text-accent focus:ring-accent" />
                  <label htmlFor="published" className="text-sm font-medium text-white">Publicada</label>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-white mb-2">Descripción corta</label>
                <textarea
                  value={formData.short_description || ''}
                  onChange={(e) => handleChange('short_description', e.target.value)}
                  rows={3}
                  className="w-full bg-primary border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none"
                  placeholder="Breve descripción de la propiedad..."
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-white mb-2">Descripción completa</label>
                <textarea
                  value={formData.full_description || ''}
                  onChange={(e) => handleChange('full_description', e.target.value)}
                  rows={6}
                  className="w-full bg-primary border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none"
                  placeholder="Descripción detallada de la propiedad..."
                />
              </div>
            </div>
          )}

          {/* Characteristics Tab */}
          {activeTab === 'characteristics' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Dormitorios</label>
                <input
                  type="number"
                  value={formData.bedrooms ?? ''}
                  onChange={(e) => handleNumberChange('bedrooms', e.target.value)}
                  className="w-full bg-primary border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Baños</label>
                <input
                  type="number"
                  value={formData.bathrooms ?? ''}
                  onChange={(e) => handleNumberChange('bathrooms', e.target.value)}
                  className="w-full bg-primary border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Cocheras</label>
                <input
                  type="number"
                  value={formData.garages ?? ''}
                  onChange={(e) => handleNumberChange('garages', e.target.value)}
                  className="w-full bg-primary border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Superficie cubierta (m²)</label>
                <input
                  type="number"
                  value={formData.covered_area ?? ''}
                  onChange={(e) => handleNumberChange('covered_area', e.target.value)}
                  className="w-full bg-primary border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Superficie total (m²)</label>
                <input
                  type="number"
                  value={formData.total_area ?? ''}
                  onChange={(e) => handleNumberChange('total_area', e.target.value)}
                  className="w-full bg-primary border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Antigüedad (años)</label>
                <input type="number" value={formData.age_years ?? ''} onChange={(e) => handleNumberChange('age_years', e.target.value)} className="input-premium" />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-white mb-2">Servicios</label>
                <div className="flex gap-2 mb-2">
                  <input type="text" value={newAmenity} onChange={e => setNewAmenity(e.target.value)} className="input-premium flex-1" placeholder="Ej: Pileta" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addToArray('amenities', newAmenity, setNewAmenity); } }} />
                  <button type="button" onClick={() => addToArray('amenities', newAmenity, setNewAmenity)} className="btn-primary px-4">+</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(formData.amenities || []).map((a, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-accent/10 text-accent text-xs rounded-full">{a}<button type="button" onClick={() => removeFromArray('amenities', i)}>×</button></span>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-white mb-2">Características</label>
                <div className="flex gap-2 mb-2">
                  <input type="text" value={newFeature} onChange={e => setNewFeature(e.target.value)} className="input-premium flex-1" placeholder="Ej: Aire acondicionado" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addToArray('features', newFeature, setNewFeature); } }} />
                  <button type="button" onClick={() => addToArray('features', newFeature, setNewFeature)} className="btn-primary px-4">+</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(formData.features || []).map((f, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-accent/10 text-accent text-xs rounded-full">{f}<button type="button" onClick={() => removeFromArray('features', i)}>×</button></span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Media Tab */}
          {activeTab === 'media' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-white">Imágenes</label>
                  <div className="flex flex-wrap gap-3 items-center">
                    <label className="btn-primary flex items-center gap-2 cursor-pointer py-2 px-4">
                      <Upload size={18} />
                      {uploadingPhoto ? 'Subiendo...' : 'Subir imágenes'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/avif,image/tiff,.heic,.heif,.avif,.tif,.tiff"
                        multiple
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={uploadingPhoto}
                      />
                    </label>
                    <span className="text-sm text-text-light">
                      JPG, PNG, WebP, GIF, HEIC, AVIF o TIFF
                    </span>
                  </div>
                  {photoItems.length > 0 && (
                    <p className="text-xs text-text-light">{photoItems.length} imagen{photoItems.length !== 1 ? 'es' : ''}</p>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-white">Videos</label>
                  <div className="flex flex-wrap gap-3 items-center">
                    <label className="btn-primary flex items-center gap-2 cursor-pointer py-2 px-4">
                      <Video size={18} />
                      {uploadingVideo ? 'Subiendo...' : 'Agregar video'}
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-m4v,video/x-matroska,.mp4,.webm,.mov,.avi,.m4v,.mkv"
                        multiple
                        className="hidden"
                        onChange={handleVideoUpload}
                        disabled={uploadingVideo}
                      />
                    </label>
                    <span className="text-sm text-text-light">
                      MP4, WebM, MOV, AVI, M4V o MKV
                    </span>
                  </div>
                  {videoItems.length > 0 && (
                    <p className="text-xs text-text-light">{videoItems.length} video{videoItems.length !== 1 ? 's' : ''}</p>
                  )}
                </div>
              </div>

              {uploadProgress.length > 0 && (
                <div className="space-y-2">
                  {uploadProgress.map((item) => (
                    <div key={item.name} className="bg-primary rounded-lg p-3 border border-border">
                      <div className="flex justify-between text-xs text-text-light mb-1.5">
                        <span className="truncate mr-2">{item.name}</span>
                        <span>{item.percent}%</span>
                      </div>
                      <div className="h-1.5 bg-metallic/40 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent transition-all duration-300 rounded-full"
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {hasMedia ? (
                <div className="space-y-3">
                  <p className="text-sm text-text-light">
                    {allMediaItems.length} archivo{allMediaItems.length !== 1 ? 's' : ''} — arrastrá para definir el orden. El #1 es la portada principal.
                  </p>
                  <SortableMediaList
                    items={allMediaItems}
                    onReorder={handleMediaReorder}
                    onRemove={(index) => void removeMedia(index)}
                    disabled={uploadingPhoto || uploadingVideo || saving}
                    layout="grid"
                    showTypeLabel
                  />
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
                  <Upload size={48} className="text-text-light mx-auto mb-4" />
                  <p className="text-text-light">No hay fotos ni videos cargados</p>
                  <p className="text-sm text-text-light/70 mt-1">Subí archivos desde tu computadora</p>
                </div>
              )}
            </div>
          )}

          {/* Location Tab */}
          {activeTab === 'location' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="sm:col-span-2 card-premium p-5">
                <PropertyLocationPicker
                  label="Dirección"
                  latitude={formData.latitude ?? null}
                  longitude={formData.longitude ?? null}
                  address={formData.address ?? undefined}
                  onLocationPreview={syncLocationToForm}
                  onLocationSave={syncLocationToForm}
                  savedLocation={savedLocation}
                  hideSaveButton
                  compactFullWidth
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Ciudad</label>
                <input
                  type="text"
                  value={formData.city || ''}
                  onChange={(e) => handleChange('city', e.target.value)}
                  className="w-full bg-primary border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  placeholder="Se completa automáticamente"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Barrio</label>
                <input
                  type="text"
                  value={formData.neighborhood || ''}
                  onChange={(e) => handleChange('neighborhood', e.target.value)}
                  className="w-full bg-primary border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  placeholder="Se completa automáticamente"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Provincia</label>
                <input
                  type="text"
                  value={formData.province || ''}
                  onChange={(e) => handleChange('province', e.target.value)}
                  className="w-full bg-primary border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  placeholder="Se completa automáticamente"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">País</label>
                <input
                  type="text"
                  value={formData.country || ''}
                  onChange={(e) => handleChange('country', e.target.value)}
                  className="w-full bg-primary border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  placeholder="Argentina"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Latitud</label>
                <input
                  type="number"
                  step="any"
                  value={formData.latitude ?? ''}
                  onChange={(e) => handleNumberChange('latitude', e.target.value)}
                  className="w-full bg-primary border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  placeholder="Se completa automáticamente"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Longitud</label>
                <input
                  type="number"
                  step="any"
                  value={formData.longitude ?? ''}
                  onChange={(e) => handleNumberChange('longitude', e.target.value)}
                  className="w-full bg-primary border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  placeholder="Se completa automáticamente"
                  readOnly
                />
              </div>
            </div>
          )}

        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/admin/propiedades')}
            className="px-6 py-3 text-sm font-medium text-text-light hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center gap-2 disabled:opacity-70"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save size={18} />
                Guardar
              </>
            )}
          </button>
        </div>
      </form>
    </m.div>
  );
}
