import type { ProfilePhotoKind } from "../types/profile-photo";
import { UserFeedbackCategorySchema, UserFeedbackStatusSchema } from "../types/user-feedback";
import { UserFollowStatusSchema } from "../types/user-follow";
import { ProfileVisibilitySchema } from "../types/user-settings";

export const profileVisibilities = ProfileVisibilitySchema.options;
export const userFollowStatuses = UserFollowStatusSchema.options;
export const userFeedbackCategories = UserFeedbackCategorySchema.options;
export const userFeedbackStatuses = UserFeedbackStatusSchema.options;

/**
 * The widths each profile photo is stored at. The app crops and resizes on the
 * device and uploads every width; the server checks and publishes them.
 */
export const profilePhotoWidths = {
    avatar: [96, 400],
    cover: [800, 1600],
} as const satisfies Record<ProfilePhotoKind, readonly number[]>;

/** Width ÷ height: avatars are square, covers 3:1 (as on the profile). */
export const profilePhotoAspectRatios = {
    avatar: 1,
    cover: 3,
} as const satisfies Record<ProfilePhotoKind, number>;
