import type { Context } from "hono";
import { TRPCError } from "@trpc/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

import type { AppHonoEnv } from "../../index";
import { db, getProfileByUserId } from "../../data-access";
import { mediaStorage } from "../../media";

export function createContext(opts: FetchCreateContextFnOptions, c: Context<AppHonoEnv>) {
    return {
        db,
        storage: mediaStorage,
        auth: c.get("auth"),
        reqHeaders: opts.req.headers,
        /** Headers to send back on the response, e.g. Set-Cookie from better-auth. */
        resHeaders: opts.resHeaders,
        user: c.get("user"),
        session: c.get("session"),
        logger: c.get("logger"),
        featureFlagStore: c.get("featureFlagStore"),
    };
}

export type TRPCContext = ReturnType<typeof createContext>;

/**
 * Returns the signed-in user, or throws UNAUTHORIZED. Only for onboarding
 * (e.g. creating a profile); everything else should use requireUserAndProfile.
 */
export function requireUser(ctx: TRPCContext) {
    if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
    return ctx.user;
}

/**
 * Returns the signed-in user and their profile. Throws UNAUTHORIZED when
 * signed out, or FORBIDDEN ("PROFILE_REQUIRED") when onboarding isn't done.
 */
export async function requireUserAndProfile(ctx: TRPCContext) {
    const user = requireUser(ctx);
    const profile = await getProfileByUserId(ctx.db, user.id);
    if (!profile) throw new TRPCError({ code: "FORBIDDEN", message: "PROFILE_REQUIRED" });
    return { user, profile };
}

/** What withMedia() needs from the request. */
export function mediaContext(ctx: TRPCContext, userId: string) {
    return { storage: ctx.storage, logger: ctx.logger, userId };
}
