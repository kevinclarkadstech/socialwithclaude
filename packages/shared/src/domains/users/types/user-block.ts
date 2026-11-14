import z from "zod";
import { UserProfileSummarySchema } from "./user-profile-summary";

export const UserBlockSchema = z.object({
    userId: z.ulid(),
    blockedUserId: z.ulid(),
    createdAt: z.iso.datetime(),
});

export type UserBlock = z.infer<typeof UserBlockSchema>;
/** A block with who's blocked, to show them. */
export const UserBlockViewSchema = UserBlockSchema.extend({
    blockedUser: UserProfileSummarySchema,
});

export type UserBlockView = z.infer<typeof UserBlockViewSchema>;
