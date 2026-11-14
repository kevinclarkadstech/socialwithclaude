import type { CallingUser } from "../../types/calling-user";
import { allow, disallow, type AuthorizationCheck } from "../../../../authorization/allowDisallow/allowDisallow";
import { hasProfile, isSignedIn } from "../../../../authorization/conditions/conditions";

/** Anyone who has finished sign-up can remove something they saved. */
export const canUnsaveItem: AuthorizationCheck<{ caller: CallingUser | null }> = ({ caller }) => {
    if (!isSignedIn(caller)) {
        return disallow("not-signed-in");
    }
    if (!hasProfile(caller)) {
        return disallow("profile-required");
    }
    return allow(caller);
};
