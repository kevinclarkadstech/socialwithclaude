import { notFoundError, type AppError } from "../../../../error-handling";
import { fail } from "../../../../utils/result";
import type { Result } from "../../../../types/result";

/**
 * The error a caller gets when a check on a post (or something on it)
 * disallowed them. Signed out or mid-sign-up stays as it is, so the app can
 * ask them to sign in. Anything else is not found (with `message`), so
 * nobody can tell that a private or blocked post exists.
 */
export function hideUnviewablePost({ error, message }: { error: AppError; message: string }): Result<never> {
    const reason = error.metadata?.reason;
    if (reason === "not-signed-in" || reason === "profile-required") {
        return fail(error);
    }
    return fail(notFoundError(message));
}
