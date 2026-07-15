import { useState } from 'react';
import { Copy, Check, ExternalLink, X, ShieldCheck } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';

interface Props {
  callbackUrl: string;
  onDismiss: () => void;
}

export default function OAuthSetupBanner({ callbackUrl, onDismiss }: Props) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const projectRef = import.meta.env.VITE_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  const supabaseConfigUrl = projectRef
    ? `https://supabase.com/dashboard/project/${projectRef}/auth/url-configuration`
    : 'https://supabase.com/dashboard';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(callbackUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback: select text
    }
  };

  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 right-0 z-[60] bg-[#1B1B1B] text-white shadow-lg"
      >
        {/* Gold top stripe */}
        <div className="h-[2px] bg-gradient-to-r from-[#C9A24D] via-[#E6C882] to-[#C9A24D]" />

        <div className="section-padding py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-3 flex-wrap">
            {/* Icon + label */}
            <div className="flex items-center gap-2.5 shrink-0">
              <ShieldCheck size={15} className="text-[#C9A24D]" strokeWidth={2} />
              <span className="text-xs font-semibold tracking-wide text-white/90">
                Configuración de Google OAuth requerida
              </span>
            </div>

            <div className="hidden sm:block w-px h-4 bg-white/15" />

            {/* Collapsed hint / expanded steps */}
            {!expanded ? (
              <button
                onClick={() => setExpanded(true)}
                className="text-xs text-white/55 hover:text-[#C9A24D] transition-colors underline underline-offset-2"
              >
                ¿Cómo configurarlo?
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <span className="text-xs text-white/60">
                  1. Copiá esta URL →
                </span>

                {/* URL pill with copy */}
                <div className="flex items-center gap-1.5 bg-white/8 rounded-lg px-3 py-1.5 border border-white/12">
                  <code className="text-[11px] text-[#E6C882] font-mono leading-none truncate max-w-[340px]">
                    {callbackUrl}
                  </code>
                  <button
                    onClick={handleCopy}
                    title="Copiar URL"
                    className="ml-1 text-white/50 hover:text-white transition-colors shrink-0"
                  >
                    {copied
                      ? <Check size={13} className="text-emerald-400" strokeWidth={2.5} />
                      : <Copy size={13} strokeWidth={2} />
                    }
                  </button>
                </div>

                <span className="text-xs text-white/60">
                  2. Pegala en Supabase como <strong className="text-white/80">Site URL</strong> y en <strong className="text-white/80">Redirect URLs</strong> →
                </span>

                <a
                  href={supabaseConfigUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#C9A24D] hover:bg-[#A8873A] text-white text-[11px] font-semibold rounded-lg transition-colors shrink-0"
                >
                  Abrir Supabase <ExternalLink size={11} strokeWidth={2.5} />
                </a>

                <span className="text-xs text-white/60">3. Guardá y listo.</span>
              </div>
            )}

            {/* Dismiss */}
            <button
              onClick={onDismiss}
              title="Ocultar"
              className="ml-auto shrink-0 text-white/35 hover:text-white/70 transition-colors"
            >
              <X size={15} strokeWidth={2} />
            </button>
          </div>
        </div>
      </m.div>
    </AnimatePresence>
  );
}
