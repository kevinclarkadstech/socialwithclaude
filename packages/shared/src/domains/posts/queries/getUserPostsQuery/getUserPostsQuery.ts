import z from "zod";
import type { Query } from "../../../../types/query";
import { fail, succeed } from "../../../../utils/result";
import { notFoundError } from "../../../../error-handling";
import { isSelf } from "../../../../common/authorization/conditions/conditions";
import { canViewUserPosts } from "../../../users/authorization/canViewUserPosts/canViewUserPosts";
import { logDisallowedResult } from "../../../../common/authorization/logDisallowedResult/logDisallowedResult";
import { PageInputSchema, type Page } from "../../../../common/types/page";
import { toViewerFollowStatus, type UserFollowStatus } from "../../../users/types/user-follow";
import { UserProfileSchema, type UserProfile } from "../../../users/types/user-profile";
import type { ProfileVisibility } from "../../../users/types/user-settings";
import { PostViewSchema, type PostView } from "../../types/post";
import type { GetCallingUser } from "../../../users/types/calling-user";

export const UserPostsTypeSchema = z.enum(["posts", "listings"]);

export const GetUserPostsQueryInputSchema = PageInputSchema.extend({
    username: UserProfileSchema.shape.username,
    // "listings": only listings. "posts" (or left out): every post, listings included.
    type: UserPostsTypeSchema.optional(),
});

export type UserPostsType = z.infer<typeof UserPostsTypeSchema>;
export type GetUserPostsQueryInput = z.infer<typeof GetUserPostsQueryInputSchema>;

export const GetUserPostsQueryOutputSchema = z.object({
    items: z.array(PostViewSchema),
    nextCursor: z.string().nullable(),
});

export type GetUserPostsQueryOutput = z.infer<typeof GetUserPostsQueryOutputSchema>;

/**
 * A user's posts and listings, newest first. Not found if the user doesn't
 * exist or has blocked the caller; refused for a followers-only profile the
 * caller doesn't follow (see canViewUserPosts).
 */
export const getUserPostsQuery: Query<{ input: GetUserPostsQueryInput, output: GetUserPostsQueryOutput }, {
    getCallingUser: GetCallingUser;
    getUserProfileByUsername: (args: { username: string }) => Promise<UserProfile | null>;
    // Null if the user has no settings (which shouldn't happen): treated as followers-only.
    getProfileVisibility: (args: { userId: string }) => Promise<ProfileVisibility | null>;
    // The status of followerId's follow of followingId; null if there's none.
    getUserFollowStatus: (args: { followerId: string; followingId: string }) => Promise<UserFollowStatus | null>;
    getPostViews: (args: {
        createdBy?: string;
        isListing?: boolean;
        viewerId: string | null;
        cursor?: string | null;
        limit: number;
    }) => Promise<Page<PostView>>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const profile = await dependencies.getUserProfileByUsername({ username: input.username });
    if (!profile) {
        logger.info("User not found", { username: input.username });
        return fail(notFoundError("User not found"));
    }

    const caller = await dependencies.getCallingUser();
    const visibility = await dependencies.getProfileVisibility({ userId: profile.userId });
    let followStatus: UserFollowStatus | null = null;
    if (caller && !isSelf(caller, profile.userId)) {
        followStatus = await dependencies.getUserFollowStatus({ followerId: caller.userId, followingId: profile.userId });
    }
    const allowed = canViewUserPosts({
        caller,
        profile,
        // Every profile gets settings when it's created; treat a missing one as private.
        visibility: visibility ?? "followers",
        followStatus: toViewerFollowStatus(followStatus),
    });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "view-user-posts", callerId: caller?.userId, userId: profile.userId },
        });
        return allowed;
    }

    const page = await dependencies.getPostViews({
        createdBy: profile.userId,
        isListing: input.type === "listings" ? true : undefined,
        viewerId: caller?.userId ?? null,
        cursor: input.cursor,
        limit: input.limit,
    });
    return succeed(page);
}
