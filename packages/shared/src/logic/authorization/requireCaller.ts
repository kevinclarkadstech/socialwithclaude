import type { CallingUser, CallingUserWithProfile } from "../../domains/users/types/calling-user";
import type { Result } from "../../types/result";
import { succeed } from "../../utils/result";
import { unauthenticated, unauthorized } from "../../utils/failures";

/** Signed in. For onboarding; almost everything else needs requireCallerWithProfile. */
export function requireCaller(caller: CallingUser | null): Result<CallingUser> {
    return caller ? succeed(caller) : unauthenticated();
}

/** Signed in and finished sign-up. */
export function requireCallerWithProfile(caller: CallingUser | null): Result<CallingUserWithProfile> {
    if (!caller) return unauthenticated();
    if (!caller.profile) return unauthorized("Finish signing up first");
    return succeed({ ...caller, profile: caller.profile });
}
