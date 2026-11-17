import type { CallingUser } from "../../../users/types/calling-user";
import type { PostAccess } from "../../types/post-access";
import { allow, disallow, type AuthorizationCheck } from "../../../../authorization/allowDisallow/allowDisallow";
import { hasProfile, isSignedIn } from "../../../../authorization/conditions/conditions";
import { canViewPost } from "../canViewPost/canViewPost";

/** Anyone who has finished sign-up can read the comments on a post they can see. */
export const canViewPostComments: AuthorizationCheck<{ caller: CallingUser | null; post: PostAccess }> = ({ caller, post }) => {
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
    return allow(caller);
};
