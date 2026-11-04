import type { AppError } from "../../error-handling";
import type { AppLogger } from "../../observability";
import type { DisallowedReason } from "./disallowedReason";

const levels: Record<DisallowedReason, "info" | "warn" | "error"> = {
    "not-signed-in": "info",
    "profile-required": "info",
    "self": "warn",
    "not-creator": "error",
    "not-member": "error",
};

/**
 * Logs a failed authorization check, at a level picked from its reason.
 * `error` level is for requests the app never sends; alert on their rate,
 * not on each one. Pass ids only in `details`, never content.
 */
export function logDisallowedResult(
    logger: AppLogger,
    result: { ok: false; error: AppError },
    details: { action: string; callerId: string | undefined } & Record<string, unknown>,
) {
    const reason = result.error.metadata?.reason as DisallowedReason | undefined;
    const level = (reason && levels[reason]) ?? "warn";
    const context = { event: "authorization.disallowed", reason, errorType: result.error.type, ...details };
    const message = `Disallowed ${details.action}`;

    if (level === "error") {
        logger.error(message, {
            ...context,
            why: "The app never sends this request: someone may be probing the API, or a client is broken",
        });
    } else {
        logger[level](message, context);
    }
}
