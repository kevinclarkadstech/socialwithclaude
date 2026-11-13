import { longSideDimensions } from '@myapp/shared/media';
import { drawScaled, encodePhoto, type EncodedPhotoType } from './canvas';
import { thumbHashOf } from './thumbHash';

export interface RenderedPhoto {
  size: number;
  width: number;
  height: number;
  blob: Blob;
  contentType: EncodedPhotoType;
}

/**
 * Renders a photo at each size (its longer side), keeping its shape, encoded
 * as WebP (or JPEG), plus a ThumbHash placeholder. Photos longer and thinner
 * than `maxAspectRatio` (e.g. 3:1) are cropped to it around the middle. Done on the device, so
 * uploads are small and the server never decodes or resizes; re-encoding
 * also drops the photo's metadata.
 */
export async function renderPhotoSizes({ source, sizes, maxAspectRatio, quality = 0.82 }: {
  source: Blob;
  sizes: readonly number[];
  maxAspectRatio: number;
  quality?: number;
}): Promise<{ photos: RenderedPhoto[]; placeholder: string }> {
  // Applies the photo's orientation (phones store it in EXIF).
  const bitmap = await createImageBitmap(source, { imageOrientation: 'from-image' });
  try {
    const crop = withinAspectRatio(bitmap.width, bitmap.height, maxAspectRatio);
    // Scale large photos down once first: one big jump down to a small size looks jagged.
    const largest = Math.max(...sizes);
    const baseSize = Math.min(Math.max(crop.width, crop.height), largest * 2);
    const baseDimensions = longSideDimensions({ width: crop.width, height: crop.height, size: baseSize });
    const base = drawScaled(bitmap, crop, baseDimensions.width, baseDimensions.height);
    const shape = longSideDimensions({ width: base.width, height: base.height, size: largest });

    const photos: RenderedPhoto[] = [];
    for (const size of sizes) {
      // Every size from the largest one's shape, as the server checks.
      const { width, height } = longSideDimensions({ width: shape.width, height: shape.height, size });
      const canvas = drawScaled(base, { x: 0, y: 0, width: base.width, height: base.height }, width, height);
      const encoded = await encodePhoto(canvas, quality);
      photos.push({ size, width, height, ...encoded });
    }
    return { photos, placeholder: thumbHashOf(base) };
  } finally {
    bitmap.close();
  }
}

/** The middle of a width × height photo, no longer and thinner than `ratio` (longer side ÷ shorter). */
function withinAspectRatio(width: number, height: number, ratio: number) {
  if (width > height * ratio) {
    const croppedWidth = Math.floor(height * ratio);
    return { x: Math.floor((width - croppedWidth) / 2), y: 0, width: croppedWidth, height };
  }
  if (height > width * ratio) {
    const croppedHeight = Math.floor(width * ratio);
    return { x: 0, y: Math.floor((height - croppedHeight) / 2), width, height: croppedHeight };
  }
  return { x: 0, y: 0, width, height };
}
