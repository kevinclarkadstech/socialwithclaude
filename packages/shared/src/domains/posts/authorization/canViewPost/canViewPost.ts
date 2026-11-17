import type { CallingUser } from "../../../users/types/calling-user";
import type { PostAccess } from "../../types/post-access";
import type { AuthorizationCheck } from "../../../../authorization/allowDisallow/allowDisallow";
import { canViewUserPosts } from "../canViewUserPosts/canViewUserPosts";

/**
 * Whether the caller can see a post: the same rule as its creator's
 * profile (canViewUserPosts), from what the post carries about its creator.
 */
export const canViewPost: AuthorizationCheck<{
    caller: CallingUser | null;
    post: Pick<PostAccess, "createdBy" | "creator" | "viewer">;
}, CallingUser | null> = ({ caller, post }) =>
    canViewUserPosts({
        caller,
        profile: { userId: post.createdBy },
        visibility: post.creator.profileVisibility,
        followStatus: post.viewer.followsCreator ? "following" : "none",
    });
