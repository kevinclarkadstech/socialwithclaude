import type { CallingUser } from "../../../users/types/calling-user";
import type { PostAccess } from "../../types/post-access";
import type { PostCommentView } from "../../types/post-comment";
import { allow, disallow, type AuthorizationCheck } from "../../../../authorization/allowDisallow/allowDisallow";
import { hasBlocked, hasProfile, isBlockedBy, isSignedIn } from "../../../../authorization/conditions/conditions";
import { canViewPost } from "../canViewPost/canViewPost";

/**
 * Anyone who has finished sign-up can vote on a comment.
 * Not on a post the caller can't see, and not across a block with the
 * comment's author (whose comments the caller isn't shown).
 */
export const canVoteOnPostComment: AuthorizationCheck<{
    caller: CallingUser | null;
    post: PostAccess;
    comment: Pick<PostCommentView, "createdBy">;
}> = ({ caller, post, comment }) => {
    if (!isSignedIn(caller)) {
        return disallow("not-signed-in");
    }
    if (!hasProfile(caller)) {
        return disallow("profile-required");
    }
    const viewable = canViewPost({ caller, post });
    if (!viewable.ok) {
        return viewable;
    }
    if (isBlockedBy(caller, comment.createdBy)) {
        return disallow("blocked-by-user");
    }
    if (hasBlocked(caller, comment.createdBy)) {
        return disallow("blocking-user");
    }
    return allow(caller);
};
