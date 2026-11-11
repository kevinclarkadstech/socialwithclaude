import type { CallingUser } from "../../../users/types/calling-user";
import type { Post } from "../../types/post";
import { allow, disallow, type AuthorizationCheck } from "../../../../common/authorization/allowDisallow/allowDisallow";
import { hasProfile, isCreator, isSignedIn } from "../../../../common/authorization/conditions/conditions";

/** Only the author can delete a post (or listing). */
export const canDeletePost: AuthorizationCheck<{ caller: CallingUser | null; post: Post }> = ({ caller, post }) => {
    if (!isSignedIn(caller)) {
        return disallow("not-signed-in");
    }
    if (!hasProfile(caller)) {
        return disallow("profile-required");
    }
    if (!isCreator(caller, post)) {
        return disallow("not-creator", "Only the author can delete this post");
    }
    return allow(caller);
};
