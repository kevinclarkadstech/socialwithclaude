import type { Context } from "hono";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { GetCallingUser } from "@myapp/shared/domains";

import type { AppHonoEnv } from "../../index";
import { getUserBlockList, getUserProfileByUserId } from "../../data-access";

export function createContext(opts: FetchCreateContextFnOptions, c: Context<AppHonoEnv>) {
    const user = c.get("user");
    const session = c.get("session");

    /** Who's calling: null when signed out. Queries and mutations decide whether they need it. */
    const getCallingUser: GetCallingUser = async () => {
        if (!user || !session) return null;
        const [profile, blockList] = await Promise.all([
            getUserProfileByUserId({ userId: user.id }),
            getUserBlockList({ userId: user.id }),
        ]);
        return { userId: user.id, email: user.email, sessionId: session.id, profile, blockList };
    };

    return {
        auth: c.get("auth"),
        reqHeaders: opts.req.headers,
        /** Headers to send back on the response, e.g. Set-Cookie from better-auth. */
        resHeaders: opts.resHeaders,
        getCallingUser,
        logger: c.get("logger"),
        featureFlagStore: c.get("featureFlagStore"),
    };
}

export type TRPCContext = ReturnType<typeof createContext>;
