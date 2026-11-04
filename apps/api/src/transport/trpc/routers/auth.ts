import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { UserProfileSchema } from "@myapp/shared/domains";
import { succeed } from "@myapp/shared/utils";

import { createUserProfile, getUserProfileByUserId, getUserProfileByUsername, getUserSessions } from "../../../data-access";
import { requireUser, type TRPCContext } from "../context";
import { conflict, invalid, notFound } from "../errors";
import { procedure, router } from "../trpc";

/** The signed-in user and the session this request came from, or UNAUTHORIZED. */
function requireSession(ctx: TRPCContext) {
    const user = requireUser(ctx);
    if (!ctx.session) throw new TRPCError({ code: "UNAUTHORIZED" });
    return { user, session: ctx.session };
}

/*
 * Signed-in devices. These read the sessions table directly instead of
 * better-auth's /list-sessions, which needs a "fresh" session (signed in
 * within a day) and returns every session's token to the browser. Here the
 * browser only ever sees session ids; revoking looks the token up on the
 * server and goes through better-auth, so its own cleanup still runs.
 */
export const authRouter = router({
    /**
     * Completes sign-up for an already-authenticated user by creating their
     * profile and settings. Fails with a conflict if the username is taken or
     * the user already has a profile.
     */
    signUp: procedure
        .input(UserProfileSchema.pick({ username: true, firstName: true, lastName: true, about: true }))
        .mutation(async ({ ctx, input }) => {
            const user = requireUser(ctx);
            if (await getUserProfileByUserId({ userId: user.id })) return conflict("Profile already exists");
            if (await getUserProfileByUsername({ username: input.username })) return conflict("Username is taken");
            return succeed(await createUserProfile({ userId: user.id, ...input }));
        }),

    /**
     * Where the caller is signed in, most recently active first. `current`
     * marks the one this request came from. Tokens aren't returned.
     */
    getMySessions: procedure.query(async ({ ctx }) => {
        const { user, session } = requireSession(ctx);
        const sessions = await getUserSessions({ userId: user.id });
        return succeed(sessions.map((s) => ({
            id: s.id,
            ipAddress: s.ipAddress,
            userAgent: s.userAgent,
            expiresAt: s.expiresAt,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
            current: s.id === session.id,
        })));
    }),

    /** Signs one of the caller's other devices out (use signOut for this one). */
    revokeSession: procedure
        .input(z.object({ id: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
            const { user, session } = requireSession(ctx);
            if (input.id === session.id) return invalid("Use signOut for the current session");

            const target = (await getUserSessions({ userId: user.id })).find((s) => s.id === input.id);
            if (!target) return notFound("Session not found");

            await ctx.auth.api.revokeSession({ body: { token: target.token }, headers: ctx.reqHeaders });
            return succeed();
        }),

    /** Signs every device out except this one. */
    revokeOtherSessions: procedure.mutation(async ({ ctx }) => {
        requireSession(ctx);
        await ctx.auth.api.revokeOtherSessions({ headers: ctx.reqHeaders });
        return succeed();
    }),

    signOut: procedure.mutation(async ({ ctx }) => {
        // Signed-out callers have nothing to clear; treat as success.
        if (!ctx.session) return succeed();

        const { headers } = await ctx.auth.api.signOut({
            headers: ctx.reqHeaders,
            returnHeaders: true,
        });

        // Forward better-auth's cookie-clearing Set-Cookie headers to the client.
        for (const cookie of headers.getSetCookie()) {
            ctx.resHeaders.append("set-cookie", cookie);
        }
        return succeed();
    }),
});
