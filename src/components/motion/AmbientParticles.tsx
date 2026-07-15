import { memo, useMemo } from 'react';

interface AmbientParticlesProps {
  count?: number;
  className?: string;
}

/**
 * CSS-only ambient particles — no Framer Motion infinite loops.
 * Glow orbs use lighter blur + pause while scrolling (html.is-scrolling).
 */
function AmbientParticles({ count = 10, className = '' }: AmbientParticlesProps) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: `${(i * 37) % 100}%`,
        size: 1.5 + (i % 3) * 0.7,
        duration: 16 + (i % 6) * 2.5,
        delay: (i % 8) * 0.85,
        opacity: 0.1 + (i % 4) * 0.06,
        drift: (i % 2 === 0 ? 1 : -1) * (12 + (i % 5) * 6),
      })),
    [count]
  );

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ambient-particles ${className}`}
      aria-hidden
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(201,162,77,0.06),transparent_55%)]" />
      {/* Lighter blur (40px) — still premium glow, far cheaper than 80–90px during scroll */}
      <div className="ambient-orb absolute -top-24 left-1/4 h-48 w-48 rounded-full bg-accent/10 blur-[40px]" />
      <div className="ambient-orb ambient-orb-delayed absolute bottom-0 right-1/5 h-56 w-56 rounded-full bg-accent/8 blur-[48px]" />
      {particles.map((p) => (
        <span
          key={p.id}
          className="ambient-particle absolute rounded-full bg-accent-light/80"
          style={{
            left: p.left,
            bottom: '-4%',
            width: p.size,
            height: p.size,
            ['--particle-opacity' as string]: p.opacity,
            ['--particle-drift' as string]: `${p.drift}px`,
            ['--particle-duration' as string]: `${p.duration}s`,
            ['--particle-delay' as string]: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

export default memo(AmbientParticles);
