import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
    followUser,
    getProfileByUserId,
    getProfileByUsername,
    getUserIdByUsername,
    unfollowUser,
} from "../../data-access/resolvers";
import { requireUserAndProfile } from "../context";
import { procedure, router } from "../trpc";

const usernameInput = z.object({ username: z.string().min(1) });

export const usersRouter = router({
    /**
     * The current viewer. null when signed out; `profile` is null until
     * sign-up (auth.signUp) is complete.
     */
    me: procedure.query(async ({ ctx }) => {
        if (!ctx.user) return null;

        const profile = await getProfileByUserId(ctx.db, ctx.user.id);
        return { user: ctx.user, profile };
    }),

    getUserProfile: procedure.input(usernameInput).query(async ({ ctx, input }) => {
        const profile = await getProfileByUsername(ctx.db, input.username, ctx.user?.id ?? null);
        if (!profile) throw new TRPCError({ code: "NOT_FOUND" });

        return profile;
    }),

    follow: procedure.input(usernameInput).mutation(async ({ ctx, input }) => {
        const { user } = await requireUserAndProfile(ctx);

        const targetUserId = await getUserIdByUsername(ctx.db, input.username);
        if (!targetUserId) throw new TRPCError({ code: "NOT_FOUND" });
        if (targetUserId === user.id) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot follow yourself" });
        }

        await followUser(ctx.db, user.id, targetUserId);
    }),

    unfollow: procedure.input(usernameInput).mutation(async ({ ctx, input }) => {
        const { user } = await requireUserAndProfile(ctx);

        const targetUserId = await getUserIdByUsername(ctx.db, input.username);
        if (!targetUserId) throw new TRPCError({ code: "NOT_FOUND" });

        await unfollowUser(ctx.db, user.id, targetUserId);
    }),
});
