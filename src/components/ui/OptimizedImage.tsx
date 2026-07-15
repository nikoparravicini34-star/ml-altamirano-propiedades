import { memo, useMemo, useState, useCallback, type ImgHTMLAttributes } from 'react';
import { buildSrcSet, optimizeImageUrl } from '../../lib/images';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string | null | undefined;
  alt: string;
  width?: number;
  quality?: number;
  priority?: boolean;
  progressive?: boolean;
  sizes?: string;
}

function OptimizedImage({
  src,
  alt,
  width = 800,
  quality = 72,
  priority = false,
  progressive = true,
  className,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  onLoad,
  ...rest
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);

  const optimized = useMemo(
    () => optimizeImageUrl(src, { width, quality }),
    [src, width, quality]
  );

  const srcSet = useMemo(() => buildSrcSet(src, undefined, quality), [src, quality]);

  const handleLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      setLoaded(true);
      onLoad?.(e);
    },
    [onLoad]
  );

  return (
    <img
      src={optimized}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      className={`${progressive ? `img-progressive ${loaded ? 'is-loaded' : ''}` : ''} ${className ?? ''}`.trim()}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      onLoad={handleLoad}
      {...rest}
    />
  );
}

export default memo(OptimizedImage);
