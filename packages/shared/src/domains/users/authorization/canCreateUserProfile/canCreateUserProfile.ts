import type { CallingUser } from "../../types/calling-user";
import { allow, disallow, type AuthorizationCheck } from "../../../../authorization/allowDisallow/allowDisallow";
import { hasProfile, isSignedIn } from "../../../../authorization/conditions/conditions";

/** Finishing sign-up: anyone signed in who doesn't have a profile yet. */
export const canCreateUserProfile: AuthorizationCheck<{ caller: CallingUser | null }, CallingUser> = ({ caller }) => {
    if (!isSignedIn(caller)) {
        return disallow("not-signed-in");
    }
    if (hasProfile(caller)) {
        return disallow("profile-exists");
    }
    return allow(caller);
};
