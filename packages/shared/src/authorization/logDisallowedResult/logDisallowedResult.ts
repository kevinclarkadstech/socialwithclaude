import type { AppError } from "../../error-handling";
import type { AppLogger } from "../../observability";
import { disallowedReasons, type DisallowedReason } from "../disallowedReasons/disallowedReasons";

/**
 * Logs a failed authorization check, at its reason's level (see disallowedReasons).
 * `error` level is for requests the app never sends; alert on their rate,
 * not on each one. Pass ids only in `details`, never content.
 */
export function logDisallowedResult({ logger, result, details }: {
    logger: AppLogger;
    result: { ok: false; error: AppError };
    details: { action: string; callerId: string | undefined } & Record<string, unknown>;
}) {
    const reason = result.error.metadata?.reason as DisallowedReason | undefined;
    const level = (reason && disallowedReasons[reason]?.logLevel) ?? "warn";
    const logContext = { event: "authorization.disallowed", reason, errorType: result.error.type, ...details };
    const message = `Disallowed ${details.action}`;

    if (level === "error") {
        logger.error(message, {
            ...logContext,
            why: "The app never sends this request: someone may be probing the API, or a client is broken",
        });
    } else {
        logger[level](message, logContext);
    }
}
