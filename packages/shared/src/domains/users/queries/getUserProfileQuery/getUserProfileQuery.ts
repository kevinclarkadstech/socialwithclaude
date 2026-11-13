import z from "zod";
import type { Query } from "../../../../types/query";
import { fail, succeed } from "../../../../utils/result";
import { notFoundError } from "../../../../error-handling";
import { hasBlocked, isSelf } from "../../../../authorization/conditions/conditions";
import { canViewUserPosts } from "../../authorization/canViewUserPosts/canViewUserPosts";
import { canViewUserProfile } from "../../authorization/canViewUserProfile/canViewUserProfile";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../types/calling-user";
import { toViewerFollowStatus, ViewerFollowStatusSchema, type UserFollowStatus } from "../../types/user-follow";
import { UserProfileSchema, type UserProfile } from "../../types/user-profile";
import { ProfileVisibilitySchema, type ProfileVisibility } from "../../types/user-settings";

export const GetUserProfileQueryInputSchema = UserProfileSchema.pick({ username: true });

export type GetUserProfileQueryInput = z.infer<typeof GetUserProfileQueryInputSchema>;

export const GetUserProfileQueryOutputSchema = UserProfileSchema.extend({
    profileVisibility: ProfileVisibilitySchema,
    // How the profile looks to whoever is asking.
    viewer: z.object({
        // "none" when signed out or for your own profile.
        followStatus: ViewerFollowStatusSchema,
        // The caller has blocked them: the profile offers Unblock, and hides their posts.
        hasBlocked: z.boolean(),
        // Whether getUserPosts would show their posts and listings (see canViewUserPosts).
        canSeePosts: z.boolean(),
    }),
});

export type GetUserProfileQueryOutput = z.infer<typeof GetUserProfileQueryOutputSchema>;

/**
 * A profile's header (name, about, counts) and how it looks to the caller.
 * Not found if the user doesn't exist, or has blocked the caller.
 */
export const getUserProfileQuery: Query<{ input: GetUserProfileQueryInput, output: GetUserProfileQueryOutput }, {
    getCallingUser: GetCallingUser;
    getUserProfileByUsername: (args: { username: string }) => Promise<UserProfile | null>;
    // Null if the user has no settings (which shouldn't happen): treated as followers-only.
    getProfileVisibility: (args: { userId: string }) => Promise<ProfileVisibility | null>;
    // The status of followerId's follow of followingId; null if there's none.
    getUserFollowStatus: (args: { followerId: string; followingId: string }) => Promise<UserFollowStatus | null>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const profile = await dependencies.getUserProfileByUsername(input);
    if (!profile) {
        logger.info("User not found", { username: input.username });
        return fail(notFoundError("User not found"));
    }

    const caller = await dependencies.getCallingUser();
    const viewable = canViewUserProfile({ caller, profile });
    if (!viewable.ok) {
        logDisallowedResult({
            logger,
            result: viewable,
            details: { action: "view-user-profile", callerId: caller?.userId, userId: profile.userId },
        });
        return viewable;
    }

    const visibility = await dependencies.getProfileVisibility({ userId: profile.userId });
    if (!visibility) {
        // Every profile gets settings when it's created; treat it as private until fixed.
        logger.error("Settings missing for a user with a profile", { userId: profile.userId });
    }
    const profileVisibility = visibility ?? "followers";

    let followStatus: UserFollowStatus | null = null;
    if (caller && !isSelf(caller, profile.userId)) {
        followStatus = await dependencies.getUserFollowStatus({ followerId: caller.userId, followingId: profile.userId });
    }
    const viewerFollowStatus = toViewerFollowStatus(followStatus);

    return succeed({
        ...profile,
        profileVisibility,
        viewer: {
            followStatus: viewerFollowStatus,
            hasBlocked: caller ? hasBlocked(caller, profile.userId) : false,
            canSeePosts: canViewUserPosts({ caller, profile, visibility: profileVisibility, followStatus: viewerFollowStatus }).ok,
        },
    });
}
