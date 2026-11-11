import type { CallingUser } from "../../users/types/calling-user";
import type { PostView } from "../types/post";
import type { AuthorizationCheck } from "../../../common/authorization/allowDisallow/allowDisallow";
import { canViewUserPosts } from "../../users/authorization/canViewUserPosts/canViewUserPosts";

/**
 * Whether the caller can see a post: the same rule as its creator's
 * profile (canViewUserPosts), from what the post carries about its creator.
 */
export const canViewPost: AuthorizationCheck<{
    caller: CallingUser | null;
    post: Pick<PostView, "createdBy" | "creator" | "viewer">;
}, CallingUser | null> = ({ caller, post }) =>
    canViewUserPosts({
        caller,
        profile: { userId: post.createdBy },
        visibility: post.creator.profileVisibility,
        followStatus: post.viewer.followsCreator ? "following" : "none",
    });

/** The posts in `posts` the caller can see (see canViewPost). */
export function viewablePosts<P extends Pick<PostView, "createdBy" | "creator" | "viewer">>({ caller, posts }: {
    caller: CallingUser | null;
    posts: P[];
}): P[] {
    return posts.filter((post) => canViewPost({ caller, post }).ok);
}
