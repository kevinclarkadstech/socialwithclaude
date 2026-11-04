import { UserFeedbackCategorySchema, UserFeedbackStatusSchema } from "../types/user-feedback";
import { UserFollowStatusSchema } from "../types/user-follow";
import { ProfileVisibilitySchema } from "../types/user-settings";

export const profileVisibilities = ProfileVisibilitySchema.options;
export const userFollowStatuses = UserFollowStatusSchema.options;
export const userFeedbackCategories = UserFeedbackCategorySchema.options;
export const userFeedbackStatuses = UserFeedbackStatusSchema.options;
