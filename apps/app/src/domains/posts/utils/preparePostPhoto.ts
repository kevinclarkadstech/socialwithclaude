import { maxPhotoAspectRatio, postPhotoSizes } from '@myapp/shared/domains';
import { newId } from '../../../lib/ids';
import type { DisplayPhoto } from '../../../lib/images/displayPhoto';
import { renderPhotoSizes, type RenderedPhoto } from '../../../lib/images/renderPhotoSizes';

/** A photo picked for a post, resized and ready to upload when the post is sent. */
export interface PreparedPostPhoto {
  /** Made now, so sending again (after a failure) uploads it under the same id. */
  mediaId: string;
  files: RenderedPhoto[];
  placeholder: string;
  /** At the largest size. */
  width: number;
  height: number;
  /** The largest size, for showing it before it's published. */
  previewUrl: string;
}

/** Resizes a picked photo to every size a post photo is stored at, on the device. Nothing is uploaded yet. */
export async function preparePostPhoto(file: Blob): Promise<PreparedPostPhoto> {
  const { photos, placeholder } = await renderPhotoSizes({ source: file, sizes: postPhotoSizes, maxAspectRatio: maxPhotoAspectRatio });
  const largest = photos[photos.length - 1]!;
  return {
    mediaId: newId(),
    files: photos,
    placeholder,
    width: largest.width,
    height: largest.height,
    previewUrl: URL.createObjectURL(largest.blob),
  };
}

/** A prepared photo as the app shows it (from memory, before it's published). */
export function preparedDisplayPhoto(photo: PreparedPostPhoto, caption: string | null): DisplayPhoto {
  return {
    key: photo.mediaId,
    src: photo.previewUrl,
    width: photo.width,
    height: photo.height,
    placeholder: photo.placeholder,
    caption,
  };
}
