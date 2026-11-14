import {
    AcceptFollowRequestMutationInputSchema,
    ConfirmProfilePhotoUploadMutationInputSchema,
    CreateProfilePhotoUploadMutationInputSchema,
    RemoveProfilePhotoMutationInputSchema,
    confirmProfilePhotoUploadMutation,
    createProfilePhotoUploadMutation,
    removeProfilePhotoMutation,
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
    UpdateMyProfileMutationInputSchema,
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
    updateMyProfileMutation,
    updateMySettingsMutation,
} from "@myapp/shared/domains";

import {
    acceptUserFollowRequest,
    blockUser,
    createUserSave,
    deleteUserSave,
    denyUserFollowRequest,
    followUser,
    getProfileVisibility,
    getUserBlockViews,
    getUserFollowStatus,
    getUserFollowRequestViews,
    getUserProfileByUsername,
    getUserSaves,
    getUserSettings,
    unblockUser,
    unfollowUser,
    touchUserProfile,
    updateUserProfile,
    updateUserSettings,
} from "../../../data-access";
import { publishProfilePhoto } from "../../../media";
import { storage } from "../../../storage";
import { procedure, router } from "../trpc";

export const usersRouter = router({
    me: procedure.input(GetMeQueryInputSchema).query(({ ctx, input }) =>
        getMeQuery({ input, context: { logger: ctx.logger }, dependencies: { getCallingUser: ctx.getCallingUser } }),
    ),

    getUserProfile: procedure.input(GetUserProfileQueryInputSchema).query(({ ctx, input }) =>
        getUserProfileQuery({ input, context: { logger: ctx.logger }, dependencies: { getCallingUser: ctx.getCallingUser, getUserProfileByUsername, getProfileVisibility, getUserFollowStatus } }),
    ),

    updateMyProfile: procedure.input(UpdateMyProfileMutationInputSchema).mutation(({ ctx, input }) =>
        updateMyProfileMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getUserProfileByUsername, updateUserProfile },
        }),
    ),

    createProfilePhotoUpload: procedure.input(CreateProfilePhotoUploadMutationInputSchema).mutation(({ ctx, input }) =>
        createProfilePhotoUploadMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, createUploadUrl: storage.createUploadUrl },
        }),
    ),

    confirmProfilePhotoUpload: procedure.input(ConfirmProfilePhotoUploadMutationInputSchema).mutation(({ ctx, input }) =>
        confirmProfilePhotoUploadMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: {
                getCallingUser: ctx.getCallingUser,
                publishProfilePhoto: (args) => publishProfilePhoto({ ...args, storage }),
                touchUserProfile,
            },
        }),
    ),

    removeProfilePhoto: procedure.input(RemoveProfilePhotoMutationInputSchema).mutation(({ ctx, input }) =>
        removeProfilePhotoMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, deleteMedia: storage.deleteMedia, touchUserProfile },
        }),
    ),

    follow: procedure.input(FollowUserMutationInputSchema).mutation(({ ctx, input }) =>
        followUserMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getUserProfileByUsername, getProfileVisibility, followUser },
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
            dependencies: { getCallingUser: ctx.getCallingUser, getUserFollowRequestViews },
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
            dependencies: { getCallingUser: ctx.getCallingUser, getUserBlockViews },
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
