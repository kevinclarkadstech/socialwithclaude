import z from "zod";
import { BaseEntityFieldsSchema } from "../../../common/types/base-entity-fields";

export const UserFeedbackCategorySchema = z.enum(["bug", "idea", "other"]);
export const UserFeedbackStatusSchema = z.enum(["new", "read", "done"]);

/** Feedback a user sent from the app. `pageUrl` is where it was sent from. */
export const UserFeedbackSchema = BaseEntityFieldsSchema.extend({
    userId: z.ulid(),
    category: UserFeedbackCategorySchema,
    message: z.string().trim().min(1).max(2000),
    pageUrl: z.string().trim().max(500).nullable(),
    userAgent: z.string().max(500).nullable(),
    status: UserFeedbackStatusSchema,
});

export type UserFeedbackCategory = z.infer<typeof UserFeedbackCategorySchema>;
export type UserFeedbackStatus = z.infer<typeof UserFeedbackStatusSchema>;
export type UserFeedback = z.infer<typeof UserFeedbackSchema>;
