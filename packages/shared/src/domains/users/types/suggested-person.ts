import z from "zod";
import { UserProfileSummarySchema } from "./user-profile-summary";

/**
 * Someone suggested to follow: who they are, and how many of the people the
 * caller follows follow them (0 when suggested for being popular).
 */
export const SuggestedPersonSchema = UserProfileSummarySchema.extend({
    followedByCount: z.int().min(0),
});

export type SuggestedPerson = z.infer<typeof SuggestedPersonSchema>;
