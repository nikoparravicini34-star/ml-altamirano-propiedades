import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
);

interface GoogleLoginButtonProps {
  variant?: 'navbar' | 'default';
  className?: string;
  onDark?: boolean;
}

export default function GoogleLoginButton({ variant = 'default', className = '', onDark = false }: GoogleLoginButtonProps) {
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setError(null);
    setLoading(true);
    const { error: oauthError } = await loginWithGoogle();
    setLoading(false);
    if (oauthError) setError('No se pudo iniciar sesión. Intentá nuevamente.');
  };

  const baseStyles = variant === 'navbar'
    ? `inline-flex items-center gap-2 px-4 py-2.5 text-[10px] font-semibold tracking-[0.12em] uppercase rounded-xl border transition-all duration-300 ${
        onDark
          ? 'border-accent/50 text-accent hover:bg-accent hover:text-white hover:border-accent shadow-gold'
          : 'border-accent/60 text-accent hover:bg-accent hover:border-accent hover:text-white shadow-soft hover:shadow-gold'
      }`
    : 'btn-primary flex items-center justify-center gap-2.5 w-full';

  return (
    <div className={variant === 'navbar' ? 'relative' : ''}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`${baseStyles} disabled:opacity-60 ${className}`}
      >
        {loading ? (
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        ) : (
          <GoogleIcon />
        )}
        {loading ? 'Conectando...' : 'Iniciar sesión con Google'}
      </button>
      {error && variant !== 'navbar' && (
        <p className="text-xs text-red-500 mt-2 text-center">{error}</p>
      )}
    </div>
  );
}
