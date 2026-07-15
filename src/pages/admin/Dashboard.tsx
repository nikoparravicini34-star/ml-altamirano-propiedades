import { useState } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import {
  Building2, LogOut, Menu, X, Users, Settings, Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  canAccessAdminPanel, canManageUsers, canManageInquiries,
  canDeleteProperties, canManageSiteSettings, canManageProperties,
} from '../../lib/roles';
import AccessDenied from '../../components/ui/AccessDenied';
import PropertiesList from '../../components/admin/PropertiesList';
import PropertyForm from '../../components/admin/PropertyForm';
import UsersList from '../../components/admin/UsersList';
import InquiriesList from '../../components/admin/InquiriesList';
import SiteSettingsForm from '../../components/admin/SiteSettingsForm';
import PropertyAI from './PropertyAI';

function StaffRoute({ children, allowed }: { children: React.ReactNode; allowed: boolean }) {
  if (!allowed) return <AccessDenied />;
  return <>{children}</>;
}

export default function Dashboard() {
  const { logout, isAuthenticated, isLoading, role } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (!canAccessAdminPanel(role)) return <AccessDenied />;

  const navItems = [
    ...(canManageProperties(role) ? [
      { label: 'Propiedades', href: '/admin/propiedades', icon: <Building2 size={20} /> },
      { label: 'IA Inmobiliaria', href: '/admin/ia-inmobiliaria', icon: <Sparkles size={20} /> },
    ] : []),
    ...(canManageSiteSettings(role) ? [
      { label: 'Configuración del sitio', href: '/admin/sitio', icon: <Settings size={20} /> },
    ] : []),
    ...(canManageUsers(role) ? [
      { label: 'Usuarios', href: '/admin/usuarios', icon: <Users size={20} /> },
    ] : []),
  ];

  const activeHref = navItems
    .filter(
      item =>
        location.pathname === item.href ||
        location.pathname.startsWith(`${item.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  const isActive = (href: string) => activeHref === href;

  return (
    <div className="admin-panel min-h-screen bg-surface flex">
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-graphite rounded-lg shadow-soft flex items-center justify-center"
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-graphite text-white z-40 transition-transform duration-300 lg:translate-x-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-6">
          <Link to="/" className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
              <span className="font-serif font-bold text-lg text-accent">A</span>
            </div>
            <div>
              <span className="font-serif font-bold text-lg">ALTAMIRANO</span>
              <span className="block text-[10px] tracking-widest uppercase text-white/60">Admin</span>
            </div>
          </Link>

          <nav className="space-y-1">
            {navItems.map(item => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`admin-nav-link ${
                  isActive(item.href)
                    ? 'admin-nav-link--active'
                    : 'admin-nav-link--inactive'
                }`}
              >
                {item.icon}
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6">
          <button onClick={() => logout()} className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors w-full">
            <LogOut size={20} />
            <span className="text-sm font-medium">Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <main className="flex-1 min-h-screen">
        <div className="p-6 lg:p-10">
          <Routes>
            <Route path="/" element={<Navigate to="/admin/propiedades" replace />} />
            <Route path="/propiedades" element={<PropertiesList canDelete={canDeleteProperties(role)} />} />
            <Route path="/propiedades/nueva" element={<PropertyForm />} />
            <Route path="/propiedades/editar/:id" element={<PropertyForm />} />
            <Route path="/ia-inmobiliaria" element={
              <StaffRoute allowed={canManageProperties(role)}><PropertyAI /></StaffRoute>
            } />
            <Route path="/sitio" element={
              <StaffRoute allowed={canManageSiteSettings(role)}><SiteSettingsForm /></StaffRoute>
            } />
            <Route path="/usuarios" element={
              <StaffRoute allowed={canManageUsers(role)}><UsersList /></StaffRoute>
            } />
            <Route path="/consultas" element={
              <StaffRoute allowed={canManageInquiries(role)}><InquiriesList /></StaffRoute>
            } />
          </Routes>
        </div>
      </main>
    </div>
  );
}
