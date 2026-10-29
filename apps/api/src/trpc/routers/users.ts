import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
    acceptFollowRequest,
    blockUser,
    denyFollowRequest,
    followUser,
    getBlockedUsers,
    getFollowRequestCount,
    getFollowRequests,
    getProfileByUserId,
    getProfileByUsername,
    getUserIdByUsername,
    getUserSettings,
    searchProfiles,
    unblockUser,
    unfollowUser,
    updateUserSettings,
} from "../../data-access/resolvers";
import { schema } from "../../data-access";
import { getUserBlockList, isBlocked } from "../blocking";
import { requireUserAndProfile, type TRPCContext } from "../context";
import { procedure, router } from "../trpc";
import type { Result } from "@myapp/shared/types/result";

const usernameInput = z.object({ username: z.string().min(1) });
const pageInput = z.object({
    cursor: z.string().nullish(),
    limit: z.number().int().min(1).max(100).default(20),
});

const requestNotFound = () => new TRPCError({ code: "NOT_FOUND", message: "REQUEST_NOT_FOUND" });

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

/** Profiles matching `query` that the caller can see: users blocked either way are left out. */
export async function searchVisibleProfiles(ctx: TRPCContext, query: string, { limit }: { limit: number }) {
    const [profiles, blockList] = await Promise.all([
        searchProfiles(ctx.db, query, { limit }),
        getUserBlockList(ctx),
    ]);
    return profiles.filter((p) => !isBlocked(blockList, p.userId));
}

export const usersRouter = router({
    /**
     * The current viewer. null when signed out; `profile` is null until
     * sign-up (auth.signUp) is complete.
     */
    me: procedure.input(z.object({ id: z.string() })).query(async ({ ctx }): Promise<Result<null | { user: any, profile: any }>> => {
        if (!ctx.user) {
            return {
                ok: true,
                value: null,
            }
        }

        const profile = await getProfileByUserId(ctx.db, ctx.user.id);
        return { ok: true, value: { user: ctx.user, profile } };
    }),

    /** NOT_FOUND if either user has blocked the other. */
    getUserProfile: procedure.input(usernameInput).query(async ({ ctx, input }) => {
        const profile = await getProfileByUsername(ctx.db, input.username, ctx.user?.id ?? null);
        if (!profile || isBlocked(await getUserBlockList(ctx), profile.userId)) {
            throw new TRPCError({ code: "NOT_FOUND" });
        }

        return profile;
    }),

    /**
     * Follows a user: right away if their profile is public, otherwise as a
     * request they accept or deny. Returns `followStatus` as the caller now
     * sees it: "following" or "requested". A denied request still shows as
     * "requested" (denial is silent). Following again is a no-op.
     */
    follow: procedure.input(usernameInput).mutation(async ({ ctx, input }) => {
        const { user } = await requireUserAndProfile(ctx);

        const targetUserId = await getUserIdByUsername(ctx.db, input.username);
        if (!targetUserId || isBlocked(await getUserBlockList(ctx), targetUserId)) {
            throw new TRPCError({ code: "NOT_FOUND" });
        }
        if (targetUserId === user.id) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot follow yourself" });
        }

        return { followStatus: await followUser(ctx.db, user.id, targetUserId) };
    }),

    /** Unfollows a user, or cancels a follow request. A no-op if neither. */
    unfollow: procedure.input(usernameInput).mutation(async ({ ctx, input }) => {
        const { user } = await requireUserAndProfile(ctx);

        const targetUserId = await getUserIdByUsername(ctx.db, input.username);
        if (!targetUserId) throw new TRPCError({ code: "NOT_FOUND" });

        await unfollowUser(ctx.db, user.id, targetUserId);
    }),

    /**
     * The caller's pending follow requests, newest first, with each
     * requester's profile. (Blocking removes requests, so none are from
     * blocked users.) Pass `nextCursor` as `cursor`.
     */
    getMyFollowRequests: procedure.input(pageInput).query(async ({ ctx, input }) => {
        const { user } = await requireUserAndProfile(ctx);
        return getFollowRequests(ctx.db, user.id, input);
    }),

    /** How many pending follow requests the caller has, for a badge. */
    getMyFollowRequestCount: procedure.query(async ({ ctx }) => {
        const { user } = await requireUserAndProfile(ctx);
        return getFollowRequestCount(ctx.db, user.id);
    }),

    /**
     * Accepts a follow request from `username`: they become a follower.
     * NOT_FOUND "REQUEST_NOT_FOUND" if there's no pending request from them.
     * Accepting again succeeds.
     */
    acceptFollowRequest: procedure.input(usernameInput).mutation(async ({ ctx, input }) => {
        const { user } = await requireUserAndProfile(ctx);
        const followerId = await getUserIdByUsername(ctx.db, input.username);
        if (!followerId || !(await acceptFollowRequest(ctx.db, user.id, followerId))) {
            throw requestNotFound();
        }
    }),

    /**
     * Denies a follow request from `username`. They aren't told: they keep
     * seeing "Requested" and can't ask again. NOT_FOUND "REQUEST_NOT_FOUND"
     * if there's no pending request from them. Denying again succeeds.
     */
    denyFollowRequest: procedure.input(usernameInput).mutation(async ({ ctx, input }) => {
        const { user } = await requireUserAndProfile(ctx);
        const followerId = await getUserIdByUsername(ctx.db, input.username);
        if (!followerId || !(await denyFollowRequest(ctx.db, user.id, followerId))) {
            throw requestNotFound();
        }
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
