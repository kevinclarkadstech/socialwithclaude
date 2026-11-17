import z from "zod";
import type { Mutation } from "../../../../types/mutation";
import { fail, succeed } from "../../../../utils/result";
import { notFoundError } from "../../../../error-handling";
import { canFollowUser } from "../../authorization/canFollowUser/canFollowUser";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../types/calling-user";
import { UserFollowSchema, type UserFollow } from "../../types/user-follow";
import { UserProfileSchema, type UserProfile } from "../../types/user-profile";
import type { ProfileVisibility } from "../../types/user-settings";
import { bestEffort } from "../../../../utils/bestEffort/bestEffort";
import type { NewNotification } from "../../../notifications/types/notification";

export const FollowUserMutationInputSchema = UserProfileSchema.pick({ username: true });

export type FollowUserMutationInput = z.infer<typeof FollowUserMutationInputSchema>;

export const FollowUserMutationOutputSchema = UserFollowSchema;

export type FollowUserMutationOutput = z.infer<typeof FollowUserMutationOutputSchema>;

/**
 * Follows a user right away if their profile is public; otherwise asks to,
 * pending their response. Following again returns the existing follow. They're
 * told ("followed" or "follow_requested"; a repeat within a day isn't sent again).
 */
export const followUserMutation: Mutation<{ input: FollowUserMutationInput, output: FollowUserMutationOutput }, {
    getCallingUser: GetCallingUser;
    getUserProfileByUsername: (args: { username: string }) => Promise<UserProfile | null>;
    // Null if the user has no settings (which shouldn't happen).
    getProfileVisibility: (args: { userId: string }) => Promise<ProfileVisibility | null>;
    followUser: (args: { followerId: string; followingId: string; status: "accepted" | "pending" }) => Promise<UserFollow>;
    /** Sends notifications (a repeat of a follow one within a day is skipped). */
    sendNotifications: (notifications: NewNotification[]) => Promise<void>;
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
    // A denied request isn't sent again (asking again doesn't reach them).
    if (follow.status !== "denied") {
        await bestEffort({
            logger,
            what: "send a follow notification",
            run: () => dependencies.sendNotifications([{
                userId: target.userId,
                actorId: allowed.value.userId,
                type: follow.status === "accepted" ? "followed" : "follow_requested",
                data: {},
            }]),
        });
    }
    return succeed(follow);
}
