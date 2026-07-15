import { COMPANY_INFO, FEATURES, OFFICE_LOCATION } from '../data/constants';

export interface SiteFeature {
  icon: string;
  title: string;
  description: string;
}

export interface SiteSettings {
  company_name: string;
  company_subtitle: string;
  logo_url: string | null;
  favicon_url: string | null;
  hero_image_url: string;
  hero_badge: string;
  hero_title: string;
  hero_subtitle: string;
  hero_button_sale: string;
  hero_button_rent: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  office_latitude: number | null;
  office_longitude: number | null;
  office_hours_weekdays: string;
  office_hours_saturday: string;
  slogan: string;
  description: string;
  about_title: string;
  about_description: string;
  footer_services: string[];
  social_instagram: string;
  social_facebook: string;
  social_linkedin: string;
  features: SiteFeature[];
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  company_name: COMPANY_INFO.name,
  company_subtitle: 'Propiedades',
  logo_url: null,
  favicon_url: null,
  hero_image_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=80',
  hero_badge: COMPANY_INFO.name,
  hero_title: COMPANY_INFO.slogan,
  hero_subtitle: COMPANY_INFO.slogan,
  hero_button_sale: 'Ver propiedades en venta',
  hero_button_rent: 'Ver propiedades en alquiler',
  phone: COMPANY_INFO.phone,
  whatsapp: COMPANY_INFO.whatsapp,
  email: COMPANY_INFO.email,
  address: OFFICE_LOCATION.address,
  office_latitude: OFFICE_LOCATION.latitude,
  office_longitude: OFFICE_LOCATION.longitude,
  office_hours_weekdays: 'Lunes a Viernes: 9:00 - 18:00',
  office_hours_saturday: 'Sábados: 10:00 - 14:00',
  slogan: COMPANY_INFO.slogan,
  description: COMPANY_INFO.description,
  about_title: 'Sobre Nosotros',
  about_description: 'En Altamirano Propiedades nos dedicamos a conectar personas con el hogar de sus sueños.',
  footer_services: ['Compra de propiedades', 'Alquileres', 'Tasaciones', 'Administración', 'Asesoramiento legal'],
  social_instagram: '',
  social_facebook: '',
  social_linkedin: '',
  features: FEATURES,
};
