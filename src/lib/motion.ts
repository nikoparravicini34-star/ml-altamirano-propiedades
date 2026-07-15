import type { Transition, Variants } from 'framer-motion';

/** GPU-friendly easing — transform/opacity only */
export const ease = {
  out: [0.16, 1, 0.3, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
  soft: [0.25, 0.1, 0.25, 1] as const,
  spring: { type: 'spring' as const, stiffness: 280, damping: 28, mass: 0.8 },
  springSoft: { type: 'spring' as const, stiffness: 180, damping: 24 },
};

export const transition: Record<string, Transition> = {
  base: { duration: 0.45, ease: ease.out },
  fast: { duration: 0.24, ease: ease.out },
  slow: { duration: 0.65, ease: ease.out },
  page: { duration: 0.22, ease: ease.out },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: transition.base },
};

export const fadeDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: transition.base },
};

export const fadeLeft: Variants = {
  hidden: { opacity: 0, x: -28 },
  visible: { opacity: 1, x: 0, transition: transition.base },
};

export const fadeRight: Variants = {
  hidden: { opacity: 0, x: 28 },
  visible: { opacity: 1, x: 0, transition: transition.base },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: transition.base },
};

/** Soft enter without CSS filter blur (expensive) */
export const blurIn: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transition.slow,
  },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.08 },
  },
};

export const staggerFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.04 },
  },
};

/** Page transitions: opacity + slight translate only */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: transition.page,
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.18, ease: ease.inOut },
  },
};

export const viewportOnce = { once: true, amount: 0.12, margin: '0px 0px -60px 0px' } as const;
