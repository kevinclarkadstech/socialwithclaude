/** A rectangle of an image, in its own pixels. */
export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type EncodedImageType = 'image/webp' | 'image/jpeg';

/** Draws `crop` of `source` onto a new canvas of `width` × `height`, smoothly scaled. */
export function drawScaled(source: CanvasImageSource, crop: CropArea, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error("This device can't prepare images");
  }
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height);
  return canvas;
}

/** Encodes a canvas as WebP, or JPEG where the browser can't encode WebP. */
export async function encodeImage(canvas: HTMLCanvasElement, quality: number): Promise<{ blob: Blob; contentType: EncodedImageType }> {
  const webp = await toBlob(canvas, 'image/webp', quality);
  // Browsers that can't encode WebP hand back a PNG instead.
  if (webp.type === 'image/webp') {
    return { blob: webp, contentType: 'image/webp' };
  }
  const jpeg = await toBlob(canvas, 'image/jpeg', quality);
  return { blob: jpeg, contentType: 'image/jpeg' };
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't encode the image"))), type, quality);
  });
}
