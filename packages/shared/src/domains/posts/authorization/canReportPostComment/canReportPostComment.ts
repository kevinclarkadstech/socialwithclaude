import type { CallingUser } from "../../../users/types/calling-user";
import type { PostView } from "../../types/post";
import { allow, disallow, type AuthorizationCheck } from "../../../../authorization/allowDisallow/allowDisallow";
import { hasProfile, isSignedIn } from "../../../../authorization/conditions/conditions";
import { canViewPost } from "../canViewPost/canViewPost";

/** Anyone who has finished sign-up can report a comment on a post they can see. */
export const canReportPostComment: AuthorizationCheck<{ caller: CallingUser | null; post: PostView }> = ({ caller, post }) => {
    if (!isSignedIn(caller)) {
        return disallow("not-signed-in");
    }
    if (!hasProfile(caller)) {
        return disallow("profile-required");
    }
    // Only on a post the caller can see (not across a block, not a private profile they don't follow).
    const viewable = canViewPost({ caller, post });
    if (!viewable.ok) {
        return viewable;
    }
    return allow(caller);
};
