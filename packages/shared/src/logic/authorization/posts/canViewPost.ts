import type { CallingUser } from "../../../domains/users/types/calling-user";
import type { Post } from "../../../domains/posts/types/post";
import type { AuthorizationCheck } from "../allowDisallow";
import { canViewUserPosts } from "../users/canViewUserPosts";

/**
 * Whether the caller may see a post: the same rule as its creator's
 * profile (canViewUserPosts), from what the post carries about its creator.
 */
export const canViewPost: AuthorizationCheck<{
    caller: CallingUser | null;
    post: Pick<Post, "createdBy" | "creator" | "viewer">;
}, CallingUser | null> = ({ caller, post }) =>
    canViewUserPosts({
        caller,
        profile: { userId: post.createdBy },
        visibility: post.creator.profileVisibility,
        followStatus: post.viewer.followsCreator ? "following" : "none",
    });

/** The posts in `posts` the caller may see (see canViewPost). */
export function viewablePosts<P extends Pick<Post, "createdBy" | "creator" | "viewer">>({ caller, posts }: {
    caller: CallingUser | null;
    posts: P[];
}): P[] {
    return posts.filter((post) => canViewPost({ caller, post }).ok);
}
