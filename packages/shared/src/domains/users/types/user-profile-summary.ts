import z from "zod";
import { UserProfileSchema } from "./user-profile";

/** Enough of a profile to show who someone is, e.g. who created a post. */
export const UserProfileSummarySchema = UserProfileSchema.pick({
    userId: true,
    username: true,
    firstName: true,
    lastName: true,
});

export type UserProfileSummary = z.infer<typeof UserProfileSummarySchema>;
