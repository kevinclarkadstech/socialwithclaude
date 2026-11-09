import { drawScaled, encodeImage, type CropArea, type EncodedImageType } from './canvas';

export type { CropArea } from './canvas';

export interface RenderedImage {
  width: number;
  height: number;
  blob: Blob;
  contentType: EncodedImageType;
}

/**
 * Crops `source` to `crop` and renders it at each width (height from
 * `aspectRatio`), encoded as WebP, or JPEG where the browser can't encode
 * WebP. Done on the device, so uploads are small and the server never has to
 * decode or resize. Re-encoding through a canvas also drops the photo's
 * metadata (the server strips it again regardless).
 */
export async function renderCroppedImages({ source, crop, widths, aspectRatio, quality = 0.82 }: {
  source: Blob;
  crop: CropArea;
  widths: readonly number[];
  aspectRatio: number;
  quality?: number;
}): Promise<RenderedImage[]> {
  // Applies the photo's orientation, as the crop screen showed it.
  const bitmap = await createImageBitmap(source, { imageOrientation: 'from-image' });
  try {
    // Scale large crops down once first: one big jump down to a small size looks jagged.
    const largest = Math.max(...widths);
    const baseWidth = Math.min(Math.round(crop.width), largest * 2);
    const base = drawScaled(bitmap, crop, baseWidth, Math.round(baseWidth / aspectRatio));
    const images: RenderedImage[] = [];
    for (const width of widths) {
      const height = Math.round(width / aspectRatio);
      const canvas = drawScaled(base, { x: 0, y: 0, width: base.width, height: base.height }, width, height);
      const encoded = await encodeImage(canvas, quality);
      images.push({ width, height, ...encoded });
    }
    return images;
  } finally {
    bitmap.close();
  }
}
