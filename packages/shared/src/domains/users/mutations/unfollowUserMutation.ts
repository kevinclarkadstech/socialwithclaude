import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { succeed } from "../../../utils/result";
import { notFound } from "../../../utils/failures";
import { requireCallerWithProfile } from "../../../logic/authorization/requireCaller";
import type { GetCallingUser } from "../types/calling-user";
import { UserProfileSchema, type UserProfile } from "../types/user-profile";

export const UnfollowUserMutationInputSchema = UserProfileSchema.pick({ username: true });

export type UnfollowUserMutationInput = z.infer<typeof UnfollowUserMutationInputSchema>;

export const UnfollowUserMutationOutputSchema = z.undefined();

export type UnfollowUserMutationOutput = z.infer<typeof UnfollowUserMutationOutputSchema>;

/** Unfollows a user, or cancels a follow request. Succeeds if neither. */
export const unfollowUserMutation: Mutation<{ input: UnfollowUserMutationInput, output: UnfollowUserMutationOutput }, {
    getCallingUser: GetCallingUser;
    getUserProfileByUsername: (args: { username: string }) => Promise<UserProfile | null>;
    unfollowUser: (args: { followerId: string; followingId: string }) => Promise<boolean>;
}> = async ({ input, dependencies }) => {
    const allowed = requireCallerWithProfile(await dependencies.getCallingUser());
    if (!allowed.ok) return allowed;

    const target = await dependencies.getUserProfileByUsername(input);
    if (!target) return notFound("User not found");

    await dependencies.unfollowUser({ followerId: allowed.value.userId, followingId: target.userId });
    return succeed();
}
