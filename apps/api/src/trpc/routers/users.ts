import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
    blockUser,
    followUser,
    getBlockedUsers,
    getProfileByUserId,
    getProfileByUsername,
    getUserIdByUsername,
    getUserSettings,
    unblockUser,
    unfollowUser,
    updateUserSettings,
} from "../../data-access/resolvers";
import { schema } from "../../data-access";
import { getUserBlockList, isBlocked } from "../blocking";
import { requireUserAndProfile } from "../context";
import { procedure, router } from "../trpc";

const usernameInput = z.object({ username: z.string().min(1) });

/** Same groups as the settings returned by getMySettings; every field optional. */
const updateSettingsInput = z.object({
    display: z
        .object({
            darkModeEnabled: z.boolean(),
        })
        .partial()
        .optional(),
    privacy: z
        .object({
            followersCanTag: z.boolean(),
            nonFollowersCanTag: z.boolean(),
            profileVisibility: z.enum(schema.profileVisibilities),
        })
        .partial()
        .optional(),
});

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

    /** NOT_FOUND if either user has blocked the other. */
    getUserProfile: procedure.input(usernameInput).query(async ({ ctx, input }) => {
        const profile = await getProfileByUsername(ctx.db, input.username, ctx.user?.id ?? null);
        if (!profile || isBlocked(await getUserBlockList(ctx), profile.userId)) {
            throw new TRPCError({ code: "NOT_FOUND" });
        }

        return profile;
    }),

    follow: procedure.input(usernameInput).mutation(async ({ ctx, input }) => {
        const { user } = await requireUserAndProfile(ctx);

        const targetUserId = await getUserIdByUsername(ctx.db, input.username);
        if (!targetUserId || isBlocked(await getUserBlockList(ctx), targetUserId)) {
            throw new TRPCError({ code: "NOT_FOUND" });
        }
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

    /**
     * Blocks a user: hides each other's content both ways and removes follows
     * in both directions. Blocking an already-blocked user succeeds.
     */
    blockUser: procedure.input(usernameInput).mutation(async ({ ctx, input }) => {
        const { user } = await requireUserAndProfile(ctx);

        const targetUserId = await getUserIdByUsername(ctx.db, input.username);
        if (!targetUserId) throw new TRPCError({ code: "NOT_FOUND" });
        if (targetUserId === user.id) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "CANNOT_BLOCK_SELF" });
        }

        await blockUser(ctx.db, user.id, targetUserId);
    }),

    /** Unblocking a user who isn't blocked succeeds. */
    unblockUser: procedure.input(usernameInput).mutation(async ({ ctx, input }) => {
        const { user } = await requireUserAndProfile(ctx);

        const targetUserId = await getUserIdByUsername(ctx.db, input.username);
        if (!targetUserId) throw new TRPCError({ code: "NOT_FOUND" });

        await unblockUser(ctx.db, user.id, targetUserId);
    }),

    /** Users the caller has blocked, most recent first. */
    getMyBlockedUsers: procedure.query(async ({ ctx }) => {
        const { user } = await requireUserAndProfile(ctx);
        return getBlockedUsers(ctx.db, user.id);
    }),

    /** The caller's settings, grouped as `display` and `privacy`. */
    getMySettings: procedure.query(async ({ ctx }) => {
        const { user } = await requireUserAndProfile(ctx);
        return getUserSettings(ctx.db, user.id);
    }),

    /**
     * Changes only the settings given; omitted groups and fields are left
     * as they are. Returns nothing.
     */
    updateMySettings: procedure.input(updateSettingsInput).mutation(async ({ ctx, input }) => {
        const { user } = await requireUserAndProfile(ctx);
        await updateUserSettings(ctx.db, user.id, { ...input.display, ...input.privacy });
    }),
});
