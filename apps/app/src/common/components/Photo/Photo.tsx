import { useState } from 'react';
import type { DisplayPhoto } from '../../../lib/photos/displayPhoto';
import { thumbHashDataUrl } from '../../../lib/photos/thumbHash';
import './Photo.css';

interface PhotoProps {
  photo: DisplayPhoto;
  /** How wide it shows, for picking a size (an <img sizes> value). */
  sizes: string;
  /** "cover" fills the box (cropping); "contain" shows the whole photo. */
  fit?: 'cover' | 'contain';
  /** "lazy" (the default) loads it once it's near the screen; "eager" straight away, e.g. for one that's always in view. */
  loading?: 'lazy' | 'eager';
}

/**
 * A photo filling its box: a blurry placeholder (its ThumbHash) until it has
 * loaded (lazily by default, once it's near the screen).
 */
export function Photo({ photo, sizes, fit = 'cover', loading = 'lazy' }: PhotoProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const placeholder = photo.placeholder ? thumbHashDataUrl(photo.placeholder) : null;

  return (
    <span className="photo" data-fit={fit} style={placeholder ? { backgroundImage: `url(${placeholder})` } : undefined}>
      <img
        src={photo.src}
        srcSet={photo.srcSet}
        sizes={photo.srcSet ? sizes : undefined}
        alt={photo.caption ?? ''}
        loading={loading}
        decoding="async"
        data-loaded={String(isLoaded)}
        onLoad={() => setIsLoaded(true)}
      />
    </span>
  );
}
