import z from "zod";
import { UserFeedbackSchema } from "../../users/types/user-feedback";
import { UserProfileSummarySchema } from "../../users/types/user-profile-summary";

/** Feedback as a moderator sees it: with who sent it (null if they have no profile). */
export const FeedbackItemSchema = UserFeedbackSchema.extend({
    user: UserProfileSummarySchema.nullable(),
});

export type FeedbackItem = z.infer<typeof FeedbackItemSchema>;
