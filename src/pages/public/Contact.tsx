import { lazy, Suspense } from 'react';
import { m } from 'framer-motion';
import { Phone, Mail, MapPin, Clock, MessageCircle, ExternalLink } from 'lucide-react';
import { buildGoogleMapsUrl } from '../../lib/location';
import { useSiteSettings } from '../../context/SiteSettingsContext';

const PropertyLocationMap = lazy(() => import('../../components/map/PropertyLocationMap'));

const CONTACT_MAP_HEIGHT = 420;

export default function Contact() {
  const { settings } = useSiteSettings();
  const { address, office_latitude, office_longitude, office_hours_weekdays, office_hours_saturday } = settings;
  const hasMapCoords = office_latitude != null && office_longitude != null;

  return (
    <div className="pt-24 pb-20 bg-surface min-h-screen">
      <div className="section-padding">
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <span className="text-accent text-sm font-medium tracking-widest uppercase mb-3 block">
            Contacto
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl text-white font-bold mb-6">
            Envianos tu consulta
          </h1>
          <p className="text-text-light text-lg max-w-2xl mx-auto">
            Estamos para ayudarte. Escribinos por WhatsApp, teléfono o email, o visitanos en nuestra oficina.
          </p>
        </m.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10 lg:items-stretch">
          <m.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="h-full"
          >
            <div className="card-premium h-full flex flex-col overflow-hidden">
              <div className="h-1 bg-gold-gradient shrink-0" />
              <div className="p-6 sm:p-8 flex flex-col flex-1">
                <span className="text-accent text-xs font-medium tracking-widest uppercase mb-2 block">
                  Estamos cerca
                </span>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-white mb-6 shrink-0">
                  Información de contacto
                </h3>
                <div className="flex flex-1 flex-col justify-between gap-2 sm:gap-3">
                  <div className="flex items-start gap-4 py-5 sm:py-6 border-b border-white/5">
                    <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                      <MessageCircle size={20} className="text-accent" />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <span className="block text-xs uppercase tracking-wide text-text-light mb-1">WhatsApp</span>
                      <a
                        href={`https://wa.me/${settings.whatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-ink font-medium hover:text-accent transition-colors"
                      >
                        {settings.phone}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 py-5 sm:py-6 border-b border-white/5">
                    <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                      <Phone size={20} className="text-accent" />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <span className="block text-xs uppercase tracking-wide text-text-light mb-1">Teléfono</span>
                      <a
                        href={`tel:${settings.phone}`}
                        className="text-ink font-medium hover:text-accent transition-colors"
                      >
                        {settings.phone}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 py-5 sm:py-6 border-b border-white/5">
                    <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                      <Mail size={20} className="text-accent" />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <span className="block text-xs uppercase tracking-wide text-text-light mb-1">Email</span>
                      <a
                        href={`mailto:${settings.email}`}
                        className="text-ink font-medium hover:text-accent transition-colors"
                      >
                        {settings.email}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 py-5 sm:py-6 border-b border-white/5">
                    <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                      <MapPin size={20} className="text-accent" />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <span className="block text-xs uppercase tracking-wide text-text-light mb-1">Ubicación</span>
                      <span className="text-ink font-medium leading-relaxed">{address}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 py-5 sm:py-6">
                    <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                      <Clock size={20} className="text-accent" />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <span className="block text-xs uppercase tracking-wide text-text-light mb-1">Horario de atención</span>
                      <span className="text-ink font-medium leading-relaxed">
                        {office_hours_weekdays}<br />
                        {office_hours_saturday}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </m.div>

          <m.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="lg:col-span-2 h-full"
          >
            <div className="card-premium h-full flex flex-col overflow-hidden">
              <div className="h-1 bg-gold-gradient shrink-0" />
              <div className="p-6 sm:p-8 flex flex-col h-full">
                <div className="mb-6 pb-6 border-b border-white/5">
                  <span className="text-accent text-xs font-medium tracking-widest uppercase mb-2 block">
                    Visítanos
                  </span>
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-white mb-3">
                    Nuestra oficina
                  </h3>
                  <p className="text-text-light leading-relaxed max-w-2xl">
                    Siempre estamos disponibles para recibirte. Visítanos en nuestra oficina y te ayudaremos a encontrar la propiedad ideal.
                  </p>
                </div>

                <div className="flex items-start gap-2.5 text-text-light mb-5">
                  <MapPin size={18} className="text-accent shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{address}</span>
                </div>

                <div className="flex flex-col flex-1 min-h-0">
                  {hasMapCoords ? (
                    <>
                      <Suspense
                        fallback={
                          <div
                            className="flex flex-1 items-center justify-center rounded-xl border border-border bg-metallic/40 text-sm text-text-light min-h-[280px] sm:min-h-[360px]"
                            style={{ minHeight: CONTACT_MAP_HEIGHT }}
                          >
                            Cargando mapa...
                          </div>
                        }
                      >
                        <PropertyLocationMap
                          latitude={office_latitude}
                          longitude={office_longitude}
                          height={CONTACT_MAP_HEIGHT}
                        />
                      </Suspense>
                      <a
                        href={buildGoogleMapsUrl(office_latitude, office_longitude)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary inline-flex items-center gap-2 mt-5 py-2.5 px-4 text-sm w-fit shrink-0"
                      >
                        <ExternalLink size={16} />
                        Abrir mapa
                      </a>
                    </>
                  ) : (
                    <div
                      className="flex flex-1 items-center justify-center rounded-xl border border-border bg-metallic/40 text-sm text-text-light min-h-[280px] sm:min-h-[360px]"
                      style={{ minHeight: CONTACT_MAP_HEIGHT }}
                    >
                      Mapa no disponible — configurá la ubicación desde el panel de administración
                    </div>
                  )}
                </div>
              </div>
            </div>
          </m.div>
        </div>
      </div>
    </div>
  );
}
