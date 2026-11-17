import type { CallingUser } from "../../../users/types/calling-user";
import type { PostView } from "../../types/post";
import { allow, disallow, type AuthorizationCheck } from "../../../../authorization/allowDisallow/allowDisallow";
import { hasProfile, ignoringBlocks, isSignedIn } from "../../../../authorization/conditions/conditions";
import { canViewPost } from "../canViewPost/canViewPost";

/**
 * Anyone who has finished sign-up can report a post they could see, blocks
 * or not: being blocked by its creator mid-report doesn't make it fail, and
 * blocking them doesn't stop you reporting it.
 */
export const canReportPost: AuthorizationCheck<{ caller: CallingUser | null; post: PostView }> = ({ caller, post }) => {
    if (!isSignedIn(caller)) {
        return disallow("not-signed-in");
    }
    if (!hasProfile(caller)) {
        return disallow("profile-required");
    }
    // Not a followers-only profile's post they don't follow.
    const viewable = canViewPost({ caller: ignoringBlocks(caller), post });
    if (!viewable.ok) {
        return viewable;
    }
    return allow(caller);
};
