import { memo } from 'react';
import { m } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import {
  fadeUp,
  fadeDown,
  fadeLeft,
  fadeRight,
  scaleIn,
  blurIn,
  viewportOnce,
} from '../../lib/motion';

const variantsMap = {
  up: fadeUp,
  down: fadeDown,
  left: fadeLeft,
  right: fadeRight,
  scale: scaleIn,
  blur: blurIn,
} as const;

type Direction = keyof typeof variantsMap;

interface RevealProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: React.ReactNode;
  direction?: Direction;
  delay?: number;
  className?: string;
}

function Reveal({
  children,
  direction = 'up',
  delay = 0,
  className = '',
  ...rest
}: RevealProps) {
  return (
    <m.div
      variants={variantsMap[direction]}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      transition={{ delay }}
      className={className}
      {...rest}
    >
      {children}
    </m.div>
  );
}

export default memo(Reveal);
