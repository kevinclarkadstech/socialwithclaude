import { postPhotoSizes, type PostMedia } from '@myapp/shared/domains';
import { useState } from 'react';
import { thumbHashDataUrl } from '../../../media/utils/thumbHash';
import { postPhotoSrcSet, postPhotoUrl } from '../../utils/postPhotoUrl';
import './PostPhoto.css';

interface PostPhotoProps {
  media: PostMedia;
  /** How wide it shows, for picking a size (an <img sizes> value). */
  sizes: string;
  /** "cover" fills the box (cropping); "contain" shows the whole photo. */
  fit?: 'cover' | 'contain';
}

/**
 * A post photo filling its box: a blurry placeholder (its ThumbHash) until
 * the right size has loaded, lazily, once it's near the screen.
 */
export function PostPhoto({ media, sizes, fit = 'cover' }: PostPhotoProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const placeholder = media.placeholder ? thumbHashDataUrl(media.placeholder) : null;

  return (
    <span
      className="post-photo"
      data-fit={fit}
      style={placeholder ? { backgroundImage: `url(${placeholder})` } : undefined}
    >
      <img
        src={postPhotoUrl({ media, size: postPhotoSizes[1]! })}
        srcSet={postPhotoSrcSet(media)}
        sizes={sizes}
        alt={media.caption ?? ''}
        loading="lazy"
        decoding="async"
        data-loaded={String(isLoaded)}
        onLoad={() => setIsLoaded(true)}
      />
    </span>
  );
}
