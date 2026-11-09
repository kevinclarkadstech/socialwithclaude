/** A rectangle of the source image, in its own pixels (as the crop screen reports it). */
export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RenderedImage {
  width: number;
  height: number;
  blob: Blob;
  contentType: 'image/webp' | 'image/jpeg';
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
    const base = drawScaled(bitmap, crop, Math.min(Math.round(crop.width), largest * 2), aspectRatio);
    const images: RenderedImage[] = [];
    for (const width of widths) {
      const canvas = drawScaled(base, { x: 0, y: 0, width: base.width, height: base.height }, width, aspectRatio);
      images.push({ width, height: canvas.height, ...(await encode(canvas, quality)) });
    }
    return images;
  } finally {
    bitmap.close();
  }
}

function drawScaled(source: CanvasImageSource, crop: CropArea, width: number, aspectRatio: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = Math.round(width / aspectRatio);
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error("This device can't prepare images");
  }
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
  return canvas;
}

async function encode(canvas: HTMLCanvasElement, quality: number): Promise<{ blob: Blob; contentType: RenderedImage['contentType'] }> {
  const webp = await toBlob(canvas, 'image/webp', quality);
  // Browsers that can't encode WebP hand back a PNG instead.
  if (webp.type === 'image/webp') {
    return { blob: webp, contentType: 'image/webp' };
  }
  return { blob: await toBlob(canvas, 'image/jpeg', quality), contentType: 'image/jpeg' };
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't encode the image"))), type, quality);
  });
}
