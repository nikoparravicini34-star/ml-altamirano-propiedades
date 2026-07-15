import { User } from 'lucide-react';

interface DefaultAvatarProps {
  size?: number;
  initials?: string;
}

export default function DefaultAvatar({ size = 80, initials }: DefaultAvatarProps) {
  const fontSize = size * 0.28;
  const iconSize = size * 0.38;

  return (
    <div
      className="relative flex items-center justify-center overflow-hidden rounded-full"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(145deg, #F5F0E8 0%, #E8DFD0 50%, #D4C4A8 100%)',
      }}
    >
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: 'radial-gradient(circle at 30% 20%, rgba(200,163,95,0.35) 0%, transparent 60%)',
        }}
      />
      {initials && initials.length >= 1 ? (
        <span
          className="relative font-serif font-bold text-[#8B7355]"
          style={{ fontSize }}
        >
          {initials.slice(0, 2).toUpperCase()}
        </span>
      ) : (
        <User
          size={iconSize}
          strokeWidth={1.5}
          className="relative text-[#A8926F]"
        />
      )}
    </div>
  );
}
