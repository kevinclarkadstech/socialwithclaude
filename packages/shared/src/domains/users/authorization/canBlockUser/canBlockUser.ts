import type { CallingUser } from "../../types/calling-user";
import type { UserProfile } from "../../types/user-profile";
import { allow, disallow, type AuthorizationCheck } from "../../../../authorization/allowDisallow/allowDisallow";
import { hasProfile, isSelf, isSignedIn } from "../../../../authorization/conditions/conditions";

/** Anyone who has finished sign-up can block someone else. */
export const canBlockUser: AuthorizationCheck<{ caller: CallingUser | null; target: UserProfile }> = ({ caller, target }) => {
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
};
