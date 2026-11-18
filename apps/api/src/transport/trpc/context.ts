import type { Context } from "hono";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { GetCallingUser } from "@myapp/shared/domains";
import type { ErrorReportContext } from "../../observability";

import type { AppHonoEnv } from "../../index";

export function createContext(opts: FetchCreateContextFnOptions, c: Context<AppHonoEnv>) {
    const user = c.get("user");
    const callingUser = c.get("callingUser");

    /**
     * Who's calling: null when signed out. Queries and mutations decide whether
     * they need it. Loaded with the session (see auth's customSession), so this
     * runs no queries. Someone whose account is scheduled for deletion counts as
     * signed out here, so they can't do anything but restore it (or sign out).
     */
    const getCallingUser: GetCallingUser = () => Promise.resolve(callingUser?.deletionScheduledAt ? null : callingUser);
    /** Who's calling, even with their account scheduled for deletion: only for the account procedures (deleting, restoring, signing out). */
    const getAccountHolder: GetCallingUser = () => Promise.resolve(callingUser);

    // The same ids every other report from the API carries; a procedure adds its own name.
    const errorReportContext: ErrorReportContext = {
        requestId: c.get("requestId"),
        userId: user?.id,
        method: c.req.method,
        path: c.req.path,
    };

    return {
        auth: c.get("auth"),
        reqHeaders: opts.req.headers,
        /** Headers to send back on the response, e.g. Set-Cookie from better-auth. */
        resHeaders: opts.resHeaders,
        getCallingUser,
        getAccountHolder,
        logger: c.get("logger"),
        /** Who and what to attach to an error report from this request (see reportingFailures). */
        errorReportContext,
        /** Who rate limits count against: the signed-in user, else the IP address. */
        rateLimitKey: user ? `user:${user.id}` : `ip:${c.get("clientIp")}`,
        rateLimiter: c.get("rateLimiter"),
        featureFlagStore: c.get("featureFlagStore"),
    };
}

export type TRPCContext = ReturnType<typeof createContext>;
