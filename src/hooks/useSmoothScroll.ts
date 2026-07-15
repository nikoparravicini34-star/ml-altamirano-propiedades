import { useEffect } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

declare global {
  interface Window {
    __lenis?: Lenis | null;
  }
}

/**
 * Professional smooth scrolling via Lenis.
 * Replaces CSS scroll-behavior (which fights the mouse wheel and causes stutter).
 */
export function useSmoothScroll() {
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      document.documentElement.style.scrollBehavior = 'auto';
      return;
    }

    // Lenis owns smooth scrolling — native CSS smooth causes wheel jank
    document.documentElement.style.scrollBehavior = 'auto';
    document.documentElement.classList.add('lenis');

    const lenis = new Lenis({
      // Lerp-based inertia feels smoother with mouse wheel than duration easing
      lerp: 0.085,
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.15,
      infinite: false,
      autoRaf: false,
    });

    window.__lenis = lenis;

    let rafId = 0;
    let scrollIdleTimer = 0;
    let isScrolling = false;

    const markScrolling = () => {
      if (!isScrolling) {
        isScrolling = true;
        document.documentElement.classList.add('is-scrolling');
      }
      window.clearTimeout(scrollIdleTimer);
      scrollIdleTimer = window.setTimeout(() => {
        isScrolling = false;
        document.documentElement.classList.remove('is-scrolling');
      }, 140);
    };

    lenis.on('scroll', markScrolling);

    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    const onAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.('a[href^="#"]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const id = anchor.getAttribute('href');
      if (!id || id === '#') return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el as HTMLElement, { offset: -80 });
    };
    document.addEventListener('click', onAnchorClick);

    return () => {
      document.removeEventListener('click', onAnchorClick);
      cancelAnimationFrame(rafId);
      window.clearTimeout(scrollIdleTimer);
      document.documentElement.classList.remove('is-scrolling', 'lenis');
      lenis.destroy();
      window.__lenis = null;
    };
  }, []);
}

/** Scroll to top smoothly (route changes) */
export function scrollToTop(immediate = false) {
  const lenis = window.__lenis;
  if (lenis) {
    lenis.scrollTo(0, { immediate, force: true });
  } else {
    window.scrollTo({ top: 0, behavior: immediate ? 'auto' : 'smooth' });
  }
}
