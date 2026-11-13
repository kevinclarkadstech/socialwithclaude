import type { CallingUser } from "../../../users/types/calling-user";
import type { Post } from "../../types/post";
import { allow, disallow, type AuthorizationCheck } from "../../../../authorization/allowDisallow/allowDisallow";
import { hasProfile, isCreator, isSignedIn } from "../../../../authorization/conditions/conditions";

/** Only the author can edit a post (or listing). */
export const canUpdatePost: AuthorizationCheck<{ caller: CallingUser | null; post: Post }> = ({ caller, post }) => {
    if (!isSignedIn(caller)) {
        return disallow("not-signed-in");
    }
    if (!hasProfile(caller)) {
        return disallow("profile-required");
    }
    if (!isCreator(caller, post)) {
        return disallow("not-creator", "Only the author can edit this post");
    }
    return allow(caller);
};
