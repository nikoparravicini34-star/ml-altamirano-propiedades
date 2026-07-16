export type MediaItem = {
  url: string;
  type: 'photo' | 'video';
  /** Global display position (1-based). Falls back to list index when omitted. */
  displayOrder?: number;
};

export function annotateDisplayOrder(items: MediaItem[]): MediaItem[] {
  return items.map((item, index) => ({
    ...item,
    displayOrder: index + 1,
  }));
}

export function reorderArray<T>(array: T[], fromIndex: number, toIndex: number): T[] {
  const result = [...array];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result;
}

/** Build a unified ordered list from photos, videos and optional persisted order. */
export function buildMediaItems(
  photos: string[],
  videos: string[],
  mediaOrder?: string[],
): MediaItem[] {
  const photoSet = new Set(photos);
  const videoSet = new Set(videos);

  if (mediaOrder?.length) {
    const ordered = mediaOrder
      .filter((url) => photoSet.has(url) || videoSet.has(url))
      .map((url) => ({
        url,
        type: photoSet.has(url) ? ('photo' as const) : ('video' as const),
      }));

    const orderedSet = new Set(mediaOrder);
    const trailing = [
      ...photos.filter((url) => !orderedSet.has(url)).map((url) => ({ url, type: 'photo' as const })),
      ...videos.filter((url) => !orderedSet.has(url)).map((url) => ({ url, type: 'video' as const })),
    ];

    return [...ordered, ...trailing];
  }

  return [
    ...photos.map((url) => ({ url, type: 'photo' as const })),
    ...videos.map((url) => ({ url, type: 'video' as const })),
  ];
}

/** Split unified list back into typed arrays and global order (index = display position). */
export function splitMediaItems(items: MediaItem[]): {
  photos: string[];
  videos: string[];
  mediaOrder: string[];
} {
  return {
    photos: items.filter((item) => item.type === 'photo').map((item) => item.url),
    videos: items.filter((item) => item.type === 'video').map((item) => item.url),
    mediaOrder: items.map((item) => item.url),
  };
}

/** Recompute media_order after partial updates while preserving known positions. */
export function syncMediaOrder(
  photos: string[],
  videos: string[],
  previousOrder?: string[],
): string[] {
  const allUrls = new Set([...photos, ...videos]);

  if (previousOrder?.length) {
    const kept = previousOrder.filter((url) => allUrls.has(url));
    const keptSet = new Set(kept);
    const added = [...photos, ...videos].filter((url) => !keptSet.has(url));
    return [...kept, ...added];
  }

  return [...photos, ...videos];
}

/** Reorder one media type while preserving cross-type positions in the unified list. */
export function mergeReorderedType(
  items: MediaItem[],
  type: 'photo' | 'video',
  reorderedUrls: string[],
): { photos: string[]; videos: string[]; mediaOrder: string[] } {
  const queue = [...reorderedUrls];
  const merged = items.map((item) =>
    item.type === type ? { url: queue.shift()!, type } : item,
  );
  return splitMediaItems(merged);
}
