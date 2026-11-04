import { authenticationError, authorizationError } from "../../../error-handling";
import type { CallingUser, CallingUserWithProfile } from "../../../domains/users/types/calling-user";
import type { PostComment } from "../../../domains/posts/types/post-comment";
import { allow, disallow, type AuthorizationResult } from "../allowDisallow";
import { hasProfile, isCreator, isSignedIn } from "../conditions";

/** Only the author can edit a comment. */
export function canUpdatePostComment(caller: CallingUser | null, comment: PostComment): AuthorizationResult<CallingUserWithProfile> {
    if (!isSignedIn(caller)) {
        return disallow("not-signed-in", authenticationError());
    }
    if (!hasProfile(caller)) {
        return disallow("profile-required", authorizationError("Finish signing up first"));
    }
    if (!isCreator(caller, comment)) {
        return disallow("not-creator", authorizationError("Only the author can edit this comment"));
    }
    return allow(caller);
}
