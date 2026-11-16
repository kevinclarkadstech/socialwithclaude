import {
    SearchPostsQueryInputSchema,
    searchPostsQuery,
    CreatePostMediaUploadsMutationInputSchema,
    CreatePostMutationInputSchema,
    DeletePostMutationInputSchema,
    GetFeedQueryInputSchema,
    GetPostByIdQueryInputSchema,
    GetUserPostsQueryInputSchema,
    ReportPostMutationInputSchema,
    UpdatePostMutationInputSchema,
    createPostMediaUploadsMutation,
    createPostMutation,
    deletePostMutation,
    getFeedQuery,
    getPostByIdQuery,
    getUserPostsQuery,
    reportPostMutation,
    updatePostMutation,
    SavePostMutationInputSchema,
    UnsavePostMutationInputSchema,
    savePostMutation,
    unsavePostMutation,
} from "@myapp/shared/domains";

import {
    createPost,
    createPostReport,
    deletePost,
    getPostById,
    getPostMediaByPostId,
    getPostViewById,
    getPostViews,
    getProfileVisibility,
    getUserFollowStatus,
    getUserProfileByUsername,
    updatePost,
    createUserSave,
    deleteUserSave,
    searchPostViews,
} from "../../../data-access";
import { publishPostPhotos } from "../../../media";
import { storage } from "../../../storage";
import { procedure, router } from "../trpc";

export const postsRouter = router({
    getPostById: procedure.input(GetPostByIdQueryInputSchema).query(({ ctx, input }) =>
        getPostByIdQuery({ input, context: { logger: ctx.logger }, dependencies: { getCallingUser: ctx.getCallingUser, getPostViewById } }),
    ),

    getFeed: procedure.input(GetFeedQueryInputSchema).query(({ ctx, input }) =>
        getFeedQuery({ input, context: { logger: ctx.logger }, dependencies: { getCallingUser: ctx.getCallingUser, getPostViews } }),
    ),

    getUserPosts: procedure.input(GetUserPostsQueryInputSchema).query(({ ctx, input }) =>
        getUserPostsQuery({ input, context: { logger: ctx.logger }, dependencies: { getCallingUser: ctx.getCallingUser, getUserProfileByUsername, getProfileVisibility, getUserFollowStatus, getPostViews } }),
    ),

    createPost: procedure.input(CreatePostMutationInputSchema).mutation(({ ctx, input }) =>
        createPostMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: {
                getCallingUser: ctx.getCallingUser,
                isPostingEnabled: () => ctx.featureFlagStore.isEnabled("usersCanPost"),
                getPostViewById,
                publishPostPhotos: (args) => publishPostPhotos({ ...args, storage, logger: ctx.logger }),
                createPost,
            },
        }),
    ),

    createPostMediaUploads: procedure.input(CreatePostMediaUploadsMutationInputSchema).mutation(({ ctx, input }) =>
        createPostMediaUploadsMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: {
                getCallingUser: ctx.getCallingUser,
                isPostingEnabled: () => ctx.featureFlagStore.isEnabled("usersCanPost"),
                getPostById,
                createUploadUrl: storage.createUploadUrl,
            },
        }),
    ),

    updatePost: procedure.input(UpdatePostMutationInputSchema).mutation(({ ctx, input }) =>
        updatePostMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: {
                getCallingUser: ctx.getCallingUser,
                getPostById,
                getPostMediaByPostId,
                publishPostPhotos: (args) => publishPostPhotos({ ...args, storage, logger: ctx.logger }),
                deleteMedia: storage.deleteMedia,
                updatePost,
            },
        }),
    ),

    deletePost: procedure.input(DeletePostMutationInputSchema).mutation(({ ctx, input }) =>
        deletePostMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getPostById, getPostMediaByPostId, deletePost, deleteMedia: storage.deleteMedia },
        }),
    ),

    reportPost: procedure.input(ReportPostMutationInputSchema).mutation(({ ctx, input }) =>
        reportPostMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getPostViewById, createPostReport },
        }),
    ),

    save: procedure.input(SavePostMutationInputSchema).mutation(({ ctx, input }) =>
        savePostMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: {
                getCallingUser: ctx.getCallingUser,
                getPostViewById,
                savePost: ({ userId, postId }) => createUserSave({ userId, type: "post", id: postId }),
            },
        }),
    ),

    unsave: procedure.input(UnsavePostMutationInputSchema).mutation(({ ctx, input }) =>
        unsavePostMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: {
                getCallingUser: ctx.getCallingUser,
                unsavePost: ({ userId, postId }) => deleteUserSave({ userId, type: "post", id: postId }),
            },
        }),
    ),

    /** Posts and listings (only `type` if given) matching the query; the Feed and Marketplace search. */
    search: procedure.input(SearchPostsQueryInputSchema).query(({ ctx, input }) =>
        searchPostsQuery({ input, context: { logger: ctx.logger }, dependencies: { getCallingUser: ctx.getCallingUser, searchPostViews } }),
    ),
});
