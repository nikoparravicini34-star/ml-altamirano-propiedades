import { useEffect, useRef, useCallback, useState } from 'react';
import { saveFormDraft, loadFormDraft, clearFormDraft } from '../lib/formDraftStorage';

interface UseFormDraftOptions<T> {
  enabled?: boolean;
  debounceMs?: number;
  onRestore?: (draft: T) => void;
  isEmpty?: (value: T) => boolean;
}

export function useFormDraft<T>(
  draftKey: string,
  value: T,
  options: UseFormDraftOptions<T> = {},
): { clearDraft: () => void; draftRestored: boolean } {
  const {
    enabled = true,
    debounceMs = 400,
    onRestore,
    isEmpty,
  } = options;

  const restoredRef = useRef(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const onRestoreRef = useRef(onRestore);
  onRestoreRef.current = onRestore;

  useEffect(() => {
    if (!enabled || restoredRef.current) return;

    const draft = loadFormDraft<T>(draftKey);
    if (draft != null) {
      onRestoreRef.current?.(draft);
      restoredRef.current = true;
      setDraftRestored(true);
    }
  }, [draftKey, enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (isEmpty?.(value)) return;

    const timer = window.setTimeout(() => {
      saveFormDraft(draftKey, value);
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [draftKey, value, enabled, debounceMs, isEmpty]);

  const clearDraft = useCallback(() => {
    clearFormDraft(draftKey);
    restoredRef.current = false;
    setDraftRestored(false);
  }, [draftKey]);

  return { clearDraft, draftRestored };
}
