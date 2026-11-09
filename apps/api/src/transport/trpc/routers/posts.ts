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
    getPosts,
    getProfileVisibility,
    getUserFollowStatus,
    getUserProfileByUsername,
    updatePost,
} from "../../../data-access";
import { createUploadUrl, deleteMedia } from "../../../storage";
import { publishPostPhotosWith } from "../../../storage/postPhotos";
import { procedure, router } from "../trpc";

export const postsRouter = router({
    getPostById: procedure.input(GetPostByIdQueryInputSchema).query(({ ctx, input }) =>
        getPostByIdQuery({ input, context: { logger: ctx.logger }, dependencies: { getCallingUser: ctx.getCallingUser, getPostById } }),
    ),

    getFeed: procedure.input(GetFeedQueryInputSchema).query(({ ctx, input }) =>
        getFeedQuery({ input, context: { logger: ctx.logger }, dependencies: { getCallingUser: ctx.getCallingUser, getPosts } }),
    ),

    getUserPosts: procedure.input(GetUserPostsQueryInputSchema).query(({ ctx, input }) =>
        getUserPostsQuery({ input, context: { logger: ctx.logger }, dependencies: { getCallingUser: ctx.getCallingUser, getUserProfileByUsername, getProfileVisibility, getUserFollowStatus, getPosts } }),
    ),

    createPost: procedure.input(CreatePostMutationInputSchema).mutation(({ ctx, input }) =>
        createPostMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: {
                getCallingUser: ctx.getCallingUser,
                isPostingEnabled: () => ctx.featureFlagStore.isEnabled("usersCanPost"),
                getPostById,
                publishPostPhotos: publishPostPhotosWith(ctx.logger),
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
                createUploadUrl,
            },
        }),
    ),

    updatePost: procedure.input(UpdatePostMutationInputSchema).mutation(({ ctx, input }) =>
        updatePostMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getPostById, publishPostPhotos: publishPostPhotosWith(ctx.logger), deleteMedia, updatePost },
        }),
    ),

    deletePost: procedure.input(DeletePostMutationInputSchema).mutation(({ ctx, input }) =>
        deletePostMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getPostById, deletePost, deleteMedia },
        }),
    ),

    reportPost: procedure.input(ReportPostMutationInputSchema).mutation(({ ctx, input }) =>
        reportPostMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getPostById, createPostReport },
        }),
    ),
});
