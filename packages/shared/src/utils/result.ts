import type { AppError } from "../error-handling";
import type { Result } from "../types/result";

/**
 * A successful Result. With nothing to return, the value is null rather
 * than undefined, so it survives JSON (the API's responses) unchanged.
 */
export function succeed(): Result<null>;
export function succeed<SuccessValue>(value: SuccessValue): Result<SuccessValue>;
export function succeed<SuccessValue>(value?: SuccessValue): Result<SuccessValue | null> {
    return { ok: true, value: value === undefined ? null : value, };
}

export function fail(error: AppError): Result<never> {
    return { ok: false, error, };
}
