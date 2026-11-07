import type { CallingUser } from "../../../domains/users/types/calling-user";
import type { UserProfile } from "../../../domains/users/types/user-profile";
import { allow, disallow, type AuthorizationCheck } from "../allowDisallow";
import { hasProfile, isSelf, isSignedIn } from "../conditions";

/** Anyone who has finished sign-up can start a chat with someone else. */
export const canCreateDirectChat: AuthorizationCheck<{ caller: CallingUser | null; receiver: UserProfile }> = ({ caller, receiver }) => {
    if (!isSignedIn(caller)) {
        return disallow("not-signed-in");
    }
    if (!hasProfile(caller)) {
        return disallow("profile-required");
    }
    if (isSelf(caller, receiver.userId)) {
        return disallow("self", "You can't chat with yourself");
    }
    return allow(caller);
};
