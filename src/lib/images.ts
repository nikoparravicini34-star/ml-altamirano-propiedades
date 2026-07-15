/**
 * Image URL helpers — Unsplash supports w/q/fm/auto for lighter payloads.
 * Prefer modern formats (AVIF/WebP via auto=format) and responsive srcsets.
 */

export function optimizeImageUrl(
  url: string | null | undefined,
  opts: { width?: number; quality?: number } = {}
): string {
  const fallback =
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=70&auto=format&fit=crop';
  if (!url) return fallback;

  const { width = 800, quality = 72 } = opts;

  try {
    if (url.includes('images.unsplash.com')) {
      const u = new URL(url);
      u.searchParams.set('w', String(width));
      u.searchParams.set('q', String(quality));
      u.searchParams.set('auto', 'format');
      u.searchParams.set('fit', 'crop');
      return u.toString();
    }
  } catch {
    /* keep original */
  }

  return url;
}

/** Responsive srcset for Unsplash (and passthrough for others) */
export function buildSrcSet(
  url: string | null | undefined,
  widths: number[] = [400, 640, 960, 1280],
  quality = 70
): string | undefined {
  if (!url || !url.includes('images.unsplash.com')) return undefined;
  return widths
    .map((w) => `${optimizeImageUrl(url, { width: w, quality })} ${w}w`)
    .join(', ');
}
