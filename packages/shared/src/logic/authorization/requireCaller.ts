import type { CallingUser, CallingUserWithProfile } from "../../domains/users/types/calling-user";
import type { Result } from "../../types/result";
import { succeed } from "../../utils/result";
import { unauthenticated, unauthorized } from "../../utils/failures";
import { disallowedBecause } from "./disallowedReason";

/** Signed in. For onboarding; almost everything else needs requireCallerWithProfile. */
export function requireCaller(caller: CallingUser | null): Result<CallingUser> {
    if (!caller) {
        return unauthenticated(disallowedBecause("not-signed-in"));
    }
    return succeed(caller);
}

/** Signed in and finished sign-up. */
export function requireCallerWithProfile(caller: CallingUser | null): Result<CallingUserWithProfile> {
    if (!caller) {
        return unauthenticated(disallowedBecause("not-signed-in"));
    }
    if (!caller.profile) {
        return unauthorized("Finish signing up first", disallowedBecause("profile-required"));
    }
    return succeed({ ...caller, profile: caller.profile });
}
