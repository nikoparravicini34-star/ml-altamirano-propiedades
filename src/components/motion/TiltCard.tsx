import {
  memo,
  useRef,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
  type MouseEvent,
} from 'react';

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  intensity?: number;
  glow?: boolean;
  rarity?: 'common' | 'rare' | 'legendary';
}

const rarityGlow: Record<string, string> = {
  common: 'rgba(201, 162, 77, 0.12)',
  rare: 'rgba(96, 165, 250, 0.22)',
  legendary: 'rgba(251, 191, 36, 0.35)',
};

/**
 * Lightweight CSS-transform tilt — rAF-throttled, disabled on touch / reduced motion.
 */
function TiltCard({
  children,
  className = '',
  intensity = 7,
  glow = true,
  rarity = 'common',
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const pendingRef = useRef({ x: 0, y: 0 });
  const [enabled, setEnabled] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setEnabled(finePointer && !reduced);
  }, []);

  const applyTilt = useCallback(() => {
    rafRef.current = 0;
    const el = ref.current;
    if (!el) return;
    const { x, y } = pendingRef.current;
    const rx = (-y * intensity).toFixed(2);
    const ry = (x * intensity).toFixed(2);
    el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
  }, [intensity]);

  const handleMove = useCallback(
    (e: MouseEvent) => {
      if (!enabled) return;
      // Skip tilt work while the page is scrolling — avoids layout thrash mid-wheel
      if (document.documentElement.classList.contains('is-scrolling')) return;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      pendingRef.current = {
        x: (e.clientX - rect.left) / rect.width - 0.5,
        y: (e.clientY - rect.top) / rect.height - 0.5,
      };
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(applyTilt);
      }
    },
    [enabled, applyTilt]
  );

  const handleLeave = useCallback(() => {
    setHovered(false);
    pendingRef.current = { x: 0, y: 0 };
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    const el = ref.current;
    if (el) el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)';
  }, []);

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    []
  );

  return (
    <div
      ref={ref}
      onMouseMove={enabled ? handleMove : undefined}
      onMouseEnter={enabled ? () => setHovered(true) : undefined}
      onMouseLeave={enabled ? handleLeave : undefined}
      className={`relative transition-transform duration-150 ease-out will-change-transform ${className}`}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {glow && hovered && (
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-px rounded-[inherit]"
          style={{
            boxShadow: `0 0 36px ${rarityGlow[rarity]}, 0 16px 40px rgba(0,0,0,0.4)`,
          }}
        />
      )}
      <div className="relative h-full overflow-hidden rounded-[inherit]">{children}</div>
    </div>
  );
}

export default memo(TiltCard);
