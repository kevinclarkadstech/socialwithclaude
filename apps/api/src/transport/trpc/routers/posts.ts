import {
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
});
