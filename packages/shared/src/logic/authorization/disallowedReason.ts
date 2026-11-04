/** Why a check disallowed something. logDisallowedResult picks a log level from it. */
export type DisallowedReason =
    // Routine: expired sessions, onboarding.
    | "not-signed-in"
    | "profile-required"
    // The UI shouldn't allow it: likely a client bug.
    | "self"
    // The UI never sends it: someone probing, or broken code.
    | "not-creator"
    | "not-member";
