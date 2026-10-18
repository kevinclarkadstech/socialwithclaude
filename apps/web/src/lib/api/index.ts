import { createTRPCClient, httpBatchLink, TRPCClientError } from "@trpc/client";
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
