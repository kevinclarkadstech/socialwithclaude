import type { AppError } from "../../error-handling";

/**
 * Every reason a check can disallow something, with the error it fails
 * with (and its default message) and the level it's logged at.
 */
export const disallowedReasons = {
    // Routine: expired sessions, onboarding.
    "not-signed-in": { errorType: "authentication", message: "Sign in required", logLevel: "info" },
    "profile-required": { errorType: "authorization", message: "Finish signing up first", logLevel: "info" },
    // The UI shouldn't allow it: likely a client bug.
    "self": { errorType: "validation", message: "You can't do that to yourself", logLevel: "warn" },
    // The UI never sends these: someone probing, or broken code. Alert on their rate.
    "not-creator": { errorType: "authorization", message: "Only the author can do that", logLevel: "error" },
    // Not-found rather than forbidden, so non-members can't tell the chat exists.
    "not-member": { errorType: "not-found", message: "Not found", logLevel: "error" },
} satisfies Record<string, { errorType: AppError["type"]; message: string; logLevel: "info" | "warn" | "error" }>;

export type DisallowedReason = keyof typeof disallowedReasons;
