import { memo } from 'react';
import { MessageCircle } from 'lucide-react';
import { useSiteSettings } from '../../context/SiteSettingsContext';

function WhatsAppButton() {
  const { settings } = useSiteSettings();
  const message = encodeURIComponent('Hola, me interesa obtener más información sobre sus propiedades.');

  return (
    <a
      href={`https://wa.me/${settings.whatsapp}?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-[0_8px_28px_rgba(37,211,102,0.45)] hover:scale-110 active:scale-95 transition-transform duration-250 animate-scale-in"
      aria-label="Contactar por WhatsApp"
      style={{ animationDelay: '0.8s', animationFillMode: 'both' }}
    >
      <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-20 animate-ping [animation-duration:2.5s]" />
      <MessageCircle size={28} className="text-white relative z-10" />
    </a>
  );
}

export default memo(WhatsAppButton);
