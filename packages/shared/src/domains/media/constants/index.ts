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

/**
 * The sizes each post photo is stored at, by its longer side (photos keep
 * their shape). The app resizes on the device and uploads every size: 320 for
 * grid tiles, 640 for cards, 1280 for full screen.
 */
export const postPhotoSizes = [320, 640, 1280] as const;

/** The most a photo's longer side may be over its shorter one (3:1 panoramas, 1:3 tall shots). */
export const maxPhotoAspectRatio = 3;

/** The longest placeholder (a ThumbHash in base64, normally about 30 characters). */
export const maxPhotoPlaceholderLength = 100;
