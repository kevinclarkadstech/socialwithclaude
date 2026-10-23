import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { signUpInput } from "@myapp/shared/types/users";

import { getActiveSessions, getActiveSessionToken, signUp } from "../../data-access";
import { requireUser, type TRPCContext } from "../context";
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
     * profile and settings. Fails with CONFLICT "USERNAME_TAKEN" (show to the
     * user) or CONFLICT "PROFILE_ALREADY_EXISTS" (the UI shouldn't allow this).
     */
    signUp: procedure.input(signUpInput).mutation(async ({ ctx, input }) => {
        const user = requireUser(ctx);
        return signUp(ctx.db, { userId: user.id, ...input });
    }),

    /**
     * Where the caller is signed in: their unexpired sessions, most recently
     * active first. `current` marks the one this request came from.
     * `userAgent` describes the browser/app; IP addresses aren't returned.
     */
    getMySessions: procedure.query(async ({ ctx }) => {
        const { user, session } = requireSession(ctx);
        const sessions = await getActiveSessions(ctx.db, user.id);
        return sessions.map((s) => ({ ...s, current: s.id === session.id }));
    }),

    /**
     * Signs one of the caller's other devices out. NOT_FOUND
     * "SESSION_NOT_FOUND" if it isn't theirs or has already ended (so
     * repeating it is harmless to ignore); BAD_REQUEST "CURRENT_SESSION" for
     * this device (use signOut, which also clears the cookie).
     */
    revokeSession: procedure
        .input(z.object({ id: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
            const { user, session } = requireSession(ctx);
            if (input.id === session.id) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "CURRENT_SESSION" });
            }
            const token = await getActiveSessionToken(ctx.db, user.id, input.id);
            if (!token) throw new TRPCError({ code: "NOT_FOUND", message: "SESSION_NOT_FOUND" });

            await ctx.auth.api.revokeSession({ body: { token }, headers: ctx.reqHeaders });
        }),

    /** Signs every device out except this one. Returns nothing. */
    revokeOtherSessions: procedure.mutation(async ({ ctx }) => {
        requireSession(ctx);
        await ctx.auth.api.revokeOtherSessions({ headers: ctx.reqHeaders });
    }),

    signOut: procedure.mutation(async ({ ctx }) => {
        // Signed-out callers have nothing to clear; treat as success.
        if (!ctx.session) return { success: true };

        const { headers } = await ctx.auth.api.signOut({
            headers: ctx.reqHeaders,
            returnHeaders: true,
        });

        // Forward better-auth's cookie-clearing Set-Cookie headers to the client.
        for (const cookie of headers.getSetCookie()) {
            ctx.resHeaders.append("set-cookie", cookie);
        }

        return { success: true };
    }),
});
