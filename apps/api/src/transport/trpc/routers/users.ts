import { z } from "zod";
import { UserProfileSchema, UserSaveTypeSchema, UserSettingsSchema } from "@myapp/shared/domains";
import { PageInputSchema } from "@myapp/shared/common";
import { succeed } from "@myapp/shared/utils";

import {
    acceptUserFollowRequest,
    blockUser,
    createUserSave,
    deleteUserSave,
    denyUserFollowRequest,
    followUser,
    getUserBlocks,
    getUserFollowRequests,
    getUserProfileByUserId,
    getUserProfileByUsername,
    getUserSaves,
    getUserSettings,
    unblockUser,
    unfollowUser,
    updateUserSettings,
} from "../../../data-access";
import { requireUserAndProfile, type TRPCContext } from "../context";
import { invalid, notFound } from "../errors";
import { procedure, router } from "../trpc";

const usernameInput = UserProfileSchema.pick({ username: true });
const saveInput = z.object({ type: UserSaveTypeSchema, id: z.ulid() });

/** The signed-in user (with their profile) and the user `username` names. */
async function requireTarget(ctx: TRPCContext, username: string) {
    const { user } = await requireUserAndProfile(ctx);
    return { user, target: await getUserProfileByUsername({ username }) };
}

export const usersRouter = router({
    /**
     * The current viewer. null when signed out; `profile` is null until
     * sign-up (auth.signUp) is complete.
     */
    me: procedure.query(async ({ ctx }) => {
        if (!ctx.user) return succeed(null);
        const profile = await getUserProfileByUserId({ userId: ctx.user.id });
        return succeed({ user: ctx.user, profile });
    }),

    getUserProfile: procedure.input(usernameInput).query(async ({ input }) => {
        const profile = await getUserProfileByUsername(input);
        return profile ? succeed(profile) : notFound("User not found");
    }),

    /** Follows a user, or asks to if their profile is followers-only. Following again is a no-op. */
    follow: procedure.input(usernameInput).mutation(async ({ ctx, input }) => {
        const { user, target } = await requireTarget(ctx, input.username);
        if (!target) return notFound("User not found");
        if (target.userId === user.id) return invalid("Cannot follow yourself");

        const follow = await followUser({ followerId: user.id, followingId: target.userId });
        return follow ? succeed(follow) : notFound("User not found");
    }),

    /** Unfollows a user, or cancels a follow request. Succeeds if neither. */
    unfollow: procedure.input(usernameInput).mutation(async ({ ctx, input }) => {
        const { user, target } = await requireTarget(ctx, input.username);
        if (!target) return notFound("User not found");
        await unfollowUser({ followerId: user.id, followingId: target.userId });
        return succeed();
    }),

    /** Pending requests to follow the caller, newest first. */
    getMyFollowRequests: procedure.input(PageInputSchema).query(async ({ ctx, input }) => {
        const { user } = await requireUserAndProfile(ctx);
        return succeed(await getUserFollowRequests({ userId: user.id, ...input }));
    }),

    acceptFollowRequest: procedure.input(usernameInput).mutation(async ({ ctx, input }) => {
        const { user, target } = await requireTarget(ctx, input.username);
        const follow = target && (await acceptUserFollowRequest({ userId: user.id, followerId: target.userId }));
        return follow ? succeed(follow) : notFound("Request not found");
    }),

    /** The requester isn't told: they keep seeing their request as pending. */
    denyFollowRequest: procedure.input(usernameInput).mutation(async ({ ctx, input }) => {
        const { user, target } = await requireTarget(ctx, input.username);
        const follow = target && (await denyUserFollowRequest({ userId: user.id, followerId: target.userId }));
        return follow ? succeed(follow) : notFound("Request not found");
    }),

    /** Blocking an already-blocked user succeeds. */
    blockUser: procedure.input(usernameInput).mutation(async ({ ctx, input }) => {
        const { user, target } = await requireTarget(ctx, input.username);
        if (!target) return notFound("User not found");
        if (target.userId === user.id) return invalid("Cannot block yourself");
        return succeed(await blockUser({ userId: user.id, blockedUserId: target.userId }));
    }),

    /** Unblocking a user who isn't blocked succeeds. */
    unblockUser: procedure.input(usernameInput).mutation(async ({ ctx, input }) => {
        const { user, target } = await requireTarget(ctx, input.username);
        if (!target) return notFound("User not found");
        await unblockUser({ userId: user.id, blockedUserId: target.userId });
        return succeed();
    }),

    /** Users the caller has blocked, most recent first. */
    getMyBlockedUsers: procedure.input(PageInputSchema).query(async ({ ctx, input }) => {
        const { user } = await requireUserAndProfile(ctx);
        return succeed(await getUserBlocks({ userId: user.id, ...input }));
    }),

    getMySettings: procedure.query(async ({ ctx }) => {
        const { user } = await requireUserAndProfile(ctx);
        const settings = await getUserSettings({ userId: user.id });
        return settings ? succeed(settings) : notFound("Settings not found");
    }),

    /** Changes only the settings given. */
    updateMySettings: procedure
        .input(UserSettingsSchema.pick({
            darkModeEnabled: true,
            followersCanTag: true,
            nonFollowersCanTag: true,
            profileVisibility: true,
        }).partial())
        .mutation(async ({ ctx, input }) => {
            const { user } = await requireUserAndProfile(ctx);
            const settings = await updateUserSettings({ userId: user.id, ...input });
            return settings ? succeed(settings) : notFound("Settings not found");
        }),

    /** Saves a post, comment or chat message. Saving again succeeds. */
    save: procedure.input(saveInput).mutation(async ({ ctx, input }) => {
        const { user } = await requireUserAndProfile(ctx);
        await createUserSave({ userId: user.id, ...input });
        return succeed();
    }),

    /** Unsaving something that isn't saved succeeds. */
    unsave: procedure.input(saveInput).mutation(async ({ ctx, input }) => {
        const { user } = await requireUserAndProfile(ctx);
        await deleteUserSave({ userId: user.id, ...input });
        return succeed();
    }),

    /** What the caller saved, most recent first. */
    getMySaves: procedure.input(PageInputSchema).query(async ({ ctx, input }) => {
        const { user } = await requireUserAndProfile(ctx);
        return succeed(await getUserSaves({ userId: user.id, ...input }));
    }),
});
