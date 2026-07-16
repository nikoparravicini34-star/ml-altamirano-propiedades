import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SCROLL_PREFIX = 'altamirano:scroll:';

function scrollStorageKey(pathname: string, search: string): string {
  return `${SCROLL_PREFIX}${pathname}${search}`;
}

function getCurrentScrollY(): number {
  const lenis = window.__lenis;
  if (lenis && typeof lenis.scroll === 'number') {
    return lenis.scroll;
  }
  return window.scrollY;
}

function setScrollY(y: number): void {
  const lenis = window.__lenis;
  if (lenis) {
    lenis.scrollTo(y, { immediate: true, force: true });
    return;
  }
  window.scrollTo({ top: y, behavior: 'auto' });
}

function saveScrollPosition(pathname: string, search: string): void {
  try {
    sessionStorage.setItem(scrollStorageKey(pathname, search), String(getCurrentScrollY()));
  } catch {
    /* ignore */
  }
}

function restoreScrollPosition(pathname: string, search: string): void {
  try {
    const raw = sessionStorage.getItem(scrollStorageKey(pathname, search));
    if (!raw) return;

    const y = Number.parseFloat(raw);
    if (!Number.isFinite(y) || y < 0) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => setScrollY(y));
    });
  } catch {
    /* ignore */
  }
}

/**
 * Preserves scroll position when the user switches tabs or minimizes the browser.
 * Uses sessionStorage (not localStorage) — separate from form draft persistence.
 */
export function useScrollRestoration(): void {
  const location = useLocation();
  const routeKey = `${location.pathname}${location.search}`;

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveScrollPosition(location.pathname, location.search);
      } else if (document.visibilityState === 'visible') {
        restoreScrollPosition(location.pathname, location.search);
      }
    };

    const onPageHide = () => {
      saveScrollPosition(location.pathname, location.search);
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      saveScrollPosition(location.pathname, location.search);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [routeKey, location.pathname, location.search]);
}
