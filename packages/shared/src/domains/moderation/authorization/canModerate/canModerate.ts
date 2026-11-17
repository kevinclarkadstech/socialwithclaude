import type { CallingUser } from "../../../users/types/calling-user";
import { allow, disallow, type AuthorizationCheck } from "../../../../authorization/allowDisallow/allowDisallow";
import { hasProfile, isAdmin, isSignedIn } from "../../../../authorization/conditions/conditions";

/** Only admins can moderate: see reports and feedback, remove content, ban people. */
export const canModerate: AuthorizationCheck<{ caller: CallingUser | null }> = ({ caller }) => {
    if (!isSignedIn(caller)) {
        return disallow("not-signed-in");
    }
    if (!isAdmin(caller)) {
        return disallow("not-admin");
    }
    if (!hasProfile(caller)) {
        return disallow("profile-required");
    }
    return allow(caller);
};
