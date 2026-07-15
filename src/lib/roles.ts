import type { UserRole } from '../types';

export const SUPER_ADMIN_EMAIL = 'nikoparravicini34@gmail.com';

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Administrador',
  admin: 'Administrador',
  editor: 'Editor',
  agent: 'Agente Inmobiliario',
  user: 'Usuario',
};

export const ASSIGNABLE_ROLES: UserRole[] = ['user', 'agent', 'editor', 'admin', 'super_admin'];

export function isStaff(role: UserRole | null | undefined): boolean {
  return role === 'super_admin' || role === 'admin' || role === 'editor' || role === 'agent';
}

export function isAdminOrAbove(role: UserRole | null | undefined): boolean {
  return role === 'super_admin' || role === 'admin';
}

export function isSuperAdmin(role: UserRole | null | undefined): boolean {
  return role === 'super_admin';
}

/** Navbar "Panel de Administración" — super admin + admin only */
export function canShowAdminButton(role: UserRole | null | undefined): boolean {
  return isAdminOrAbove(role);
}

export function canAccessAdminPanel(role: UserRole | null | undefined): boolean {
  return isStaff(role);
}

export function canManageSiteSettings(role: UserRole | null | undefined): boolean {
  return isAdminOrAbove(role);
}

export function canManageUsers(role: UserRole | null | undefined): boolean {
  return isAdminOrAbove(role);
}

export function canChangeRoles(role: UserRole | null | undefined): boolean {
  return role === 'super_admin';
}

export function canDeleteProperties(role: UserRole | null | undefined): boolean {
  return isAdminOrAbove(role);
}

export function canManageInquiries(role: UserRole | null | undefined): boolean {
  return isAdminOrAbove(role) || role === 'agent';
}

export function canManageProperties(role: UserRole | null | undefined): boolean {
  return isStaff(role);
}

export function resolveRoleForEmail(email: string | undefined, currentRole?: UserRole): UserRole {
  if (email && email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) return 'super_admin';
  return currentRole ?? 'user';
}
