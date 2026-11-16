import type { Context } from "hono";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { GetCallingUser } from "@myapp/shared/domains";

import type { AppHonoEnv } from "../../index";

export function createContext(opts: FetchCreateContextFnOptions, c: Context<AppHonoEnv>) {
    const user = c.get("user");
    const callingUser = c.get("callingUser");

    /**
     * Who's calling: null when signed out. Queries and mutations decide whether
     * they need it. Loaded with the session (see auth's customSession), so this
     * runs no queries.
     */
    const getCallingUser: GetCallingUser = () => Promise.resolve(callingUser);

    return {
        auth: c.get("auth"),
        reqHeaders: opts.req.headers,
        /** Headers to send back on the response, e.g. Set-Cookie from better-auth. */
        resHeaders: opts.resHeaders,
        getCallingUser,
        logger: c.get("logger"),
        /** Who rate limits count against: the signed-in user, else the IP address. */
        rateLimitKey: user ? `user:${user.id}` : `ip:${c.get("clientIp")}`,
        rateLimiter: c.get("rateLimiter"),
        featureFlagStore: c.get("featureFlagStore"),
    };
}

export type TRPCContext = ReturnType<typeof createContext>;
