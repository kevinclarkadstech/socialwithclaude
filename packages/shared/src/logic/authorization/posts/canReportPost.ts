import type { CallingUser, CallingUserWithProfile } from "../../../domains/users/types/calling-user";
import type { Post } from "../../../domains/posts/types/post";
import { allow, disallow, type AuthorizationResult } from "../allowDisallow";
import { hasProfile, isSignedIn } from "../conditions";

/** Anyone who has finished sign-up can report a post. */
export function canReportPost(caller: CallingUser | null, _post: Post): AuthorizationResult<CallingUserWithProfile> {
    if (!isSignedIn(caller)) {
        return disallow("not-signed-in");
    }
    if (!hasProfile(caller)) {
        return disallow("profile-required");
    }
    return allow(caller);
}
