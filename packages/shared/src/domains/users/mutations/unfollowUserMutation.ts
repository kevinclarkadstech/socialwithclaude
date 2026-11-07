import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { fail, succeed } from "../../../utils/result";
import { notFoundError } from "../../../error-handling";
import { requireCallerWithProfile } from "../../../logic/authorization/requireCaller";
import { logDisallowedResult } from "../../../logic/authorization/logDisallowedResult";
import type { GetCallingUser } from "../types/calling-user";
import { UserProfileSchema, type UserProfile } from "../types/user-profile";

export const UnfollowUserMutationInputSchema = UserProfileSchema.pick({ username: true });

export type UnfollowUserMutationInput = z.infer<typeof UnfollowUserMutationInputSchema>;

export const UnfollowUserMutationOutputSchema = z.null();

export type UnfollowUserMutationOutput = z.infer<typeof UnfollowUserMutationOutputSchema>;

/** Unfollows a user, or cancels a follow request. Succeeds if neither. */
export const unfollowUserMutation: Mutation<{ input: UnfollowUserMutationInput, output: UnfollowUserMutationOutput }, {
    getCallingUser: GetCallingUser;
    getUserProfileByUsername: (args: { username: string }) => Promise<UserProfile | null>;
    unfollowUser: (args: { followerId: string; followingId: string }) => Promise<boolean>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = requireCallerWithProfile({ caller });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "unfollow-user", callerId: caller?.userId },
        });
        return allowed;
    }

    const target = await dependencies.getUserProfileByUsername(input);
    if (!target) {
        logger.info("User to unfollow not found", { username: input.username });
        return fail(notFoundError("User not found"));
    }

    await dependencies.unfollowUser({ followerId: allowed.value.userId, followingId: target.userId });
    return succeed();
}
