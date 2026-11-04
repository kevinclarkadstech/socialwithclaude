import { authenticationError, authorizationError } from "../../../error-handling";
import type { CallingUser, CallingUserWithProfile } from "../../../domains/users/types/calling-user";
import type { Post } from "../../../domains/posts/types/post";
import { allow, disallow, type AuthorizationResult } from "../allowDisallow";
import { hasProfile, isCreator, isSignedIn } from "../conditions";

/** Only the author can edit a post (or listing). */
export function canUpdatePost(caller: CallingUser | null, post: Post): AuthorizationResult<CallingUserWithProfile> {
    if (!isSignedIn(caller)) {
        return disallow("not-signed-in", authenticationError());
    }
    if (!hasProfile(caller)) {
        return disallow("profile-required", authorizationError("Finish signing up first"));
    }
    if (!isCreator(caller, post)) {
        return disallow("not-creator", authorizationError("Only the author can edit this post"));
    }
    return allow(caller);
}
