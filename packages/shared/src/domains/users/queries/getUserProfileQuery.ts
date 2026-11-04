import z from "zod";
import type { Query } from "../../../types/query";
import { succeed } from "../../../utils/result";
import { notFound } from "../../../utils/failures";
import { UserProfileSchema, type UserProfile } from "../types/user-profile";

export const GetUserProfileQueryInputSchema = UserProfileSchema.pick({ username: true });

export type GetUserProfileQueryInput = z.infer<typeof GetUserProfileQueryInputSchema>;

export const GetUserProfileQueryOutputSchema = UserProfileSchema;

export type GetUserProfileQueryOutput = z.infer<typeof GetUserProfileQueryOutputSchema>;

export const getUserProfileQuery: Query<{ input: GetUserProfileQueryInput, output: GetUserProfileQueryOutput }, {
    getUserProfileByUsername: (args: { username: string }) => Promise<UserProfile | null>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const profile = await dependencies.getUserProfileByUsername(input);
    if (!profile) {
        logger.info("User not found", { username: input.username });
        return notFound("User not found");
    }

    return succeed(profile);
}
