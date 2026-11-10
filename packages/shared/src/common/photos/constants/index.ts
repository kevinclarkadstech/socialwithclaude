import type { PhotoContentType, PhotoFormat } from "../types";

/** The most one uploaded file may weigh. Device-resized WebP or JPEG is far smaller. */
export const maxPhotoUploadBytes = 2 * 1024 * 1024;

export const photoContentTypes = {
    webp: "image/webp",
    jpeg: "image/jpeg",
} as const satisfies Record<PhotoFormat, PhotoContentType>;

/** The longest placeholder (a ThumbHash in base64, normally about 30 characters). */
export const maxPhotoPlaceholderLength = 100;
