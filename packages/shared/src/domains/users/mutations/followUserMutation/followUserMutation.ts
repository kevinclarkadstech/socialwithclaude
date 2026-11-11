import z from "zod";
import type { Mutation } from "../../../../types/mutation";
import { fail, succeed } from "../../../../utils/result";
import { notFoundError } from "../../../../error-handling";
import { canFollowUser } from "../../authorization/canFollowUser/canFollowUser";
import { logDisallowedResult } from "../../../../common/authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../types/calling-user";
import { UserFollowSchema, type UserFollow } from "../../types/user-follow";
import { UserProfileSchema, type UserProfile } from "../../types/user-profile";
import type { ProfileVisibility } from "../../types/user-settings";

export const FollowUserMutationInputSchema = UserProfileSchema.pick({ username: true });

export type FollowUserMutationInput = z.infer<typeof FollowUserMutationInputSchema>;

export const FollowUserMutationOutputSchema = UserFollowSchema;

export type FollowUserMutationOutput = z.infer<typeof FollowUserMutationOutputSchema>;

/**
 * Follows a user right away if their profile is public; otherwise asks to,
 * pending their response. Following again returns the existing follow.
 */
export const followUserMutation: Mutation<{ input: FollowUserMutationInput, output: FollowUserMutationOutput }, {
    getCallingUser: GetCallingUser;
    getUserProfileByUsername: (args: { username: string }) => Promise<UserProfile | null>;
    // Null if the user has no settings (which shouldn't happen).
    getProfileVisibility: (args: { userId: string }) => Promise<ProfileVisibility | null>;
    followUser: (args: { followerId: string; followingId: string; status: "accepted" | "pending" }) => Promise<UserFollow>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const target = await dependencies.getUserProfileByUsername(input);
    if (!target) {
        logger.info("User to follow not found", { username: input.username });
        return fail(notFoundError("User not found"));
    }

    const caller = await dependencies.getCallingUser();
    const allowed = canFollowUser({ caller, target });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "follow-user", callerId: caller?.userId, targetUserId: target.userId },
        });
        return allowed;
    }

    const visibility = await dependencies.getProfileVisibility({ userId: target.userId });
    if (!visibility) {
        // Sign-up creates settings with the profile, so this means broken data.
        logger.error("Settings missing for a user with a profile", { targetUserId: target.userId });
        return fail(notFoundError("User not found"));
    }

    const follow = await dependencies.followUser({
        followerId: allowed.value.userId,
        followingId: target.userId,
        status: visibility === "public" ? "accepted" : "pending",
    });
    return succeed(follow);
}
