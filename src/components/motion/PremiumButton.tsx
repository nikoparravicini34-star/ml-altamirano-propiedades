import { memo, useRef, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'outline' | 'energy';

interface PremiumButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: ReactNode;
  variant?: Variant;
  className?: string;
}

const variantClass: Record<Variant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  outline: 'btn-outline',
  energy: 'btn-energy',
};

function PremiumButton({
  children,
  variant = 'primary',
  className = '',
  onClick,
  disabled,
  type = 'button',
}: PremiumButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);

  const spawnRipple = (e: MouseEvent<HTMLButtonElement>) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const btn = ref.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const ripple = document.createElement('span');
    ripple.className = 'btn-ripple';
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  };

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    spawnRipple(e);
    onClick?.(e);
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      onClick={handleClick}
      className={`${variantClass[variant]} btn-ripple-host hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] transition-transform duration-250 ease-out ${className}`}
      style={{ transitionTimingFunction: 'var(--ease-premium)' }}
    >
      {variant === 'energy' && <span className="btn-energy-glow" aria-hidden />}
      <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
    </button>
  );
}

export default memo(PremiumButton);
