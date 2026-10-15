import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { signUp } from "../../data-access";
import { requireUser } from "../context";
import { procedure, router } from "../trpc";

const signUpInput = z.object({
    username: z
        .string()
        .min(3)
        .max(30)
        .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers and underscores"),
    firstName: z.string().trim().max(50).optional(),
    lastName: z.string().trim().max(50).optional(),
    bio: z.string().trim().max(500).optional(),
});

export const authRouter = router({
    /**
     * Completes sign-up for an already-authenticated user by creating their
     * profile and settings. Fails with CONFLICT "USERNAME_TAKEN" (show to the
     * user) or CONFLICT "PROFILE_ALREADY_EXISTS" (the UI shouldn't allow this).
     */
    signUp: procedure.input(signUpInput).mutation(async ({ ctx, input }) => {
        const user = requireUser(ctx);

        if (!ctx.featureFlagStore.isEnabled("userSignup")) {
            throw new TRPCError({ code: "FORBIDDEN", message: "SIGNUP_DISABLED" });
        }

        return signUp(ctx.db, { userId: user.id, ...input });
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
