import type { CallingUser } from "../../../domains/users/types/calling-user";
import type { Post } from "../../../domains/posts/types/post";
import { allow, disallow, type AuthorizationCheck } from "../allowDisallow";
import { hasProfile, isSignedIn } from "../conditions";
import { canViewPost } from "../../../domains/posts/utils/canViewPost";

/** Anyone who has finished sign-up can report a post they can see. */
export const canReportPost: AuthorizationCheck<{ caller: CallingUser | null; post: Post }> = ({ caller, post }) => {
    if (!isSignedIn(caller)) {
        return disallow("not-signed-in");
    }
    if (!hasProfile(caller)) {
        return disallow("profile-required");
    }
    // Only posts the caller may see (not across a block, not a private profile they don't follow).
    const viewable = canViewPost({ caller, post });
    if (!viewable.ok) {
        return viewable;
    }
    return allow(caller);
};
