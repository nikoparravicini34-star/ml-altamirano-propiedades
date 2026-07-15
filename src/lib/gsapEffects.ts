import { useEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * Subtle cinematic flash / energy pulse for premium CTAs and featured moments.
 * Uses GSAP; no-ops when reduced motion is preferred.
 */
export function useCinematicPulse(trigger: boolean) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!trigger || !overlayRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const el = overlayRef.current;
    const tl = gsap.timeline();
    tl.set(el, { opacity: 0, scale: 0.8 })
      .to(el, { opacity: 0.55, scale: 1.05, duration: 0.25, ease: 'power2.out' })
      .to(el, { opacity: 0, scale: 1.2, duration: 0.55, ease: 'power2.in' });

    return () => {
      tl.kill();
    };
  }, [trigger]);

  return overlayRef;
}

export function runStaggerReveal(selector: string, scope?: HTMLElement | null) {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ctx = scope ?? document;
  const items = ctx.querySelectorAll(selector);
  if (!items.length) return;

  gsap.fromTo(
    items,
    { opacity: 0, y: 28 },
    {
      opacity: 1,
      y: 0,
      duration: 0.55,
      stagger: 0.07,
      ease: 'power3.out',
      clearProps: 'transform',
    }
  );
}
