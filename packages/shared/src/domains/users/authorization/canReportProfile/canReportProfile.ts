import type { CallingUser } from "../../types/calling-user";
import type { UserProfile } from "../../types/user-profile";
import { allow, disallow, type AuthorizationCheck } from "../../../../authorization/allowDisallow/allowDisallow";
import { hasProfile, isSelf, isSignedIn } from "../../../../authorization/conditions/conditions";

/**
 * Anyone who has finished sign-up can report someone else, blocks or not:
 * blocking someone doesn't stop you reporting them, and neither does them
 * blocking you (e.g. between you tapping Report and sending it).
 */
export const canReportProfile: AuthorizationCheck<{ caller: CallingUser | null; target: Pick<UserProfile, "userId"> }> = ({ caller, target }) => {
    if (!isSignedIn(caller)) {
        return disallow("not-signed-in");
    }
    if (!hasProfile(caller)) {
        return disallow("profile-required");
    }
    if (isSelf(caller, target.userId)) {
        return disallow("self", "You can't report yourself");
    }
    return allow(caller);
};
