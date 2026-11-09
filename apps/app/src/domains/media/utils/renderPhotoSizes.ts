import { maxPhotoAspectRatio, postPhotoDimensions } from '@myapp/shared/domains';
import { drawScaled, encodeImage, type EncodedImageType } from './canvas';
import { thumbHashOf } from './thumbHash';

export interface RenderedPhoto {
  size: number;
  width: number;
  height: number;
  blob: Blob;
  contentType: EncodedImageType;
}

/**
 * Renders a photo at each size (its longer side), keeping its shape, encoded
 * as WebP (or JPEG), plus a ThumbHash placeholder. Photos longer and thinner
 * than 3:1 are cropped to 3:1 around the middle. Done on the device, so
 * uploads are small and the server never decodes or resizes; re-encoding
 * also drops the photo's metadata.
 */
export async function renderPhotoSizes({ source, sizes, quality = 0.82 }: {
  source: Blob;
  sizes: readonly number[];
  quality?: number;
}): Promise<{ photos: RenderedPhoto[]; placeholder: string }> {
  // Applies the photo's orientation (phones store it in EXIF).
  const bitmap = await createImageBitmap(source, { imageOrientation: 'from-image' });
  try {
    const crop = within3to1(bitmap.width, bitmap.height);
    // Scale large photos down once first: one big jump down to a small size looks jagged.
    const largest = Math.max(...sizes);
    const baseSize = Math.min(Math.max(crop.width, crop.height), largest * 2);
    const baseDimensions = postPhotoDimensions({ width: crop.width, height: crop.height, size: baseSize });
    const base = drawScaled(bitmap, crop, baseDimensions.width, baseDimensions.height);
    const shape = postPhotoDimensions({ width: base.width, height: base.height, size: largest });

    const photos: RenderedPhoto[] = [];
    for (const size of sizes) {
      // Every size from the largest one's shape, as the server checks.
      const { width, height } = postPhotoDimensions({ width: shape.width, height: shape.height, size });
      const canvas = drawScaled(base, { x: 0, y: 0, width: base.width, height: base.height }, width, height);
      const encoded = await encodeImage(canvas, quality);
      photos.push({ size, width, height, ...encoded });
    }
    return { photos, placeholder: thumbHashOf(base) };
  } finally {
    bitmap.close();
  }
}

/** The middle of a width × height image, no longer and thinner than 3:1. */
function within3to1(width: number, height: number) {
  if (width > height * maxPhotoAspectRatio) {
    const croppedWidth = Math.floor(height * maxPhotoAspectRatio);
    return { x: Math.floor((width - croppedWidth) / 2), y: 0, width: croppedWidth, height };
  }
  if (height > width * maxPhotoAspectRatio) {
    const croppedHeight = Math.floor(width * maxPhotoAspectRatio);
    return { x: 0, y: Math.floor((height - croppedHeight) / 2), width, height: croppedHeight };
  }
  return { x: 0, y: 0, width, height };
}
