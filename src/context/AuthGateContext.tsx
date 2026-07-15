import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { m, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useAuth, type LoginWithGoogleError } from './AuthContext';

export interface AuthGateOptions {
  title?: string;
  description?: string;
}

interface AuthGateContextType {
  openAuthGate: (options?: AuthGateOptions) => void;
}

const AuthGateContext = createContext<AuthGateContextType | undefined>(undefined);

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
);

const DEFAULT_AUTH_GATE = {
  title: 'Iniciá sesión para continuar',
  description: 'Para ver las propiedades de Altamirano, iniciá sesión con tu cuenta de Google.',
};

export function AuthGateProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [gateCopy, setGateCopy] = useState(DEFAULT_AUTH_GATE);
  const [loginError, setLoginError] = useState<LoginWithGoogleError | null>(null);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, loginWithGoogle } = useAuth();

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (isAuthenticated && isOpen) setIsOpen(false);
  }, [isAuthenticated, isOpen]);

  const openAuthGate = useCallback((options?: AuthGateOptions) => {
    setLoginError(null);
    setGateCopy({
      title: options?.title ?? DEFAULT_AUTH_GATE.title,
      description: options?.description ?? DEFAULT_AUTH_GATE.description,
    });
    setIsOpen(true);
  }, []);

  const handleClose = () => setIsOpen(false);

  const handleGoogle = async () => {
    setLoginError(null);
    setLoading(true);
    const { error } = await loginWithGoogle();
    setLoading(false);
    if (error) setLoginError(error);
    // On success, loginWithGoogle triggers a full-page browser redirect — no
    // further state update is needed here.
  };

  /*
   * The backdrop is a plain <div> — framer-motion adds CSS `transform` even for
   * opacity-only animations, which creates a new stacking context that silently
   * breaks `position:fixed` on children. We animate only the card inside.
   */
  const modal = (
    <AnimatePresence>
      {isOpen && (
        <div
          key="auth-gate-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            boxSizing: 'border-box',
            backgroundColor: 'rgba(18, 18, 18, 0.72)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}
          onClick={handleClose}
        >
          <m.div
            key="auth-gate-card"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: '100%', maxWidth: '420px', flexShrink: 0, position: 'relative' }}
            className="bg-graphite rounded-3xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-[3px] bg-gradient-to-r from-[#C9A24D] via-[#E6C882] to-[#C9A24D]" />

            <button
              onClick={handleClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-metallic/50 text-text-light hover:bg-metallic hover:text-white transition-colors z-10"
              aria-label="Cerrar"
            >
              <X size={14} strokeWidth={2.5} />
            </button>

            <div className="px-9 pt-8 pb-9 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary border border-accent/30 flex items-center justify-center mx-auto mb-5 shadow-premium">
                <span className="text-accent font-serif font-bold text-xl leading-none">A</span>
              </div>

              <h2 className="font-serif text-2xl font-bold text-white mb-2">
                {gateCopy.title}
              </h2>
              <p className="text-text-light text-sm leading-relaxed mb-7 max-w-[280px] mx-auto">
                {gateCopy.description}
              </p>

              {loginError === 'oauth_error' && (
                <div className="mb-5 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-left">
                  <p className="text-xs font-semibold text-red-600">No se pudo iniciar sesión con Google</p>
                  <p className="text-xs text-red-500 mt-0.5">
                    Verificá que Google OAuth esté habilitado en Supabase → Authentication → Providers.
                  </p>
                </div>
              )}

              <button
                onClick={handleGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-[#1B1B1B] hover:bg-[#1a1a1a] disabled:opacity-60 text-white py-3.5 rounded-2xl font-semibold text-sm tracking-wide transition-all duration-200 shadow-md hover:shadow-lg"
              >
                {loading ? (
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <GoogleIcon />
                )}
                {loading ? 'Redirigiendo a Google...' : 'Iniciar sesión con Google'}
              </button>

              <p className="text-[10.5px] text-[#ccc] mt-5">
                Al continuar aceptás nuestros términos de uso y política de privacidad.
              </p>
            </div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <AuthGateContext.Provider value={{ openAuthGate }}>
      {children}
      {createPortal(modal, document.body)}
    </AuthGateContext.Provider>
  );
}

export function useAuthGate() {
  const context = useContext(AuthGateContext);
  if (!context) throw new Error('useAuthGate must be used within AuthGateProvider');
  return context;
}
