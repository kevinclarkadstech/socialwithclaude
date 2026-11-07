import type { CallingUser } from "../../domains/users/types/calling-user";
import { allow, disallow, type AuthorizationCheck } from "./allowDisallow";
import { hasProfile, isSignedIn } from "./conditions";

/** Signed in. For onboarding; almost everything else needs requireCallerWithProfile. */
export const requireCaller: AuthorizationCheck<{ caller: CallingUser | null }, CallingUser> = ({ caller }) => {
    if (!isSignedIn(caller)) {
        return disallow("not-signed-in");
    }
    return allow(caller);
};

/** Signed in and finished sign-up. For actions on the caller's own things. */
export const requireCallerWithProfile: AuthorizationCheck<{ caller: CallingUser | null }> = ({ caller }) => {
    if (!isSignedIn(caller)) {
        return disallow("not-signed-in");
    }
    if (!hasProfile(caller)) {
        return disallow("profile-required");
    }
    return allow(caller);
};
