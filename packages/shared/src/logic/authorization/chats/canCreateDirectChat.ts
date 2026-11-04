import { authenticationError, authorizationError, validationError } from "../../../error-handling";
import type { CallingUser, CallingUserWithProfile } from "../../../domains/users/types/calling-user";
import type { UserProfile } from "../../../domains/users/types/user-profile";
import { allow, disallow, type AuthorizationResult } from "../allowDisallow";
import { hasProfile, isSelf, isSignedIn } from "../conditions";

/** Anyone who has finished sign-up can start a chat with someone else. */
export function canCreateDirectChat(caller: CallingUser | null, receiver: UserProfile): AuthorizationResult<CallingUserWithProfile> {
    if (!isSignedIn(caller)) {
        return disallow("not-signed-in", authenticationError());
    }
    if (!hasProfile(caller)) {
        return disallow("profile-required", authorizationError("Finish signing up first"));
    }
    if (isSelf(caller, receiver.userId)) {
        return disallow("self", validationError("You can't chat with yourself"));
    }
    return allow(caller);
}
