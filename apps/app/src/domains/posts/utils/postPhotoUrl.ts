import { longSideDimensions } from '@myapp/shared/common/images';
import { postPhotoKey, postPhotoSizes, type PostMedia } from '@myapp/shared/domains';
import { config } from '../../../lib/config';
import type { DisplayPhoto } from '../../../lib/images/displayPhoto';

type PhotoAddress = Pick<PostMedia, 'id' | 'postId' | 'createdBy'>;

/** Where one size of a published post photo is served from. Addresses never change, so they're cached for good. */
export function postPhotoUrl({ media, size }: { media: PhotoAddress; size: number }): string {
  return `${config.mediaUrl}/${postPhotoKey({ userId: media.createdBy, postId: media.postId, mediaId: media.id, size })}`;
}

/** Every size of a post photo for an <img srcset>, by its actual width, so the browser picks one. */
export function postPhotoSrcSet(media: PhotoAddress & Pick<PostMedia, 'width' | 'height'>): string {
  return postPhotoSizes
    .map((size) => `${postPhotoUrl({ media, size })} ${longSideDimensions({ width: media.width, height: media.height, size }).width}w`)
    .join(', ');
}

/** A post's photos as the app shows them. */
export function toDisplayPhotos(media: PostMedia[]): DisplayPhoto[] {
  return media.map((item) => ({
    key: item.id,
    src: postPhotoUrl({ media: item, size: postPhotoSizes[1] }),
    srcSet: postPhotoSrcSet(item),
    width: item.width,
    height: item.height,
    placeholder: item.placeholder,
    caption: item.caption,
  }));
}

/** Width ÷ height to show a photo at in the feed: its own shape, but no taller than 4:5 or wider than 1.91:1. */
export function feedAspectRatio(photo: Pick<DisplayPhoto, 'width' | 'height'>): number {
  return Math.min(1.91, Math.max(0.8, photo.width / photo.height));
}
