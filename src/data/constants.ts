export const COMPANY_INFO = {
  name: 'Altamirano Propiedades',
  phone: '+54 11 1234-5678',
  whatsapp: '5491112345678',
  email: 'info@altamiranopropiedades.com.ar',
  address: 'Escobar, Buenos Aires, Argentina',
  slogan: 'Encontrá la propiedad ideal para vivir, invertir o alquilar.',
  description: 'Somos una inmobiliaria comprometida en ayudarle a encontrar la propiedad que estás buscando. Trabajamos con transparencia, profesionalismo y dedicación para que tomes la mejor decisión.',
};

export const OFFICE_LOCATION = {
  address: COMPANY_INFO.address,
  latitude: -34.3489,
  longitude: -58.8006,
};

export const NAV_LINKS = [
  { label: 'Inicio', href: '/' },
  { label: 'Propiedades', href: '/propiedades' },
  { label: 'Nosotros', href: '/nosotros' },
  { label: 'Contacto', href: '/contacto' },
];

export const PROPERTY_TYPES = [
  'Casa',
  'Departamento',
  'Lote',
  'PH',
  'Oficina',
  'Local',
  'Quinta',
  'Campo',
];

export const CURRENCIES = ['USD', 'ARS'];

export const OPERATIONS = [
  { value: 'venta', label: 'Venta' },
  { value: 'alquiler', label: 'Alquiler' },
];

export const STATUS_OPTIONS = [
  { value: 'disponible', label: 'Disponible' },
  { value: 'reservada', label: 'Reservada' },
  { value: 'vendida', label: 'Vendida' },
  { value: 'alquilada', label: 'Alquilada' },
];

export const FEATURES = [
  {
    icon: 'Users',
    title: 'Asesoramiento',
    description: 'Te acompañamos en todo el proceso de compra o alquiler.',
  },
  {
    icon: 'Shield',
    title: 'Confianza',
    description: 'Más de 10 años de experiencia en el mercado inmobiliario.',
  },
  {
    icon: 'TrendingUp',
    title: 'Transparencia',
    description: 'Información clara y precisa en cada operación.',
  },
  {
    icon: 'Heart',
    title: 'Compromiso',
    description: 'Nuestro objetivo es encontrar lo mejor para vos.',
  },
];
