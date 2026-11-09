import type { ImageContentType, ImageFormat } from "../types";

/** The most one uploaded file may weigh. Device-resized WebP or JPEG is far smaller. */
export const maxImageUploadBytes = 2 * 1024 * 1024;

export const imageContentTypes = {
    webp: "image/webp",
    jpeg: "image/jpeg",
} as const satisfies Record<ImageFormat, ImageContentType>;

/** The longest placeholder (a ThumbHash in base64, normally about 30 characters). */
export const maxImagePlaceholderLength = 100;
