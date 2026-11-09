import { rgbaToThumbHash, thumbHashToDataURL } from 'thumbhash';

/**
 * A ThumbHash of a canvas (base64, about 30 characters): a blurry stand-in
 * shown while the photo loads. ThumbHash takes at most 100 × 100 pixels.
 */
export function thumbHashOf(canvas: HTMLCanvasElement): string {
  const scale = 100 / Math.max(canvas.width, canvas.height);
  const width = Math.max(1, Math.round(canvas.width * scale));
  const height = Math.max(1, Math.round(canvas.height * scale));
  const small = document.createElement('canvas');
  small.width = width;
  small.height = height;
  const context = small.getContext('2d');
  if (!context) {
    throw new Error("This device can't prepare images");
  }
  context.drawImage(canvas, 0, 0, width, height);
  const { data } = context.getImageData(0, 0, width, height);
  const hash = rgbaToThumbHash(width, height, data);
  return btoa(String.fromCharCode(...hash));
}

const dataUrls = new Map<string, string>();

/** The image a ThumbHash stands for, as a data URL (worked out once per hash). */
export function thumbHashDataUrl(hash: string): string | null {
  const cached = dataUrls.get(hash);
  if (cached) {
    return cached;
  }
  try {
    const bytes = Uint8Array.from(atob(hash), (char) => char.charCodeAt(0));
    const url = thumbHashToDataURL(bytes);
    dataUrls.set(hash, url);
    return url;
  } catch {
    return null;
  }
}
