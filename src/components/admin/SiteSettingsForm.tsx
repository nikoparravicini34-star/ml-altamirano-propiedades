import { useState, useEffect, useCallback } from 'react';
import { m } from 'framer-motion';
import { Save, Upload, Globe, Home, Phone, Share2, Plus, Trash2, Crop, MapPin } from 'lucide-react';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import { uploadSiteAsset } from '../../lib/supabase';
import { urlToObjectUrl } from '../../lib/cropImage';
import ImageCropModal from './ImageCropModal';
import PropertyLocationPicker, {
  type LocationChangePayload,
} from '../map/PropertyLocationPicker';
import type { SiteSettings, SiteFeature } from '../../data/siteSettingsDefaults';

type Tab = 'general' | 'home' | 'contact' | 'footer' | 'features';

interface CropState {
  imageSrc: string;
  field: keyof SiteSettings;
  folder: string;
  cropShape: 'round' | 'rect';
  fileName: string;
  title: string;
}

export default function SiteSettingsForm() {
  const { settings, saveSettings } = useSiteSettings();
  const [form, setForm] = useState<SiteSettings>(settings);
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [cropState, setCropState] = useState<CropState | null>(null);
  const [savedOfficeLocation, setSavedOfficeLocation] = useState<LocationChangePayload | null>(null);
  const [savingLocation, setSavingLocation] = useState(false);

  useEffect(() => { setForm(settings); }, [settings]);

  useEffect(() => {
    if (settings.office_latitude != null && settings.office_longitude != null) {
      setSavedOfficeLocation({
        latitude: settings.office_latitude,
        longitude: settings.office_longitude,
        address: settings.address,
      });
    }
  }, [settings.office_latitude, settings.office_longitude, settings.address]);

  const update = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleFileUpload = async (file: File, field: keyof SiteSettings, folder: string) => {
    setUploading(field);
    setMessage(null);
    try {
      const previousUrl = form[field] as string | null;
      const url = await uploadSiteAsset(file, folder, previousUrl);
      const updated = { ...form, [field]: url };
      setForm(updated);
      await saveSettings(updated);
      setMessage({ type: 'ok', text: 'Archivo subido y guardado correctamente' });
    } catch (err) {
      console.error(err);
      setMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Error al subir el archivo',
      });
    } finally {
      setUploading(null);
    }
  };

  const closeCropModal = useCallback(() => {
    if (cropState?.imageSrc.startsWith('blob:')) {
      URL.revokeObjectURL(cropState.imageSrc);
    }
    setCropState(null);
  }, [cropState]);

  const openCropForFile = (
    file: File,
    field: keyof SiteSettings,
    folder: string,
    cropShape: 'round' | 'rect',
    title: string,
  ) => {
    const imageSrc = URL.createObjectURL(file);
    setCropState({
      imageSrc,
      field,
      folder,
      cropShape,
      fileName: `${folder}.jpg`,
      title,
    });
  };

  const openCropForUrl = async (
    url: string,
    field: keyof SiteSettings,
    folder: string,
    cropShape: 'round' | 'rect',
    title: string,
  ) => {
    setUploading(field);
    try {
      const imageSrc = await urlToObjectUrl(url);
      setCropState({
        imageSrc,
        field,
        folder,
        cropShape,
        fileName: `${folder}.jpg`,
        title,
      });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'err', text: 'No se pudo cargar la imagen para editar' });
    } finally {
      setUploading(null);
    }
  };

  const handleCropConfirm = async (file: File) => {
    if (!cropState) return;
    const { field, folder } = cropState;
    closeCropModal();
    await handleFileUpload(file, field, folder);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await saveSettings(form);
      setMessage({ type: 'ok', text: 'Configuración guardada correctamente' });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'err', text: 'Error al guardar la configuración' });
    } finally {
      setSaving(false);
    }
  };

  const handleOfficeLocationSave = async (location: LocationChangePayload) => {
    setSavingLocation(true);
    setMessage(null);
    const updated: SiteSettings = {
      ...form,
      office_latitude: location.latitude,
      office_longitude: location.longitude,
      ...(location.address ? { address: location.address } : {}),
    };
    setForm(updated);
    setSavedOfficeLocation(location);
    try {
      await saveSettings(updated);
      setMessage({ type: 'ok', text: 'Ubicación guardada correctamente' });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'err', text: 'Error al guardar la ubicación' });
    } finally {
      setSavingLocation(false);
    }
  };

  const updateFeature = (index: number, field: keyof SiteFeature, value: string) => {
    const features = [...form.features];
    features[index] = { ...features[index], [field]: value };
    update('features', features);
  };

  const addService = () => update('footer_services', [...form.footer_services, '']);
  const removeService = (i: number) => update('footer_services', form.footer_services.filter((_, idx) => idx !== i));

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'general', label: 'General', icon: <Globe size={16} /> },
    { key: 'home', label: 'Página inicio', icon: <Home size={16} /> },
    { key: 'contact', label: 'Contacto', icon: <Phone size={16} /> },
    { key: 'footer', label: 'Pie de página', icon: <Share2 size={16} /> },
    { key: 'features', label: 'Valores', icon: <Plus size={16} /> },
  ];

  const FileUpload = ({
    label,
    field,
    folder,
    currentUrl,
    cropShape,
    cropTitle,
  }: {
    label: string;
    field: keyof SiteSettings;
    folder: string;
    currentUrl: string | null;
    cropShape?: 'round' | 'rect';
    cropTitle?: string;
  }) => (
    <div>
      <label className="admin-label">{label}</label>
      <div className="flex items-center gap-4 flex-wrap">
        {currentUrl && (
          <img
            src={currentUrl}
            alt=""
            className={`w-16 h-16 object-cover border border-border ${
              cropShape === 'round' ? 'rounded-full' : 'rounded-lg'
            }`}
          />
        )}
        {cropShape ? (
          <label className="btn-outline text-sm py-2 px-4 cursor-pointer flex items-center gap-2">
            <Upload size={14} />
            {uploading === field ? 'Subiendo...' : 'Subir archivo'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) openCropForFile(f, field, folder, cropShape, cropTitle ?? `Recortar ${label.toLowerCase()}`);
                e.target.value = '';
              }}
            />
          </label>
        ) : (
          <label className="btn-outline text-sm py-2 px-4 cursor-pointer flex items-center gap-2">
            <Upload size={14} />
            {uploading === field ? 'Subiendo...' : 'Subir archivo'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f, field, folder);
                e.target.value = '';
              }}
            />
          </label>
        )}
        {cropShape && currentUrl && (
          <button
            type="button"
            disabled={uploading === field}
            onClick={() => openCropForUrl(currentUrl, field, folder, cropShape, cropTitle ?? `Editar ${label.toLowerCase()}`)}
            className="btn-outline text-sm py-2 px-4 flex items-center gap-2 disabled:opacity-60"
          >
            <Crop size={14} />
            Editar
          </button>
        )}
      </div>
    </div>
  );

  return (
    <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl text-white font-bold">Configuración del sitio</h1>
          <p className="text-text-light mt-1">Administrá todo el contenido visible del sitio web</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-60">
          <Save size={18} />
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      {message && (
        <div className={`mb-6 px-4 py-3 rounded-xl text-sm border ${
          message.type === 'ok' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-500/10 border-red-500/20 text-red-600'
        }`}>
          {message.text}
        </div>
      )}

      <div className="card-premium overflow-hidden">
        <div className="flex overflow-x-auto border-b border-border/50">
          {tabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key ? 'border-accent text-accent' : 'border-transparent text-text-light hover:text-white'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-6">
          {activeTab === 'general' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="admin-label">Nombre de la inmobiliaria</label>
                <input className="input-premium" value={form.company_name} onChange={e => update('company_name', e.target.value)} />
              </div>
              <div>
                <label className="admin-label">Subtítulo</label>
                <input className="input-premium" value={form.company_subtitle} onChange={e => update('company_subtitle', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="admin-label">Descripción</label>
                <textarea className="input-premium resize-none" rows={3} value={form.description} onChange={e => update('description', e.target.value)} />
              </div>
              <FileUpload label="Logo" field="logo_url" folder="logo" currentUrl={form.logo_url} cropShape="round" cropTitle="Recortar logo (circular)" />
              <FileUpload label="Favicon" field="favicon_url" folder="favicon" currentUrl={form.favicon_url} cropShape="rect" cropTitle="Recortar favicon (cuadrado)" />
            </div>
          )}

          {activeTab === 'home' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <FileUpload label="Imagen principal (hero)" field="hero_image_url" folder="hero" currentUrl={form.hero_image_url} />
              </div>
              <div>
                <label className="admin-label">Badge superior</label>
                <input className="input-premium" value={form.hero_badge} onChange={e => update('hero_badge', e.target.value)} />
              </div>
              <div>
                <label className="admin-label">Slogan</label>
                <input className="input-premium" value={form.slogan} onChange={e => update('slogan', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="admin-label">Título principal</label>
                <input className="input-premium" value={form.hero_title} onChange={e => update('hero_title', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="admin-label">Subtítulo</label>
                <textarea className="input-premium resize-none" rows={2} value={form.hero_subtitle} onChange={e => update('hero_subtitle', e.target.value)} />
              </div>
              <div>
                <label className="admin-label">Botón venta</label>
                <input className="input-premium" value={form.hero_button_sale} onChange={e => update('hero_button_sale', e.target.value)} />
              </div>
              <div>
                <label className="admin-label">Botón alquiler</label>
                <input className="input-premium" value={form.hero_button_rent} onChange={e => update('hero_button_rent', e.target.value)} />
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="admin-label">WhatsApp (sin +)</label>
                  <input className="input-premium" value={form.whatsapp} onChange={e => update('whatsapp', e.target.value)} />
                </div>
                <div>
                  <label className="admin-label">Teléfono</label>
                  <input className="input-premium" value={form.phone} onChange={e => update('phone', e.target.value)} />
                </div>
                <div>
                  <label className="admin-label">Email</label>
                  <input className="input-premium" type="email" value={form.email} onChange={e => update('email', e.target.value)} />
                </div>
                <div>
                  <label className="admin-label">Ubicación (texto)</label>
                  <input className="input-premium" value={form.address} onChange={e => update('address', e.target.value)} />
                </div>
                <div>
                  <label className="admin-label">Horario de atención entre semana</label>
                  <input className="input-premium" value={form.office_hours_weekdays} onChange={e => update('office_hours_weekdays', e.target.value)} placeholder="Lunes a Viernes: 9:00 - 18:00" />
                </div>
                <div>
                  <label className="admin-label">Horario de atención los sábados</label>
                  <input className="input-premium" value={form.office_hours_saturday} onChange={e => update('office_hours_saturday', e.target.value)} placeholder="Sábados: 10:00 - 14:00" />
                </div>
              </div>

              <div className="pt-6 border-t border-border/50">
                <div className="flex items-center gap-2 mb-5">
                  <MapPin size={18} className="text-accent" />
                  <h3 className="font-serif text-lg text-white font-semibold">Ubicación de la oficina</h3>
                </div>
                <p className="text-sm text-text-light mb-5">
                  Hacé clic en el mapa o arrastrá el marcador para definir la ubicación. Al guardar, el mapa y la dirección de la página de contacto se actualizarán automáticamente.
                </p>
                <PropertyLocationPicker
                  label="Buscar dirección de la oficina"
                  latitude={form.office_latitude}
                  longitude={form.office_longitude}
                  address={form.address}
                  onLocationPreview={(location) => {
                    if (location.address) {
                      setForm(prev => ({ ...prev, address: location.address! }));
                    }
                  }}
                  onLocationSave={handleOfficeLocationSave}
                  savedLocation={savedOfficeLocation}
                  compactFullWidth
                  disabled={savingLocation || saving}
                />
              </div>

              <div className="pt-6 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <label className="admin-label">Título página Nosotros</label>
                  <input className="input-premium" value={form.about_title} onChange={e => update('about_title', e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="admin-label">Descripción Nosotros</label>
                  <textarea className="input-premium resize-none" rows={4} value={form.about_description} onChange={e => update('about_description', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'footer' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="admin-label">Instagram URL</label>
                  <input className="input-premium" value={form.social_instagram} onChange={e => update('social_instagram', e.target.value)} placeholder="https://instagram.com/..." />
                </div>
                <div>
                  <label className="admin-label">Facebook URL</label>
                  <input className="input-premium" value={form.social_facebook} onChange={e => update('social_facebook', e.target.value)} />
                </div>
                <div>
                  <label className="admin-label">LinkedIn URL</label>
                  <input className="input-premium" value={form.social_linkedin} onChange={e => update('social_linkedin', e.target.value)} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="admin-label mb-0">Servicios del pie de página</label>
                  <button type="button" onClick={addService} className="text-xs text-accent hover:underline flex items-center gap-1">
                    <Plus size={12} /> Agregar
                  </button>
                </div>
                <div className="space-y-2">
                  {form.footer_services.map((s, i) => (
                    <div key={i} className="flex gap-2">
                      <input className="input-premium flex-1" value={s} onChange={e => {
                        const services = [...form.footer_services];
                        services[i] = e.target.value;
                        update('footer_services', services);
                      }} />
                      <button type="button" onClick={() => removeService(i)} className="p-2 text-red-400 hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'features' && (
            <div className="space-y-5">
              {form.features.map((f, i) => (
                <div key={i} className="p-4 rounded-xl bg-warm/40 border border-border/30 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="admin-label">Icono</label>
                    <select className="input-premium" value={f.icon} onChange={e => updateFeature(i, 'icon', e.target.value)}>
                      {['Users', 'Shield', 'TrendingUp', 'Heart'].map(ic => (
                        <option key={ic} value={ic}>{ic}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="admin-label">Título</label>
                    <input className="input-premium" value={f.title} onChange={e => updateFeature(i, 'title', e.target.value)} />
                  </div>
                  <div>
                    <label className="admin-label">Descripción</label>
                    <input className="input-premium" value={f.description} onChange={e => updateFeature(i, 'description', e.target.value)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {cropState && (
        <ImageCropModal
          isOpen
          imageSrc={cropState.imageSrc}
          cropShape={cropState.cropShape}
          aspect={1}
          fileName={cropState.fileName}
          title={cropState.title}
          onConfirm={handleCropConfirm}
          onCancel={closeCropModal}
        />
      )}
    </m.div>
  );
}
