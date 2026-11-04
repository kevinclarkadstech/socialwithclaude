import type { AppError } from "../error-handling";
import type { Result } from "../types/result";

export function succeed(): Result<undefined>;
export function succeed<SuccessValue>(value: SuccessValue): Result<SuccessValue>;
export function succeed<SuccessValue>(value?: SuccessValue): Result<SuccessValue | undefined> {
    return { ok: true, value, };
}

export function fail(error: AppError): Result<never> {
    return { ok: false, error, };
}
