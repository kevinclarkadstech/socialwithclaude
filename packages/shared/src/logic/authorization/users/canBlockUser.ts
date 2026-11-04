import type { CallingUser, CallingUserWithProfile } from "../../../domains/users/types/calling-user";
import type { UserProfile } from "../../../domains/users/types/user-profile";
import { allow, disallow, type AuthorizationResult } from "../allowDisallow";
import { hasProfile, isSelf, isSignedIn } from "../conditions";

/** Anyone who has finished sign-up can block someone else. */
export function canBlockUser(caller: CallingUser | null, target: UserProfile): AuthorizationResult<CallingUserWithProfile> {
    if (!isSignedIn(caller)) {
        return disallow("not-signed-in");
    }
    if (!hasProfile(caller)) {
        return disallow("profile-required");
    }
    if (isSelf(caller, target.userId)) {
        return disallow("self", "You can't block yourself");
    }
    return allow(caller);
}
