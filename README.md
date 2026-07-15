# Altamirano Propiedades - Plataforma Inmobiliaria Premium

Plataforma inmobiliaria profesional desarrollada con React, TypeScript, Vite, Tailwind CSS y Supabase.

## Características

- **Sitio público**: Inicio, propiedades, detalle de propiedad, nosotros, contacto
- **Buscador avanzado**: Filtros por operación, tipo, ubicación, precio, dormitorios
- **Panel de administración**: Login, CRUD de propiedades, gestión de fotos, estados
- **WhatsApp integrado**: Botón flotante y contacto directo desde cada propiedad
- **Diseño responsive**: Optimizado para PC, tablet y celular
- **Animaciones suaves**: Transiciones con Framer Motion

## Tecnologías

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- React Router DOM
- Supabase (Base de datos + Auth)
- Lucide React (Iconos)

## Estructura de carpetas

```
src/
  components/
    admin/          # Componentes del panel admin
    layout/         # Navbar, Footer
    property/       # Componentes de propiedades
    ui/             # Componentes reutilizables (cards, botones, etc.)
  context/          # Contextos de React (Auth)
  data/             # Constantes y datos estáticos
  hooks/            # Custom hooks (useProperties)
  lib/              # Utilidades (supabase client)
  pages/
    admin/          # Páginas del panel admin
    public/         # Páginas públicas
  types/            # Tipos TypeScript
```

## Instalación local

1. Clonar el repositorio
2. Instalar dependencias:

```bash
npm install
```

3. Configurar variables de entorno en `.env`:

```
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

4. Ejecutar en modo desarrollo:

```bash
npm run dev
```

## Despliegue

### Frontend (Vercel)

1. Conectar el repositorio a Vercel
2. Configurar variables de entorno en Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Deploy automático en cada push

### Backend (Supabase)

El backend está gestionado por Supabase:
- Base de datos PostgreSQL
- Autenticación
- Row Level Security (RLS)
- Edge Functions (si se necesitan)

## Acceso al panel de administración

1. Crear un usuario en Supabase Auth
2. Acceder a `/admin/login`
3. Inicia=ъr sesión con las credenciales creadas

## Scripts disponibles

- `npm run dev` - Servidor de desarrollo
- `npm run build` - Build de producción
- `npm run preview` - Preview del build
- `npm run typecheck` - Verificación de tipos TypeScript
- `npm run lint` - Linter ESLint

## Datos de contacto configurables

Editar `src/data/constants.ts` para modificar:
- Nombre de la inmobiliaria
- Teléfono y WhatsApp
- Email
- Dirección
- Redes sociales

## Licencia

Proyecto privado - Altamirano Propiedades
