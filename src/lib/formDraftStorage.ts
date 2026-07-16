const DRAFT_PREFIX = 'altamirano:form-draft:';
const MAX_DRAFT_AGE_MS = 7 * 24 * 60 * 60 * 1000;

interface StoredDraft<T> {
  data: T;
  savedAt: number;
}

export function buildFormDraftKey(parts: string[]): string {
  return DRAFT_PREFIX + parts.filter(Boolean).join(':');
}

export function saveFormDraft<T>(key: string, data: T): void {
  try {
    const envelope: StoredDraft<T> = { data, savedAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(envelope));
  } catch (err) {
    console.warn('No se pudo guardar el borrador del formulario:', err);
  }
}

export function loadFormDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const envelope = JSON.parse(raw) as StoredDraft<T>;
    if (!envelope?.data || typeof envelope.savedAt !== 'number') {
      localStorage.removeItem(key);
      return null;
    }

    if (Date.now() - envelope.savedAt > MAX_DRAFT_AGE_MS) {
      localStorage.removeItem(key);
      return null;
    }

    return envelope.data;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export function clearFormDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
