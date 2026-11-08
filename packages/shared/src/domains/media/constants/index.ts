import type { ImageContentType, ImageFormat, ProfileImageKind } from "../types";

/**
 * The widths each profile image is stored at. The app crops and resizes on the
 * device and uploads every width; the server checks and publishes them.
 */
export const profileImageWidths = {
    avatar: [96, 400],
    cover: [800, 1600],
} as const satisfies Record<ProfileImageKind, readonly number[]>;

/** Width ÷ height: avatars are square, covers 3:1 (as on the profile). */
export const profileImageAspectRatios = {
    avatar: 1,
    cover: 3,
} as const satisfies Record<ProfileImageKind, number>;

/** The most one uploaded file may weigh. Device-resized WebP or JPEG is far smaller. */
export const maxImageUploadBytes = 2 * 1024 * 1024;

export const imageContentTypes = {
    webp: "image/webp",
    jpeg: "image/jpeg",
} as const satisfies Record<ImageFormat, ImageContentType>;
