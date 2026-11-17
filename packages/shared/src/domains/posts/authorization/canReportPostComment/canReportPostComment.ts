import type { CallingUser } from "../../../users/types/calling-user";
import type { PostAccess } from "../../types/post-access";
import { allow, disallow, type AuthorizationCheck } from "../../../../authorization/allowDisallow/allowDisallow";
import { hasProfile, ignoringBlocks, isSignedIn } from "../../../../authorization/conditions/conditions";
import { canViewPost } from "../canViewPost/canViewPost";

/**
 * Anyone who has finished sign-up can report a comment on a post they could
 * see, blocks or not (with the post's creator or the comment's author):
 * being blocked mid-report doesn't make it fail.
 */
export const canReportPostComment: AuthorizationCheck<{
    caller: CallingUser | null;
    post: PostAccess;
}> = ({ caller, post }) => {
    if (!isSignedIn(caller)) {
        return disallow("not-signed-in");
    }
    if (!hasProfile(caller)) {
        return disallow("profile-required");
    }
    const viewable = canViewPost({ caller: ignoringBlocks(caller), post });
    if (!viewable.ok) {
        return viewable;
    }
    return allow(caller);
};
