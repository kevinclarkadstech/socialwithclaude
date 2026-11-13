import type { CallingUser } from "../../types/calling-user";
import type { UserProfile } from "../../types/user-profile";
import { allow, disallow, type AuthorizationCheck } from "../../../../authorization/allowDisallow/allowDisallow";
import { isBlockedBy } from "../../../../authorization/conditions/conditions";

/**
 * Anyone can see a profile (its header: name, about, counts), signed in or
 * not, except someone it has blocked: they get not-found.
 */
export const canViewUserProfile: AuthorizationCheck<{ caller: CallingUser | null; profile: UserProfile }, CallingUser | null> = ({ caller, profile }) => {
    if (caller && isBlockedBy(caller, profile.userId)) {
        return disallow("blocked-by-user");
    }
    return allow(caller);
};
