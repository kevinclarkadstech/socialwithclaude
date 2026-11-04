import type { CallingUser, CallingUserWithProfile } from "../../../domains/users/types/calling-user";
import type { PostComment } from "../../../domains/posts/types/post-comment";
import { allow, disallow, type AuthorizationResult } from "../allowDisallow";
import { hasProfile, isCreator, isSignedIn } from "../conditions";

/** Only the author can delete a comment. */
export function canDeletePostComment(caller: CallingUser | null, comment: PostComment): AuthorizationResult<CallingUserWithProfile> {
    if (!isSignedIn(caller)) {
        return disallow("not-signed-in");
    }
    if (!hasProfile(caller)) {
        return disallow("profile-required");
    }
    if (!isCreator(caller, comment)) {
        return disallow("not-creator", "Only the author can delete this comment");
    }
    return allow(caller);
}
