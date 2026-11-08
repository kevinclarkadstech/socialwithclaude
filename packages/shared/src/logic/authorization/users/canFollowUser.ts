import type { CallingUser } from "../../../domains/users/types/calling-user";
import type { UserProfile } from "../../../domains/users/types/user-profile";
import { allow, disallow, type AuthorizationCheck } from "../allowDisallow";
import { hasBlocked, hasProfile, isBlockedBy, isSelf, isSignedIn } from "../conditions";

/** Anyone who has finished sign-up can follow (or ask to follow) someone else, unless either has blocked the other. */
export const canFollowUser: AuthorizationCheck<{ caller: CallingUser | null; target: UserProfile }> = ({ caller, target }) => {
    if (!isSignedIn(caller)) {
        return disallow("not-signed-in");
    }
    if (!hasProfile(caller)) {
        return disallow("profile-required");
    }
    if (isSelf(caller, target.userId)) {
        return disallow("self", "You can't follow yourself");
    }
    if (isBlockedBy(caller, target.userId)) {
        return disallow("blocked-by-user");
    }
    if (hasBlocked(caller, target.userId)) {
        return disallow("blocking-user");
    }
    return allow(caller);
};
