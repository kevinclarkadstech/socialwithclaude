import type { CallingUser } from "../../../domains/users/types/calling-user";
import type { PostView } from "../../../domains/posts/types/post";
import { allow, disallow, type AuthorizationCheck } from "../allowDisallow";
import { hasProfile, isCreator, isSignedIn } from "../conditions";

/** Only the author can delete a post (or listing). */
export const canDeletePost: AuthorizationCheck<{ caller: CallingUser | null; post: PostView }> = ({ caller, post }) => {
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
