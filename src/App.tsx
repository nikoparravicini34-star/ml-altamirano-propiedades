import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Outlet } from 'react-router-dom';
import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProfileModalProvider } from './context/ProfileModalContext';
import { AuthGateProvider } from './context/AuthGateContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { SiteSettingsProvider } from './context/SiteSettingsContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import WhatsAppButton from './components/ui/WhatsAppButton';
import CompleteProfileModal from './components/ui/CompleteProfileModal';
import LoadingSpinner from './components/ui/LoadingSpinner';
import { useSmoothScroll, scrollToTop } from './hooks/useSmoothScroll';
import { pageVariants } from './lib/motion';
import { getOAuthCallbackSnapshot, logAuthDebug } from './lib/authDebug';

const Home = lazy(() => import('./pages/public/Home'));
const Properties = lazy(() => import('./pages/public/Properties'));
const PropertyDetail = lazy(() => import('./pages/public/PropertyDetail'));
const About = lazy(() => import('./pages/public/About'));
const Contact = lazy(() => import('./pages/public/Contact'));
const UserProfile = lazy(() => import('./pages/public/UserProfile'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));

function PageFallback() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}

function PublicLayout() {
  const location = useLocation();
  const pageKey = location.pathname;

  useEffect(() => {
    scrollToTop(true);
  }, [pageKey]);

  return (
    <>
      <Navbar />
      <AnimatePresence mode="wait" initial={false}>
        <m.main
          key={pageKey}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="min-h-screen will-change-[opacity,transform]"
          style={{ transform: 'translateZ(0)' }}
        >
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </m.main>
      </AnimatePresence>
      <Footer />
      <WhatsAppButton />
    </>
  );
}

function OAuthRedirectHandler() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;
    const hasOAuthParams =
      hash.includes('access_token') ||
      hash.includes('error=') ||
      search.includes('code=') ||
      search.includes('error=');

    if (!hasOAuthParams) return;

    logAuthDebug('OAuthRedirectHandler — params detected', getOAuthCallbackSnapshot());

    const authSettled = !isLoading;
    const shouldClean =
      authSettled &&
      (isAuthenticated || search.includes('error=') || hash.includes('error='));

    if (shouldClean) {
      const cleanUrl = `${window.location.origin}${window.location.pathname}`;
      window.history.replaceState(null, '', cleanUrl);
    }
  }, [isAuthenticated, isLoading, location.pathname, location.search, location.hash]);

  return null;
}

function AppRoutes() {
  useSmoothScroll();

  return (
    <>
      <OAuthRedirectHandler />
      <CompleteProfileModal />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/propiedades" element={<Properties />} />
          <Route path="/propiedad/:id" element={<PropertyDetail />} />
          <Route path="/nosotros" element={<About />} />
          <Route path="/contacto" element={<Contact />} />
          <Route path="/perfil" element={<UserProfile />} />
        </Route>
        <Route
          path="/admin/*"
          element={
            <Suspense fallback={<PageFallback />}>
              <Dashboard />
            </Suspense>
          }
        />
      </Routes>
    </>
  );
}

function App() {
  return (
    <LazyMotion features={domAnimation}>
      <BrowserRouter>
        <AuthProvider>
          <SiteSettingsProvider>
            <ProfileModalProvider>
              <AuthGateProvider>
                <FavoritesProvider>
                  <AppRoutes />
                </FavoritesProvider>
              </AuthGateProvider>
            </ProfileModalProvider>
          </SiteSettingsProvider>
        </AuthProvider>
      </BrowserRouter>
    </LazyMotion>
  );
}

export default App;
