import type { AppError } from "../../error-handling";
import type { Result } from "../../types/result";
import type { DisallowedReason } from "./disallowedReason";

/** What a check returns: the caller it allowed (narrowed), or why not. */
export type AuthorizationResult<Caller> = Result<Caller>;

export function allow<Caller>(caller: Caller): AuthorizationResult<Caller> {
    return { ok: true, value: caller };
}

/** `reason` goes in the error's metadata, for logDisallowedResult. */
export function disallow(reason: DisallowedReason, error: AppError): AuthorizationResult<never> {
    return { ok: false, error: { ...error, metadata: { ...error.metadata, reason } } };
}
