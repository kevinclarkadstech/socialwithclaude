import { authenticationError, authorizationError } from "../../../error-handling";
import type { CallingUser, CallingUserWithProfile } from "../../../domains/users/types/calling-user";
import type { PostComment } from "../../../domains/posts/types/post-comment";
import { allow, disallow, type AuthorizationResult } from "../allowDisallow";
import { hasProfile, isSignedIn } from "../conditions";

/** Anyone who has finished sign-up can vote on a comment. */
export function canVoteOnPostComment(caller: CallingUser | null, _comment: PostComment): AuthorizationResult<CallingUserWithProfile> {
    if (!isSignedIn(caller)) {
        return disallow("not-signed-in", authenticationError());
    }
    if (!hasProfile(caller)) {
        return disallow("profile-required", authorizationError("Finish signing up first"));
    }
    return allow(caller);
}
