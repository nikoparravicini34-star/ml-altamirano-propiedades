import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { m, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Wand2,
  AlertCircle,
  ArrowRight,
  Upload,
  Video,
  Image as ImageIcon,
  MapPin,
} from 'lucide-react';
import type { ParsedPropertyFields, Property } from '../../types';
import { parsePropertyDescription } from '../../lib/propertyAIParser';
import { useFormDraft } from '../../hooks/useFormDraft';
import { buildFormDraftKey } from '../../lib/formDraftStorage';
import PropertyLocationPicker, {
  type LocationChangePayload,
} from '../../components/map/PropertyLocationPicker';
import {
  uploadPropertyImages,
  uploadPropertyVideos,
  deleteStorageFile,
} from '../../lib/supabase';
import { PROPERTY_TYPES, CURRENCIES, OPERATIONS } from '../../data/constants';
import SortableMediaList from '../../components/admin/SortableMediaList';
import {
  buildMediaItems,
  splitMediaItems,
  syncMediaOrder,
  annotateDisplayOrder,
  type MediaItem,
} from '../../lib/mediaOrder';

const emptyPrefill: Partial<Property> = {
  title: '',
  price: 0,
  currency: 'USD',
  operation: 'venta',
  property_type: 'Casa',
  city: '',
  neighborhood: '',
  province: 'Buenos Aires',
  country: 'Argentina',
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
  video_url: null,
  latitude: null,
  longitude: null,
  status: 'disponible',
  featured: false,
  published: true,
};

type AIEditablePreview = ParsedPropertyFields & {
  address: string;
  latitude: number | null;
  longitude: number | null;
  country: string;
};

const inputClass =
  'w-full bg-primary border border-border rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent';

function parsedToEditable(parsed: ParsedPropertyFields): AIEditablePreview {
  return {
    title: parsed.title ?? '',
    operation: parsed.operation ?? 'venta',
    property_type: parsed.property_type ?? 'Casa',
    price: parsed.price ?? 0,
    currency: parsed.currency ?? 'USD',
    city: parsed.city ?? '',
    neighborhood: parsed.neighborhood ?? '',
    province: parsed.province ?? 'Buenos Aires',
    country: parsed.country ?? 'Argentina',
    bedrooms: parsed.bedrooms ?? null,
    bathrooms: parsed.bathrooms ?? null,
    garages: parsed.garages ?? null,
    covered_area: parsed.covered_area ?? null,
    total_area: parsed.total_area ?? null,
    age_years: parsed.age_years ?? null,
    amenities: parsed.amenities ?? [],
    features: parsed.features ?? [],
    short_description: parsed.short_description ?? '',
    full_description: parsed.full_description ?? '',
    address: '',
    latitude: null,
    longitude: null,
  };
}

function applyLocationToEditable(
  editable: AIEditablePreview,
  location: LocationChangePayload,
): AIEditablePreview {
  return {
    ...editable,
    latitude: location.latitude,
    longitude: location.longitude,
    ...(location.address ? { address: location.address } : {}),
    ...(location.city ? { city: location.city } : {}),
    ...(location.neighborhood ? { neighborhood: location.neighborhood } : {}),
    ...(location.province ? { province: location.province } : {}),
    ...(location.country ? { country: location.country } : {}),
  };
}

function editableToProperty(
  editable: AIEditablePreview,
  photos: string[],
  videos: string[],
  mediaOrder: string[],
): Partial<Property> {
  return {
    ...emptyPrefill,
    title: editable.title ?? '',
    operation: editable.operation ?? 'venta',
    property_type: editable.property_type ?? 'Casa',
    price: editable.price ?? 0,
    currency: editable.currency ?? 'USD',
    city: editable.city ?? '',
    neighborhood: editable.neighborhood ?? '',
    province: editable.province ?? 'Buenos Aires',
    country: editable.country ?? 'Argentina',
    bedrooms: editable.bedrooms ?? null,
    bathrooms: editable.bathrooms ?? null,
    garages: editable.garages ?? null,
    covered_area: editable.covered_area ?? null,
    total_area: editable.total_area ?? null,
    age_years: editable.age_years ?? null,
    amenities: editable.amenities ?? [],
    features: editable.features ?? [],
    short_description: editable.short_description ?? '',
    full_description: editable.full_description ?? '',
    photos,
    videos,
    media_order: mediaOrder,
    latitude: editable.latitude ?? null,
    longitude: editable.longitude ?? null,
    address: editable.address ?? null,
  };
}

