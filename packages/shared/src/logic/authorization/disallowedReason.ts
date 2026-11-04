/**
 * Why a check disallowed something, in the failure's `metadata.reason`.
 * logDisallowedResult picks a log level from it.
 */
export type DisallowedReason =
    // Routine: expired sessions, onboarding.
    | "not-signed-in"
    | "profile-required"
    // The UI shouldn't allow it: likely a client bug.
    | "self"
    // The UI never sends it: someone probing, or broken code.
    | "not-creator"
    | "not-member";

export const disallowedBecause = (reason: DisallowedReason) => ({ reason });
