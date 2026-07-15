import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Instagram, Facebook, Linkedin } from 'lucide-react';
import { NAV_LINKS } from '../../data/constants';
import { useSiteSettings } from '../../context/SiteSettingsContext';

export default function Footer() {
  const { settings } = useSiteSettings();

  const socialLink = (url: string) => url || '#';

  return (
    <footer className="bg-primary border-t border-white/5 text-white">
      <div className="h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
      <div className="section-padding py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt="" className="w-12 h-12 rounded-full object-cover ring-1 ring-accent/30" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-graphite border border-accent/30 flex items-center justify-center">
                  <span className="font-serif font-bold text-xl text-accent">A</span>
                </div>
              )}
              <div>
                <span className="font-serif font-bold text-xl tracking-wide">{settings.company_name.split(' ')[0]?.toUpperCase() ?? 'ALTAMIRANO'}</span>
                <span className="block text-[10px] tracking-[0.3em] uppercase text-accent">{settings.company_subtitle}</span>
              </div>
            </div>
            <p className="text-white/60 text-sm leading-relaxed">{settings.description}</p>
            <div className="flex gap-3">
              {settings.social_instagram && (
                <a href={socialLink(settings.social_instagram)} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-graphite border border-white/10 flex items-center justify-center hover:border-accent hover:text-accent transition-all duration-300">
                  <Instagram size={18} />
                </a>
              )}
              {settings.social_facebook && (
                <a href={socialLink(settings.social_facebook)} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-graphite border border-white/10 flex items-center justify-center hover:border-accent hover:text-accent transition-all duration-300">
                  <Facebook size={18} />
                </a>
              )}
              {settings.social_linkedin && (
                <a href={socialLink(settings.social_linkedin)} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-graphite border border-white/10 flex items-center justify-center hover:border-accent hover:text-accent transition-all duration-300">
                  <Linkedin size={18} />
                </a>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-serif font-semibold text-lg mb-6 text-white">Enlaces Rápidos</h4>
            <ul className="space-y-3">
              {NAV_LINKS.map(link => (
                <li key={link.href}>
                  <Link to={link.href} className="text-white/55 hover:text-accent transition-colors text-sm">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-serif font-semibold text-lg mb-6 text-white">Servicios</h4>
            <ul className="space-y-3">
              {settings.footer_services.map(s => (
                <li key={s}><span className="text-white/55 text-sm">{s}</span></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-serif font-semibold text-lg mb-6 text-white">Contacto</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Phone size={18} className="text-accent mt-0.5 shrink-0" />
                <div>
                  <span className="text-white/45 text-sm block">WhatsApp</span>
                  <a href={`https://wa.me/${settings.whatsapp}`} className="text-white/85 hover:text-accent transition-colors text-sm">{settings.phone}</a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Mail size={18} className="text-accent mt-0.5 shrink-0" />
                <div>
                  <span className="text-white/45 text-sm block">Email</span>
                  <a href={`mailto:${settings.email}`} className="text-white/85 hover:text-accent transition-colors text-sm">{settings.email}</a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-accent mt-0.5 shrink-0" />
                <div>
                  <span className="text-white/45 text-sm block">Ubicación</span>
                  <span className="text-white/85 text-sm">{settings.address}</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/8">
        <div className="section-padding py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/40 text-sm">&copy; {new Date().getFullYear()} {settings.company_name}. Todos los derechos reservados.</p>
          <div className="flex gap-6">
            <Link to="#" className="text-white/40 hover:text-accent text-sm transition-colors">Política de privacidad</Link>
            <Link to="#" className="text-white/40 hover:text-accent text-sm transition-colors">Términos de uso</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
