import {
    SearchUsersQueryInputSchema,
    searchUsersQuery,
    AcceptFollowRequestMutationInputSchema,
    ConfirmProfilePhotoUploadMutationInputSchema,
    CreateProfilePhotoUploadMutationInputSchema,
    RemoveProfilePhotoMutationInputSchema,
    confirmProfilePhotoUploadMutation,
    createProfilePhotoUploadMutation,
    removeProfilePhotoMutation,
    BlockUserMutationInputSchema,
    DenyFollowRequestMutationInputSchema,
    FollowUserMutationInputSchema,
    GetMeQueryInputSchema,
    GetMyBlockedUsersQueryInputSchema,
    GetMyFollowRequestsQueryInputSchema,
    GetMySavesQueryInputSchema,
    GetMySettingsQueryInputSchema,
    GetUserProfileQueryInputSchema,
    SuggestMentionsQueryInputSchema,
    GetSuggestedPeopleQueryInputSchema,
    getSuggestedPeopleQuery,
    ReportProfileMutationInputSchema,
    reportProfileMutation,
    UnblockUserMutationInputSchema,
    UnfollowUserMutationInputSchema,
    UpdateMyProfileMutationInputSchema,
    UpdateMySettingsMutationInputSchema,
    acceptFollowRequestMutation,
    blockUserMutation,
    denyFollowRequestMutation,
    followUserMutation,
    getMeQuery,
    getMyBlockedUsersQuery,
    getMyFollowRequestsQuery,
    getMySavesQuery,
    getMySettingsQuery,
    getUserProfileQuery,
    suggestMentionsQuery,
    unblockUserMutation,
    unfollowUserMutation,
    updateMyProfileMutation,
    updateMySettingsMutation,
} from "@myapp/shared/domains";

import {
    acceptUserFollowRequest,
    blockUser,
    createProfileReport,
    getUserProfileByUserId,
    denyUserFollowRequest,
    followUser,
    getMentionSuggestions,
    getSuggestedPeople,
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
    searchUserProfiles,
    createNotifications,
} from "../../../data-access";
import { publishProfilePhoto } from "../../../domains/media";
import { storage } from "../../../infra/storage";
import { procedure, router } from "../trpc";

export const usersRouter = router({
    // Even with their account scheduled for deletion (deletionScheduledAt), so the app can offer to restore it.
    me: procedure.input(GetMeQueryInputSchema).query(({ ctx, input }) =>
        getMeQuery({ input, context: { logger: ctx.logger }, dependencies: { getCallingUser: ctx.getAccountHolder } }),
    ),

    getUserProfile: procedure.input(GetUserProfileQueryInputSchema).query(({ ctx, input }) =>
        getUserProfileQuery({ input, context: { logger: ctx.logger }, dependencies: { getCallingUser: ctx.getCallingUser, getUserProfileByUsername, getProfileVisibility, getUserFollowStatus } }),
    ),

    /** Who the caller can tag after typing "@" (see suggestMentionsQuery). */
    suggestMentions: procedure.input(SuggestMentionsQueryInputSchema).query(({ ctx, input }) =>
        suggestMentionsQuery({ input, context: { logger: ctx.logger }, dependencies: { getCallingUser: ctx.getCallingUser, getMentionSuggestions } }),
    ),

    /** People to follow, beside the feed (see getSuggestedPeopleQuery). */
    getSuggestedPeople: procedure.input(GetSuggestedPeopleQueryInputSchema).query(({ ctx, input }) =>
        getSuggestedPeopleQuery({ input, context: { logger: ctx.logger }, dependencies: { getCallingUser: ctx.getCallingUser, getSuggestedPeople } }),
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
            dependencies: { getCallingUser: ctx.getCallingUser, getUserProfileByUsername, getProfileVisibility, followUser, sendNotifications: createNotifications },
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
            dependencies: { getCallingUser: ctx.getCallingUser, getUserProfileByUsername, acceptUserFollowRequest, sendNotifications: createNotifications },
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

    reportProfile: procedure.input(ReportProfileMutationInputSchema).mutation(({ ctx, input }) =>
        reportProfileMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getUserProfileByUserId, createProfileReport },
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

    getMySaves: procedure.input(GetMySavesQueryInputSchema).query(({ ctx, input }) =>
        getMySavesQuery({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getUserSaves },
        }),
    ),

    /** People whose username or name starts with the query. */
    search: procedure.input(SearchUsersQueryInputSchema).query(({ ctx, input }) =>
        searchUsersQuery({ input, context: { logger: ctx.logger }, dependencies: { getCallingUser: ctx.getCallingUser, searchUserProfiles } }),
    ),
});
