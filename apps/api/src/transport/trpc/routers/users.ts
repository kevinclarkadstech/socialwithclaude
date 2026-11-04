import {
    AcceptFollowRequestMutationInputSchema,
    BlockUserMutationInputSchema,
    CreateUserSaveMutationInputSchema,
    DeleteUserSaveMutationInputSchema,
    DenyFollowRequestMutationInputSchema,
    FollowUserMutationInputSchema,
    GetMeQueryInputSchema,
    GetMyBlockedUsersQueryInputSchema,
    GetMyFollowRequestsQueryInputSchema,
    GetMySavesQueryInputSchema,
    GetMySettingsQueryInputSchema,
    GetUserProfileQueryInputSchema,
    UnblockUserMutationInputSchema,
    UnfollowUserMutationInputSchema,
    UpdateMySettingsMutationInputSchema,
    acceptFollowRequestMutation,
    blockUserMutation,
    createUserSaveMutation,
    deleteUserSaveMutation,
    denyFollowRequestMutation,
    followUserMutation,
    getMeQuery,
    getMyBlockedUsersQuery,
    getMyFollowRequestsQuery,
    getMySavesQuery,
    getMySettingsQuery,
    getUserProfileQuery,
    unblockUserMutation,
    unfollowUserMutation,
    updateMySettingsMutation,
} from "@myapp/shared/domains";

import {
    acceptUserFollowRequest,
    blockUser,
    createUserSave,
    deleteUserSave,
    denyUserFollowRequest,
    followUser,
    getUserBlocks,
    getUserFollowRequests,
    getUserProfileByUsername,
    getUserSaves,
    getUserSettings,
    unblockUser,
    unfollowUser,
    updateUserSettings,
} from "../../../data-access";
import { procedure, router } from "../trpc";

export const usersRouter = router({
    me: procedure.input(GetMeQueryInputSchema).query(({ ctx, input }) =>
        getMeQuery({ input, context: { logger: ctx.logger }, dependencies: { getCallingUser: ctx.getCallingUser } }),
    ),

    getUserProfile: procedure.input(GetUserProfileQueryInputSchema).query(({ ctx, input }) =>
        getUserProfileQuery({ input, context: { logger: ctx.logger }, dependencies: { getUserProfileByUsername } }),
    ),

    follow: procedure.input(FollowUserMutationInputSchema).mutation(({ ctx, input }) =>
        followUserMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getUserProfileByUsername, getUserSettings, followUser },
        }),
    ),

    unfollow: procedure.input(UnfollowUserMutationInputSchema).mutation(({ ctx, input }) =>
        unfollowUserMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getUserProfileByUsername, unfollowUser },
        }),
    ),

    getMyFollowRequests: procedure.input(GetMyFollowRequestsQueryInputSchema).query(({ ctx, input }) =>
        getMyFollowRequestsQuery({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getUserFollowRequests },
        }),
    ),

    acceptFollowRequest: procedure.input(AcceptFollowRequestMutationInputSchema).mutation(({ ctx, input }) =>
        acceptFollowRequestMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getUserProfileByUsername, acceptUserFollowRequest },
        }),
    ),

    denyFollowRequest: procedure.input(DenyFollowRequestMutationInputSchema).mutation(({ ctx, input }) =>
        denyFollowRequestMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getUserProfileByUsername, denyUserFollowRequest },
        }),
    ),

    blockUser: procedure.input(BlockUserMutationInputSchema).mutation(({ ctx, input }) =>
        blockUserMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getUserProfileByUsername, blockUser },
        }),
    ),

    unblockUser: procedure.input(UnblockUserMutationInputSchema).mutation(({ ctx, input }) =>
        unblockUserMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getUserProfileByUsername, unblockUser },
        }),
    ),

    getMyBlockedUsers: procedure.input(GetMyBlockedUsersQueryInputSchema).query(({ ctx, input }) =>
        getMyBlockedUsersQuery({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getUserBlocks },
        }),
    ),

    getMySettings: procedure.input(GetMySettingsQueryInputSchema).query(({ ctx, input }) =>
        getMySettingsQuery({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getUserSettings },
        }),
    ),

    updateMySettings: procedure.input(UpdateMySettingsMutationInputSchema).mutation(({ ctx, input }) =>
        updateMySettingsMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, updateUserSettings },
        }),
    ),

    save: procedure.input(CreateUserSaveMutationInputSchema).mutation(({ ctx, input }) =>
        createUserSaveMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, createUserSave },
        }),
    ),

    unsave: procedure.input(DeleteUserSaveMutationInputSchema).mutation(({ ctx, input }) =>
        deleteUserSaveMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, deleteUserSave },
        }),
    ),

    getMySaves: procedure.input(GetMySavesQueryInputSchema).query(({ ctx, input }) =>
        getMySavesQuery({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getUserSaves },
        }),
    ),
});
