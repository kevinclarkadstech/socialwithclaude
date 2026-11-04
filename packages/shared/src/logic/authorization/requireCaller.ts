import type { CallingUser, CallingUserWithProfile } from "../../domains/users/types/calling-user";
import { allow, disallow, type AuthorizationResult } from "./allowDisallow";
import { hasProfile, isSignedIn } from "./conditions";

/** Signed in. For onboarding; almost everything else needs requireCallerWithProfile. */
export function requireCaller(caller: CallingUser | null): AuthorizationResult<CallingUser> {
    if (!isSignedIn(caller)) {
        return disallow("not-signed-in");
    }
    return allow(caller);
}

/** Signed in and finished sign-up. For actions on the caller's own things. */
export function requireCallerWithProfile(caller: CallingUser | null): AuthorizationResult<CallingUserWithProfile> {
    if (!isSignedIn(caller)) {
        return disallow("not-signed-in");
    }
    if (!hasProfile(caller)) {
        return disallow("profile-required");
    }
    return allow(caller);
}
