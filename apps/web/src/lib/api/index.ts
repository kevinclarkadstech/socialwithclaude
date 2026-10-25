import { createTRPCClient, httpBatchLink, TRPCClientError } from "@trpc/client";
import type { AppError } from "@myapp/shared/types/app-error";
import type { Result } from "@myapp/shared/types/result";
import type { AppRouter } from "../../../../api/src/trpc";

import { config } from "../config";

/** Typed client for the API's tRPC routers. Sends the session cookie. */
export const api = createTRPCClient<AppRouter>({
    links: [
        httpBatchLink({
            url: `${config.apiUrl}/api/trpc`,
            fetch: (input, init) => fetch(input, { ...init, credentials: "include" }),
        }),
    ],
});

/** The error `message` the API sent (e.g. "USERNAME_TAKEN"), or null. */
export function apiErrorMessage(err: unknown): string | null {
    return err instanceof TRPCClientError ? err.message : null;
}

/**
 * A failed `Result` from the API, thrown by `unwrap` so loaders can treat it
 * like any other error; `appError.type` says what went wrong.
 */
export class ApiResultError extends Error {
    readonly appError: AppError;

    constructor(appError: AppError) {
        super(appError.message ?? appError.type);
        this.name = "ApiResultError";
        this.appError = appError;
    }
}

/** The value of a successful `Result`; throws `ApiResultError` for a failed one. */
export function unwrap<T>(result: Result<T>): T {
    if (result.error) throw new ApiResultError(result.error);
    return result.value as T;
}

/** The `AppError` type (e.g. "entity-not-found") of an error from `unwrap`, or null. */
export function appErrorType(err: unknown): AppError["type"] | null {
    return err instanceof ApiResultError ? err.appError.type : null;
}