type PropertyAIDraft = {
  description: string;
  savedLocation: LocationChangePayload | null;
  locationFields: {
    address: string;
    city: string;
    neighborhood: string;
    province: string;
    country: string;
    latitude: number | null;
    longitude: number | null;
  };
  photos: string[];
  videos: string[];
  mediaOrder: string[];
  editable: AIEditablePreview | null;
};

function isPropertyAIEmpty(draft: PropertyAIDraft): boolean {
  return !draft.description.trim() && draft.editable == null;
}

export default function PropertyAI() {
  const navigate = useNavigate();
  const [description, setDescription] = useState('');
  const [savedLocation, setSavedLocation] = useState<LocationChangePayload | null>(null);
  const [locationFields, setLocationFields] = useState({
    address: '',
    city: '',
    neighborhood: '',
    province: 'Buenos Aires',
    country: 'Argentina',
    latitude: null as number | null,
    longitude: null as number | null,
  });
  const [photos, setPhotos] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [mediaOrder, setMediaOrder] = useState<string[]>([]);
  const [editable, setEditable] = useState<AIEditablePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<
    { name: string; percent: number; type: 'photo' | 'video' }[]
  >([]);

  const draftKey = buildFormDraftKey(['property-ai']);

  const { clearDraft } = useFormDraft<PropertyAIDraft>(
    draftKey,
    { description, savedLocation, locationFields, photos, videos, mediaOrder, editable },
    {
      enabled: !loading,
      isEmpty: isPropertyAIEmpty,
      onRestore: (draft) => {
        setDescription(draft.description);
        setSavedLocation(draft.savedLocation);
        setLocationFields(draft.locationFields);
        setPhotos(draft.photos);
        setVideos(draft.videos);
        setMediaOrder(draft.mediaOrder ?? syncMediaOrder(draft.photos, draft.videos));
        setEditable(draft.editable);
      },
    },
  );

  const applyMediaState = (nextPhotos: string[], nextVideos: string[], nextOrder: string[]) => {
    setPhotos(nextPhotos);
    setVideos(nextVideos);
    setMediaOrder(nextOrder);
  };

  const mediaItems = annotateDisplayOrder(buildMediaItems(photos, videos, mediaOrder));

  const handleMediaReorder = (items: MediaItem[]) => {
    const { photos: nextPhotos, videos: nextVideos, mediaOrder: nextOrder } = splitMediaItems(items);
    applyMediaState(nextPhotos, nextVideos, nextOrder);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const fileList = Array.from(files);
    setUploadingPhoto(true);
    setUploadProgress(fileList.map((f) => ({ name: f.name, percent: 0, type: 'photo' as const })));
    try {
      const urls = await uploadPropertyImages(fileList, undefined, (index, percent) => {
        setUploadProgress((prev) =>
          prev.map((item, i) => (i === index ? { ...item, percent } : item)),
        );
      });
      const nextPhotos = [...photos, ...urls];
      const nextOrder = syncMediaOrder(nextPhotos, videos, mediaOrder);
      applyMediaState(nextPhotos, videos, nextOrder);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir las imágenes.');
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
      const urls = await uploadPropertyVideos(fileList, undefined, (index, percent) => {
        setUploadProgress((prev) =>
          prev.map((item, i) => (i === index ? { ...item, percent } : item)),
        );
      });
      const nextVideos = [...videos, ...urls];
      const nextOrder = syncMediaOrder(photos, nextVideos, mediaOrder);
      applyMediaState(photos, nextVideos, nextOrder);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir los videos.');
    } finally {
      setUploadingVideo(false);
      setUploadProgress([]);
      e.target.value = '';
    }
  };

  const removeMedia = async (index: number) => {
    const item = mediaItems[index];
    if (!item) return;

    try {
      await deleteStorageFile(item.url);
    } catch (err) {
      console.warn('No se pudo eliminar el archivo del almacenamiento:', err);
    }

    const nextItems = mediaItems.filter((_, i) => i !== index);
    const { photos: nextPhotos, videos: nextVideos, mediaOrder: nextOrder } = splitMediaItems(nextItems);
    applyMediaState(nextPhotos, nextVideos, nextOrder);
  };

  const syncLocationFields = useCallback((location: LocationChangePayload) => {
    setLocationFields({
      address: location.address ?? '',
      city: location.city ?? '',
      neighborhood: location.neighborhood ?? '',
      province: location.province ?? 'Buenos Aires',
      country: location.country ?? 'Argentina',
      latitude: location.latitude,
      longitude: location.longitude,
    });
  }, []);

  const handleLocationPreview = useCallback(
    (location: LocationChangePayload) => {
      syncLocationFields(location);
      setEditable((prev) =>
        prev ? applyLocationToEditable(prev, location) : prev,
      );
    },
    [syncLocationFields],
  );

  const handleLocationSave = useCallback(
    (location: LocationChangePayload) => {
      setSavedLocation(location);
      syncLocationFields(location);
      setEditable((prev) =>
        prev ? applyLocationToEditable(prev, location) : prev,
      );
    },
    [syncLocationFields],
  );

  const handleAnalyze = async () => {
    setError(null);
    setLoading(true);

    try {
      const aiResult = await parsePropertyDescription(description);
      let next = parsedToEditable(aiResult);

      if (savedLocation) {
        next = applyLocationToEditable(next, savedLocation);
      } else {
        next = {
          ...next,
          address: locationFields.address,
          city: locationFields.city || next.city,
          neighborhood: locationFields.neighborhood || next.neighborhood,
          province: locationFields.province || next.province,
          country: locationFields.country || next.country,
          latitude: locationFields.latitude,
          longitude: locationFields.longitude,
        };
      }

      setEditable(next);
    } catch (err) {
      setEditable(null);
      setError(err instanceof Error ? err.message : 'Error al analizar la descripción.');
    } finally {
      setLoading(false);
    }
  };

  const updateField = <K extends keyof AIEditablePreview>(field: K, value: AIEditablePreview[K]) => {
    setEditable((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const updateLocationField = (
    field: keyof typeof locationFields,
    value: string | number | null,
  ) => {
    setLocationFields((prev) => ({ ...prev, [field]: value }));
    setEditable((prev) =>
      prev ? { ...prev, [field]: value } as AIEditablePreview : prev,
    );
  };

  const handleNumberChange = (field: keyof AIEditablePreview, value: string) => {
    const num = value === '' ? null : parseFloat(value);
    if (field === 'latitude' || field === 'longitude') {
      updateLocationField(field, num);
      return;
    }
    updateField(field, num as AIEditablePreview[typeof field]);
  };

  const handleApplyToForm = () => {
    const base = editable ?? {
      ...parsedToEditable({}),
      ...locationFields,
    };

    const dataToApply = savedLocation
      ? applyLocationToEditable(base, savedLocation)
      : {
          ...base,
          address: locationFields.address,
          city: locationFields.city,
          neighborhood: locationFields.neighborhood,
          province: locationFields.province,
          country: locationFields.country,
          latitude: locationFields.latitude,
          longitude: locationFields.longitude,
        };

    navigate('/admin/propiedades/nueva', {
      state: { prefilled: editableToProperty(dataToApply, photos, videos, mediaOrder) },
    });
    clearDraft();
  };

  const isUploading = uploadingPhoto || uploadingVideo;
  const displayLocation = editable
    ? {
        address: editable.address ?? locationFields.address,
        city: editable.city ?? locationFields.city,
        neighborhood: editable.neighborhood ?? locationFields.neighborhood,
        province: editable.province ?? locationFields.province,
        country: editable.country ?? locationFields.country,
        latitude: editable.latitude ?? locationFields.latitude,
        longitude: editable.longitude ?? locationFields.longitude,
      }
    : locationFields;

  const locationFieldInputs = (previewMode = false) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-white mb-2">Dirección</label>
        <input
          type="text"
          value={displayLocation.address}
          onChange={(e) => updateLocationField('address', e.target.value)}
          readOnly={previewMode}
          className={`${inputClass}${previewMode ? ' opacity-80' : ''}`}
          placeholder="Se completa automáticamente"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">Ciudad</label>
        <input
          type="text"
          value={displayLocation.city}
          onChange={(e) => updateLocationField('city', e.target.value)}
          readOnly={previewMode}
          className={`${inputClass}${previewMode ? ' opacity-80' : ''}`}
          placeholder="Se completa automáticamente"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">Barrio</label>
        <input
          type="text"
          value={displayLocation.neighborhood}
          onChange={(e) => updateLocationField('neighborhood', e.target.value)}
          readOnly={previewMode}
          className={`${inputClass}${previewMode ? ' opacity-80' : ''}`}
          placeholder="Se completa automáticamente"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">Provincia</label>
        <input
          type="text"
          value={displayLocation.province}
          onChange={(e) => updateLocationField('province', e.target.value)}
          readOnly={previewMode}
          className={`${inputClass}${previewMode ? ' opacity-80' : ''}`}
          placeholder="Se completa automáticamente"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">País</label>
        <input
          type="text"
          value={displayLocation.country}
          onChange={(e) => updateLocationField('country', e.target.value)}
          readOnly={previewMode}
          className={`${inputClass}${previewMode ? ' opacity-80' : ''}`}
          placeholder="Argentina"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">Latitud</label>
        <input
          type="number"
          step="any"
          value={displayLocation.latitude ?? ''}
          onChange={(e) => handleNumberChange('latitude', e.target.value)}
          readOnly={previewMode}
          className={`${inputClass}${previewMode ? ' opacity-80' : ''}`}
          placeholder="Ej: -34.3489"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">Longitud</label>
        <input
          type="number"
          step="any"
          value={displayLocation.longitude ?? ''}
          onChange={(e) => handleNumberChange('longitude', e.target.value)}
          readOnly={previewMode}
          className={`${inputClass}${previewMode ? ' opacity-80' : ''}`}
          placeholder="Ej: -58.8006"
        />
      </div>
    </div>
  );

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-white font-bold">IA Inmobiliaria</h1>
        <p className="text-text-light mt-2 text-sm">
          Describí la propiedad, subí fotos y videos, indicá la ubicación en el mapa y la IA completará el formulario.
          Revisá todos los datos antes de cargarlos en nueva propiedad.
        </p>
      </div>

      <section className="bg-graphite rounded-xl border border-border shadow-sm mb-6 overflow-hidden">
        <div className="px-6 py-5 border-b border-border bg-gradient-to-r from-primary/80 to-graphite">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary border border-accent/30 flex items-center justify-center shrink-0">
              <Sparkles size={18} className="text-accent" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold text-white">Datos de la propiedad</h2>
              <p className="text-sm text-text-light mt-1">
                Texto, imágenes, videos y ubicación. La IA analiza el texto; los archivos se suben automáticamente.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label htmlFor="ai-description" className="block text-sm font-medium text-white mb-2">
              Descripción libre
            </label>
            <textarea
              id="ai-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              disabled={loading}
              placeholder="Ej: Casa moderna en Nordelta con 4 dormitorios, 3 baños, pileta, garage para 2 autos, lote de 800m2, precio 500000 dólares"
              className={`${inputClass} resize-none disabled:opacity-60`}
            />
          </div>

          <div className="rounded-xl border border-border bg-primary/30 p-5 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                <MapPin size={18} className="text-accent" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-white">Ubicación</h3>
                <p className="text-sm text-text-light mt-1">
                  Buscá una dirección, arrastrá el marcador o hacé clic en el mapa. Los campos se completan automáticamente.
                  Guardá la ubicación antes de aplicar la propiedad.
                </p>
              </div>
            </div>

            <PropertyLocationPicker
              label="Dirección"
              latitude={displayLocation.latitude}
              longitude={displayLocation.longitude}
              address={displayLocation.address}
              onLocationPreview={handleLocationPreview}
              onLocationSave={handleLocationSave}
              savedLocation={savedLocation}
              disabled={loading}
            />

            {locationFieldInputs(false)}
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-white">
                  <ImageIcon size={16} className="text-accent" />
                  Fotos
                </label>
                <div className="flex flex-wrap gap-3 items-center">
                  <label className="btn-primary flex items-center gap-2 cursor-pointer py-2 px-4 text-sm">
                    <Upload size={16} />
                    {uploadingPhoto ? 'Subiendo...' : 'Subir imágenes'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/avif,image/tiff,.heic,.heif,.avif,.tif,.tiff"
                      multiple
                      className="hidden"
                      onChange={(e) => void handleImageUpload(e)}
                      disabled={uploadingPhoto || loading}
                    />
                  </label>
                  <span className="text-xs text-text-light">Múltiples archivos — subida automática</span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-white">
                  <Video size={16} className="text-accent" />
                  Videos
                </label>
                <div className="flex flex-wrap gap-3 items-center">
                  <label className="btn-primary flex items-center gap-2 cursor-pointer py-2 px-4 text-sm">
                    <Upload size={16} />
                    {uploadingVideo ? 'Subiendo...' : 'Subir videos'}
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-m4v,video/x-matroska,video/ogg,.mp4,.webm,.mov,.avi,.m4v,.mkv"
                      multiple
                      className="hidden"
                      onChange={(e) => void handleVideoUpload(e)}
                      disabled={uploadingVideo || loading}
                    />
                  </label>
                  <span className="text-xs text-text-light">Múltiples archivos — subida automática</span>
                </div>
              </div>
            </div>

            {mediaItems.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-text-light">
                    {mediaItems.length} archivo{mediaItems.length !== 1 ? 's' : ''} — arrastrá para definir el orden. El #1 es la portada principal.
                  </p>
                </div>
                <SortableMediaList
                  items={mediaItems}
                  onReorder={handleMediaReorder}
                  onRemove={(index) => void removeMedia(index)}
                  disabled={loading || isUploading}
                  layout="grid"
                  showTypeLabel
                />
              </div>
            )}
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

          <button
            type="button"
            onClick={() => void handleAnalyze()}
            disabled={loading || isUploading || !description.trim()}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Wand2 size={16} />
            )}
            {loading ? 'Analizando...' : 'Analizar con IA'}
          </button>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </section>

      <AnimatePresence>
        {editable && (
          <m.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="bg-graphite rounded-xl border border-border shadow-sm overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-border flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-xl font-bold text-white">Vista previa — campos detectados</h2>
                <p className="text-sm text-text-light mt-1">
                  Editá cualquier campo y revisá fotos, videos y ubicación antes de aplicar al formulario.
                </p>
              </div>
              <button
                type="button"
                onClick={handleApplyToForm}
                className="btn-primary flex items-center gap-2 text-sm py-2 px-4"
              >
                <ArrowRight size={16} />
                Aplicar a Nueva Propiedad
              </button>
            </div>

            <div className="p-6 space-y-8">
              {mediaItems.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Medios cargados</h3>
                  <p className="text-xs text-text-light">
                    Orden de visualización — arrastrá las tarjetas para reorganizar
                  </p>
                  <SortableMediaList
                    items={mediaItems}
                    onReorder={handleMediaReorder}
                    onRemove={(index) => void removeMedia(index)}
                    disabled={loading || isUploading}
                    layout="grid"
                    showTypeLabel
                  />
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wide mb-4">Ubicación guardada</h3>
                {locationFieldInputs(true)}
                <p className="text-xs text-text-light mt-3">
                  Para modificar la ubicación, usá el mapa en la sección superior y volvé a guardar.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-white mb-2">Título</label>
                  <input
                    type="text"
                    value={editable.title ?? ''}
                    onChange={(e) => updateField('title', e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Operación</label>
                  <select
                    value={editable.operation ?? 'venta'}
                    onChange={(e) => updateField('operation', e.target.value as Property['operation'])}
                    className={inputClass}
                  >
                    {OPERATIONS.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Tipo de propiedad</label>
                  <select
                    value={editable.property_type ?? 'Casa'}
                    onChange={(e) => updateField('property_type', e.target.value)}
                    className={inputClass}
                  >
                    {PROPERTY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Precio</label>
                  <input
                    type="number"
                    value={editable.price ?? ''}
                    onChange={(e) => handleNumberChange('price', e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Moneda</label>
                  <select
                    value={editable.currency ?? 'USD'}
                    onChange={(e) => updateField('currency', e.target.value)}
                    className={inputClass}
                  >
                    {CURRENCIES.map((cur) => (
                      <option key={cur} value={cur}>
                        {cur}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Dormitorios</label>
                  <input
                    type="number"
                    value={editable.bedrooms ?? ''}
                    onChange={(e) => handleNumberChange('bedrooms', e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Baños</label>
                  <input
                    type="number"
                    value={editable.bathrooms ?? ''}
                    onChange={(e) => handleNumberChange('bathrooms', e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Cocheras</label>
                  <input
                    type="number"
                    value={editable.garages ?? ''}
                    onChange={(e) => handleNumberChange('garages', e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Metros cuadrados cubiertos</label>
                  <input
                    type="number"
                    value={editable.covered_area ?? ''}
                    onChange={(e) => handleNumberChange('covered_area', e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Metros cuadrados totales</label>
                  <input
                    type="number"
                    value={editable.total_area ?? ''}
                    onChange={(e) => handleNumberChange('total_area', e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Antigüedad (años)</label>
                  <input
                    type="number"
                    value={editable.age_years ?? ''}
                    onChange={(e) => handleNumberChange('age_years', e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-white mb-2">Servicios</label>
                  <input
                    type="text"
                    value={(editable.amenities ?? []).join(', ')}
                    onChange={(e) =>
                      updateField(
                        'amenities',
                        e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      )
                    }
                    placeholder="Ej: pileta, parrilla, seguridad"
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-white mb-2">Características</label>
                  <input
                    type="text"
                    value={(editable.features ?? []).join(', ')}
                    onChange={(e) =>
                      updateField(
                        'features',
                        e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      )
                    }
                    placeholder="Ej: luminoso, reciclado a nuevo"
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-white mb-2">Descripción corta</label>
                  <textarea
                    value={editable.short_description ?? ''}
                    onChange={(e) => updateField('short_description', e.target.value)}
                    rows={3}
                    className={`${inputClass} resize-none`}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-white mb-2">Descripción completa</label>
                  <textarea
                    value={editable.full_description ?? ''}
                    onChange={(e) => updateField('full_description', e.target.value)}
                    rows={5}
                    className={`${inputClass} resize-none`}
                  />
                </div>
              </div>
            </div>

            <div className="px-6 pb-6">
              <button
                type="button"
                onClick={handleApplyToForm}
                className="btn-primary flex items-center gap-2"
              >
                <ArrowRight size={16} />
                Aplicar a Nueva Propiedad
              </button>
            </div>
          </m.section>
        )}
      </AnimatePresence>
    </m.div>
  );
}
