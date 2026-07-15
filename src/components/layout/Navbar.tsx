import { useState, useEffect, useRef, memo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogOut, Settings, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NAV_LINKS } from '../../data/constants';
import { useAuth } from '../../context/AuthContext';
import { canShowAdminButton } from '../../lib/roles';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import { useProfileModal } from '../../context/ProfileModalContext';
import GoogleLoginButton from '../ui/GoogleLoginButton';

/**
 * Scroll styles update the DOM directly (no React setState per frame).
 * Backdrop-filter stays FIXED — interpolating blur every frame causes scroll jank.
 * Nav height is constant to avoid layout thrashing.
 */
function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const solidRef = useRef(false);
  const rafRef = useRef(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, profile, logout, role, profileCompleted } = useAuth();
  const { openProfileModal } = useProfileModal();
  const { settings } = useSiteSettings();

  const isHomePage = location.pathname === '/';

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const apply = (y: number) => {
      const solid = !isHomePage || y > 48;

      if (!solid) {
        const t = Math.min(y / 48, 1);
        el.style.backgroundColor = `rgba(27,27,27,${0.45 + t * 0.4})`;
        el.style.boxShadow = 'none';
        el.style.borderBottomColor = `rgba(201,162,77,${0.06 + t * 0.08})`;
        if (solidRef.current) {
          solidRef.current = false;
          el.dataset.solid = '0';
        }
        return;
      }

      if (solidRef.current && isHomePage) return;
      solidRef.current = true;
      el.style.backgroundColor = 'rgba(27,27,27,0.92)';
      el.style.boxShadow = '0 8px 32px rgba(0,0,0,0.35)';
      el.style.borderBottomColor = 'rgba(201,162,77,0.14)';
      el.dataset.solid = '1';
    };

    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        apply(window.scrollY);
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    solidRef.current = false;
    apply(window.scrollY);

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isHomePage]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    navigate('/');
  };

  const goToProfile = (e: React.MouseEvent) => {
    e.preventDefault();
    setProfileOpen(false);
    setIsMobileMenuOpen(false);
    if (profileCompleted) {
      navigate('/perfil');
    } else {
      openProfileModal();
    }
  };

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Usuario';
  const initials = displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const brandInitial = (settings.company_name.trim().charAt(0) || 'A').toUpperCase();
  const brandName = (settings.company_name.split(' ')[0] ?? settings.company_name).toUpperCase();

  return (
    <header
      ref={headerRef}
      className="fixed top-0 left-0 right-0 z-50 border-b navbar-glass"
      style={{
        backgroundColor: isHomePage ? 'rgba(27,27,27,0.45)' : 'rgba(27,27,27,0.92)',
        borderBottomColor: 'rgba(201,162,77,0.08)',
      }}
    >
      <div className="section-padding">
        <nav className="relative flex items-center justify-between h-[72px]">
          <Link to="/" className="flex items-center gap-3 shrink-0">
            {settings.logo_url ? (
              <img
                src={settings.logo_url}
                alt={settings.company_name}
                className="w-9 h-9 rounded-full object-cover border border-accent/40"
              />
            ) : (
              <div className="relative w-9 h-9 rounded-full border border-accent/40 flex items-center justify-center">
                <div className="absolute inset-[3px] rounded-full bg-graphite" />
                <span className="relative z-10 text-accent font-serif font-bold text-sm leading-none">{brandInitial}</span>
              </div>
            )}
            <div className="hidden sm:flex flex-col gap-0.5">
              <span className="text-white font-serif font-bold text-[1.1rem] tracking-[0.1em] leading-none">
                {brandName}
              </span>
              <span className="text-accent text-[8.5px] tracking-[0.42em] uppercase font-medium leading-none">
                {settings.company_subtitle}
              </span>
            </div>
          </Link>

          <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center gap-9">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`relative text-[10.5px] font-semibold tracking-[0.2em] uppercase group py-1 transition-colors duration-300 ${
                    active ? 'text-accent' : 'text-white/75 hover:text-white'
                  }`}
                >
                  {link.label}
                  {active ? (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute -bottom-px left-0 right-0 h-px bg-accent"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  ) : (
                    <span className="absolute -bottom-px left-0 h-px bg-accent w-0 group-hover:w-full transition-[width] duration-300 ease-out" />
                  )}
                </Link>
              );
            })}
          </div>

          <div className="hidden lg:flex items-center gap-5 shrink-0">
            {isAuthenticated ? (
              <>
                {canShowAdminButton(role) && (
                  <Link
                    to="/admin/propiedades"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-[10px] font-semibold tracking-[0.12em] uppercase rounded-xl border border-accent/50 text-accent hover:bg-accent hover:text-white transition-all duration-300"
                  >
                    <Shield size={12} />
                    Panel de Administración
                  </Link>
                )}
                <div ref={profileRef} className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2.5 group"
                  >
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={displayName}
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-accent/40"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full border border-white/20 bg-graphite flex items-center justify-center">
                        <span className="text-accent font-serif font-bold text-xs">{initials}</span>
                      </div>
                    )}
                    <span className="text-[10.5px] font-semibold tracking-wide max-w-[100px] truncate text-white/80">
                      {displayName.split(' ')[0]}
                    </span>
                    <svg
                      className={`text-white/50 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`}
                      width="10" height="10" viewBox="0 0 10 10" fill="none"
                    >
                      <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  <AnimatePresence>
                    {profileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.16 }}
                        className="absolute right-0 top-full mt-3 w-56 bg-graphite rounded-2xl shadow-premium border border-white/10 overflow-hidden z-50"
                      >
                        <div className="px-4 py-3.5 border-b border-white/8">
                          <p className="text-xs font-semibold text-white truncate">{displayName}</p>
                          <p className="text-[10px] text-text-light truncate mt-0.5">{user?.email}</p>
                        </div>
                        <div className="p-1.5">
                          <button
                            type="button"
                            onClick={goToProfile}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs text-white/75 hover:bg-white/5 hover:text-white transition-colors"
                          >
                            <User size={13} strokeWidth={1.75} className="text-accent" />
                            Mi perfil
                          </button>
                          <button
                            type="button"
                            onClick={goToProfile}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs text-white/75 hover:bg-white/5 hover:text-white transition-colors"
                          >
                            <Settings size={13} strokeWidth={1.75} className="text-accent" />
                            Configuración
                          </button>
                          {canShowAdminButton(role) && (
                            <Link
                              to="/admin/propiedades"
                              onClick={() => setProfileOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs text-white/75 hover:bg-white/5 hover:text-white transition-colors"
                            >
                              <Shield size={13} strokeWidth={1.75} className="text-accent" />
                              Panel de administración
                            </Link>
                          )}
                        </div>
                        <div className="p-1.5 border-t border-white/8">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs text-white/55 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                          >
                            <LogOut size={13} strokeWidth={1.75} />
                            Cerrar sesión
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <GoogleLoginButton variant="navbar" onDark />
            )}
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
            className="lg:hidden p-2 text-white"
          >
            {isMobileMenuOpen ? <X size={21} strokeWidth={1.5} /> : <Menu size={21} strokeWidth={1.5} />}
          </button>
        </nav>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="lg:hidden bg-graphite border-t border-white/10 overflow-hidden"
          >
            <div className="section-padding py-7 space-y-0">
              {NAV_LINKS.map((link) => (
                <div key={link.href}>
                  <Link
                    to={link.href}
                    className={`flex items-center justify-between py-3.5 text-[10.5px] font-semibold tracking-[0.2em] uppercase border-b border-white/8 transition-colors ${
                      isActive(link.href) ? 'text-accent' : 'text-white/75 hover:text-accent'
                    }`}
                  >
                    {link.label}
                    {isActive(link.href) && <span className="w-[5px] h-[5px] rounded-full bg-accent shrink-0" />}
                  </Link>
                </div>
              ))}

              <div className="pt-6 pb-1 space-y-3">
                {isAuthenticated ? (
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={goToProfile}
                      className="flex items-center gap-2 text-[10.5px] font-semibold text-white hover:text-accent transition-colors"
                    >
                      <User size={13} strokeWidth={1.75} className="text-accent" />
                      Mi perfil
                    </button>
                    <button onClick={handleLogout} className="text-[10.5px] text-text-light hover:text-red-400 transition-colors">
                      Cerrar sesión
                    </button>
                  </div>
                ) : (
                  <GoogleLoginButton variant="navbar" onDark />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export default memo(Navbar);
