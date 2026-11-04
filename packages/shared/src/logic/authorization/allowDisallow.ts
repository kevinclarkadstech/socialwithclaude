import { createAppError } from "../../error-handling";
import type { Result } from "../../types/result";
import { disallowedReasons, type DisallowedReason } from "./disallowedReasons";

/** What a check returns: the caller it allowed (narrowed), or why not. */
export type AuthorizationResult<Caller> = Result<Caller>;

export function allow<Caller>(caller: Caller): AuthorizationResult<Caller> {
    return { ok: true, value: caller };
}

/**
 * Fails with the error `reason` maps to (see disallowedReasons), with
 * `message` instead of its default if given. The reason is kept in the
 * error's metadata for logDisallowedResult.
 */
export function disallow(reason: DisallowedReason, message?: string): AuthorizationResult<never> {
    const { errorType, message: defaultMessage } = disallowedReasons[reason];
    return {
        ok: false,
        error: createAppError({ type: errorType, message: message ?? defaultMessage, metadata: { reason } }),
    };
}
