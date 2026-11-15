import type { Context } from "hono";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { GetCallingUser, GetCallingUserWithBlockList, SignedInUser, UserBlockList } from "@myapp/shared/domains";

import type { AppHonoEnv } from "../../index";
import { getUserBlockList, getUserProfileByUserId } from "../../data-access";

export function createContext(opts: FetchCreateContextFnOptions, c: Context<AppHonoEnv>) {
    const user = c.get("user");
    const session = c.get("session");

    /** Who's calling, from the session alone (no lookup): null when signed out. Queries and mutations decide whether they need it. */
    const getCallingUser: GetCallingUser = async () => {
        if (!user || !session) {
            return null;
        }
        return { userId: user.id, email: user.email, sessionId: session.id, hasProfile: user.hasProfile === true };
    };

    // Read at most once per request, however many batched procedures ask.
    let blockList: Promise<UserBlockList> | undefined;

    /** The caller with their block list, for the queries and mutations whose checks look at blocks. */
    const getCallingUserWithBlockList: GetCallingUserWithBlockList = async () => {
        const caller = await getCallingUser();
        if (!caller) {
            return null;
        }
        blockList ??= getUserBlockList({ userId: caller.userId });
        return { ...caller, blockList: await blockList };
    };

    /** The caller with their profile and block list: what the app loads once and keeps (users.me). */
    const getSignedInUser = async (): Promise<SignedInUser | null> => {
        const caller = await getCallingUserWithBlockList();
        if (!caller) {
            return null;
        }
        const profile = await getUserProfileByUserId({ userId: caller.userId });
        // The profile itself is the truth here, should the user's flag ever disagree with it.
        return { ...caller, hasProfile: profile !== null, profile };
    };

    return {
        auth: c.get("auth"),
        reqHeaders: opts.req.headers,
        /** Headers to send back on the response, e.g. Set-Cookie from better-auth. */
        resHeaders: opts.resHeaders,
        getCallingUser,
        getCallingUserWithBlockList,
        getSignedInUser,
        logger: c.get("logger"),
        /** Who rate limits count against: the signed-in user, else the IP address. */
        rateLimitKey: user ? `user:${user.id}` : `ip:${c.get("clientIp")}`,
        rateLimiter: c.get("rateLimiter"),
        featureFlagStore: c.get("featureFlagStore"),
    };
}

export type TRPCContext = ReturnType<typeof createContext>;
