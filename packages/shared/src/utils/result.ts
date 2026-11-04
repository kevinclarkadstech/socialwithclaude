import type { AppError } from "../error-handling";
import type { Result } from "../types/result";

export function succeed<SuccessValue = undefined>(value?: SuccessValue): Result<SuccessValue> {
    return { ok: true, value: value, };
}

export function fail(error: AppError): Result<never> {
    return { ok: false, error, };
}
