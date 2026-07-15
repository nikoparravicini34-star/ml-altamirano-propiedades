/** Helpers for Supabase Storage URLs and media validation. */

export const AVATAR_MAX_SIZE = 2 * 1024 * 1024;
export const SITE_ASSET_MAX_SIZE = 10 * 1024 * 1024;

export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'image/avif',
  'image/tiff',
] as const;

export const VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-m4v',
  'video/x-matroska',
  'video/ogg',
] as const;

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'avif', 'tif', 'tiff', 'svg', 'ico']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'avi', 'm4v', 'mkv', 'ogv']);

const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
  avif: 'image/avif',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  m4v: 'video/x-m4v',
  mkv: 'video/x-matroska',
  ogv: 'video/ogg',
};

/** Files above this threshold use TUS resumable uploads (Supabase recommendation). */
export const RESUMABLE_UPLOAD_THRESHOLD = 6 * 1024 * 1024;

export type StorageRef = { bucket: string; path: string };

/** Parse a Supabase public storage URL into bucket + object path. */
export function parseStorageUrl(url: string): StorageRef | null {
  try {
    const u = new URL(url);
    const marker = '/storage/v1/object/public/';
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;
    const rest = u.pathname.slice(idx + marker.length);
    const slash = rest.indexOf('/');
    if (slash === -1) return null;
    return {
      bucket: rest.slice(0, slash),
      path: decodeURIComponent(rest.slice(slash + 1)),
    };
  } catch {
    return null;
  }
}

export function isSupabaseStorageUrl(url: string): boolean {
  return parseStorageUrl(url) !== null;
}

export function isUploadedVideo(url: string): boolean {
  const ref = parseStorageUrl(url);
  return ref?.bucket === 'property-videos';
}

function extensionOf(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? '';
}

function isAllowedImage(file: File): boolean {
  if (IMAGE_MIME_TYPES.includes(file.type as (typeof IMAGE_MIME_TYPES)[number])) return true;
  return IMAGE_EXTENSIONS.has(extensionOf(file.name));
}

function isAllowedVideo(file: File): boolean {
  if (VIDEO_MIME_TYPES.includes(file.type as (typeof VIDEO_MIME_TYPES)[number])) return true;
  return VIDEO_EXTENSIONS.has(extensionOf(file.name));
}

export function resolveContentType(file: File): string {
  if (file.type && file.type !== 'application/octet-stream') return file.type;
  const ext = extensionOf(file.name);
  return EXT_TO_MIME[ext] ?? 'application/octet-stream';
}

export function validateImageFile(file: File): string | null {
  if (!isAllowedImage(file)) {
    return 'Formato no válido. Usá JPG, PNG, WebP, GIF, HEIC, AVIF o TIFF.';
  }
  return null;
}

export function validateSiteAssetFile(file: File): string | null {
  const imageError = validateImageFile(file);
  if (imageError) return imageError;
  if (file.size > SITE_ASSET_MAX_SIZE) {
    return `El archivo es demasiado grande (máx. ${formatFileSize(SITE_ASSET_MAX_SIZE)}).`;
  }
  return null;
}

export function validateAvatarFile(file: File): string | null {
  const imageError = validateImageFile(file);
  if (imageError) return imageError;
  if (file.size > AVATAR_MAX_SIZE) {
    return `La imagen no puede superar los ${formatFileSize(AVATAR_MAX_SIZE)}.`;
  }
  return null;
}

export function validateVideoFile(file: File): string | null {
  if (!isAllowedVideo(file)) {
    return 'Formato no válido. Usá MP4, WebM, MOV, AVI, M4V o MKV.';
  }
  return null;
}

/** Turn Supabase / storage errors into user-facing Spanish messages. */
export function formatUploadError(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error);

  const lower = raw.toLowerCase();
  if (lower.includes('bucket not found') || (lower.includes('not found') && lower.includes('bucket'))) {
    return 'El almacenamiento no está configurado. Ejecutá npm run setup:db con SUPABASE_SERVICE_ROLE_KEY en .env.';
  }
  if (lower.includes('row-level security') || lower.includes('policy') || lower.includes('permission')) {
    return 'No tenés permiso para subir archivos. Iniciá sesión con Google e intentá de nuevo.';
  }
  if (lower.includes('payload too large') || lower.includes('file size') || lower.includes('413')) {
    return 'El archivo supera el tamaño permitido por el servidor.';
  }
  if (lower.includes('mime') || lower.includes('content type') || lower.includes('invalid file type')) {
    return 'Formato de archivo no permitido por el servidor.';
  }
  if (lower.includes('iniciar sesión') || lower.includes('jwt') || lower.includes('not authenticated')) {
    return 'Debes iniciar sesión para subir archivos.';
  }
  return raw || 'Error desconocido al subir el archivo';
}

export function fileExtension(name: string, fallback: string): string {
  const ext = extensionOf(name);
  return ext && ext.length <= 5 ? ext : fallback;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
