import { postPhotoDimensions, postPhotoKey, postPhotoSizes, type PostMedia } from '@myapp/shared/domains';
import { config } from '../../../lib/config';
import type { ViewerPhoto } from '../../media/components/PhotoViewer/photoViewerStore';

/** Where one size of a post photo is served from. Addresses never change, so they're cached for good. */
export function postPhotoUrl({ media, size }: { media: Pick<PostMedia, 'path'>; size: number }): string {
  return `${config.mediaUrl}/${postPhotoKey({ path: media.path, size })}`;
}

/** Every size of a post photo for an <img srcset>, by its actual width, so the browser picks one. */
export function postPhotoSrcSet(media: Pick<PostMedia, 'path' | 'width' | 'height'>): string {
  return postPhotoSizes
    .map((size) => `${postPhotoUrl({ media, size })} ${postPhotoDimensions({ width: media.width, height: media.height, size }).width}w`)
    .join(', ');
}

/** A post's photos as the full-screen viewer takes them. */
export function toViewerPhotos(media: PostMedia[]): ViewerPhoto[] {
  return media.map((item) => ({
    src: postPhotoUrl({ media: item, size: postPhotoSizes[postPhotoSizes.length - 1]! }),
    srcSet: postPhotoSrcSet(item),
    width: item.width,
    height: item.height,
    caption: item.caption,
    placeholder: item.placeholder,
  }));
}

/** Width ÷ height to show a photo at in the feed: its own shape, but no taller than 4:5 or wider than 1.91:1. */
export function feedAspectRatio(media: Pick<PostMedia, 'width' | 'height'>): number {
  return Math.min(1.91, Math.max(0.8, media.width / media.height));
}
